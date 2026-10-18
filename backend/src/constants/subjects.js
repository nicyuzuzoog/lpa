export const SUBJECTS = [
  { code: 'KIN', name: 'Kinyarwanda' },
  { code: 'KIS', name: 'Kiswahili' },
  { code: 'ENG', name: 'English' },
  { code: 'FRA', name: 'French' },
  { code: 'MAT', name: 'Mathematics' },
  { code: 'SRS', name: 'Social & Religious Studies' },
  { code: 'SET', name: 'Science & Elementary Technology' },
];

export const SUBJECT_CODES = SUBJECTS.map((s) => s.code);

export const SUBJECT_LABELS = Object.fromEntries(SUBJECTS.map((s) => [s.code, s.name]));

export function subjectLabel(code) {
  return SUBJECT_LABELS[code] || code;
}
