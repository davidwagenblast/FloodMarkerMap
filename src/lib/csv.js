import { FIELDS } from '../config/fields';

export const CSV_COLUMNS = ['lat', 'lon', ...FIELDS.map((f) => f.key), 'photos'];

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

export function checkCsv(text) {
  const [header = [], ...rows] = parseCsv(text.replace(/^﻿/, '')); // strip Excel's BOM
  const cols = header.map((h) => h.trim().toLowerCase());
  const missing = ['lat', 'lon'].filter((c) => !cols.includes(c));
  if (missing.length) {
    return { count: 0, problems: [`The first row must name the columns, including ${missing.join(' and ')}.`] };
  }

  const problems = [];
  let count = 0;
  rows.forEach((row, i) => {
    if (row.every((v) => v.trim() === '')) return; // skip blank lines
    count++;
    const line = i + 2; // the header is line 1
    const get = (key) => (row[cols.indexOf(key)] ?? '').trim();

    const lat = Number(get('lat'));
    const lon = Number(get('lon'));
    if (!get('lat') || !(lat >= -90 && lat <= 90)) problems.push(`Line ${line}: lat must be a number from -90 to 90.`);
    if (!get('lon') || !(lon >= -180 && lon <= 180)) problems.push(`Line ${line}: lon must be a number from -180 to 180.`);

    for (const f of FIELDS) {
      const v = get(f.key);
      if (!v) continue; // everything but lat/lon is optional
      if (f.type === 'number' && isNaN(Number(v))) problems.push(`Line ${line}: ${f.key} must be a number.`);
      if (f.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(v)) problems.push(`Line ${line}: ${f.key} must be a date like 2026-11-16.`);
      if (f.type === 'time' && !/^\d{2}:\d{2}(:\d{2})?$/.test(v)) problems.push(`Line ${line}: ${f.key} must be a 24-hour time like 14:05 or 14:05:30.`);
      if (f.type === 'select' && !f.options.includes(v)) problems.push(`Line ${line}: ${f.key} must be one of ${f.options.join(', ')}.`);
    }
  });
  if (!count) problems.push('The file has no data rows.');
  return { count, problems };
}

export function toCsv(markers) {
  const cell = (v) => {
    const s = String(v ?? '');
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = markers.map((m) =>
    CSV_COLUMNS.map((c) => (c === 'lat' || c === 'lon' ? m[c].toFixed(6) : m[c]))
  );
  return [CSV_COLUMNS, ...rows].map((r) => r.map(cell).join(',')).join('\n') + '\n';
}
