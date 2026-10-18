import Setting from '../models/Setting.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { recordAudit } from '../services/auditService.js';

const ALLOWED_KEYS = [
  'school_name',
  'school_logo',
  'school_address',
  'school_phone',
  'school_email',
  'currency',
  'receipt_prefix',
  'academic_year_label',
];

function readSettings() {
  return Setting.find({ key: { $in: ALLOWED_KEYS } }).then((docs) => {
    const settings = Object.fromEntries(docs.map((d) => [d.key, d.value]));
    for (const key of ALLOWED_KEYS) if (!(key in settings)) settings[key] = '';
    if (!settings.currency) settings.currency = 'RWF';
    return settings;
  });
}

export const getSettings = asyncHandler(async (req, res) => {
  const settings = await readSettings();
  res.json({ success: true, settings });
});

export const getBranding = asyncHandler(async (req, res) => {
  const settings = await readSettings();
  res.json({ success: true, settings });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const changes = {};
  for (const key of ALLOWED_KEYS) {
    if (body[key] !== undefined) {
      const before = await Setting.get(key, '');
      if (String(before) !== String(body[key])) changes[key] = { from: before, to: body[key] };
      await Setting.set(key, body[key]);
    }
  }
  if (!Object.keys(changes).length) throw new ApiError(400, 'No settings were provided to update');

  await recordAudit({
    user: req.user,
    action: 'UPDATE',
    module: 'SETTINGS',
    recordLabel: Object.keys(changes).join(', '),
    oldValue: Object.fromEntries(Object.entries(changes).map(([k, v]) => [k, v.from])),
    newValue: Object.fromEntries(Object.entries(changes).map(([k, v]) => [k, v.to])),
  });

  const settings = await readSettings();
  res.json({ success: true, settings });
});
