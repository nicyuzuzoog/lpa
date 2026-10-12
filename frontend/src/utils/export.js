import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { money } from './format.js';
import { get } from '../services/api.js';

let settingsCache = null;

export async function getSchoolSettings() {
  if (settingsCache) return settingsCache;
  try {
    const d = await get('/settings/branding');
    settingsCache = d.settings || {};
  } catch {
    settingsCache = {};
  }
  return settingsCache;
}

export function schoolBranding(settings) {
  return {
    name: settings?.school_name || settings?.schoolName || 'School Management System',
    logo: settings?.school_logo || settings?.schoolLogo || '',
    address: settings?.school_address || settings?.schoolAddress || '',
    phone: settings?.school_phone || settings?.schoolPhone || '',
    email: settings?.school_email || settings?.schoolEmail || '',
  };
}

export async function logoToDataUrl(logo) {
  if (!logo) return null;
  if (typeof logo === 'string' && logo.startsWith('data:')) return logo;
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const size = 160;
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          const min = Math.min(img.width, img.height);
          ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size);
          resolve(canvas.toDataURL('image/png'));
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = logo;
    } catch {
      resolve(null);
    }
  });
}

export async function drawPdfHeader(doc, { title = '', subtitle = '' } = {}) {
  const settings = await getSchoolSettings();
  const brand = schoolBranding(settings);
  const logoData = await logoToDataUrl(brand.logo);

  let textX = 40;
  if (logoData) {
    try {
      doc.addImage(logoData, 'PNG', 40, 22, 44, 44);
      textX = 96;
    } catch {
      /* ignore broken logo */
    }
  }

  doc.setFontSize(14);
  doc.setTextColor(22, 101, 52);
  doc.setFont('helvetica', 'bold');
  doc.text(brand.name, textX, 36);

  let y = 54;
  if (title) {
    doc.setFontSize(12);
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.text(title, textX, y);
    y += 14;
  }
  if (subtitle) {
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, textX, y);
    y += 12;
  }

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, doc.internal.pageSize.getWidth() - 40, 36, { align: 'right' });

  return y + 6;
}

export async function exportPdf({ title, subtitle, columns, rows, fileName = 'report' }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  const startY = await drawPdfHeader(doc, { title, subtitle });

  const head = [columns.map((c) => c.label)];
  const body = rows.map((row) =>
    columns.map((c) => {
      const raw = row[c.key];
      return c.format ? c.format(raw, row) : raw === undefined || raw === null ? '' : String(raw);
    })
  );

  autoTable(doc, {
    head,
    body,
    startY: Math.max(startY, 78),
    styles: { fontSize: 8, cellPadding: 5, textColor: [30, 30, 30] },
    headStyles: { fillColor: [22, 101, 52], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [243, 244, 246] },
    margin: { left: 40, right: 40 },
  });

  doc.save(`${fileName}.pdf`);
}

export async function exportExcel({ title, columns, rows, fileName = 'report', sheetName = 'Report' }) {
  const settings = await getSchoolSettings();
  const brand = schoolBranding(settings);

  const aoa = [
    [brand.name],
    [title || sheetName],
    [`Generated: ${new Date().toLocaleString('en-GB')}`],
    [],
    columns.map((c) => c.label),
  ];

  for (const row of rows) {
    aoa.push(
      columns.map((c) => {
        const raw = row[c.key];
        return c.format ? c.format(raw, row) : raw === undefined || raw === null ? '' : raw;
      })
    );
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = columns.map((c) => ({ wch: Math.max(12, (c.label || c.key).length + 4) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

export const moneyFormat = (v) => money(v, false);
