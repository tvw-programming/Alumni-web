/**
 * Excel import and the sample template.
 *
 * The template is generated in the browser rather than served as a static file.
 * A checked-in .xlsx is a binary that drifts from the importer the moment a
 * column changes, and the mismatch surfaces as a confusing import failure. Here
 * both come from COLUMNS, so the file you download always matches the parser
 * that reads it back.
 */
import ExcelJS from 'exceljs';

import type { AlumniDraft } from '~/api/alumni';
import { MANDATORY } from '~/features/admin/profileRules';

interface Column {
  key: keyof AlumniDraft;
  header: string;
  width: number;
  example: string | number;
  help: string;
}

const MANDATORY_SET = new Set<string>(MANDATORY);

export const COLUMNS: Column[] = [
  { key: 'fullName', header: 'Name', width: 26, example: 'Aditi Deshmukh',
    help: 'Required. Full name as it should appear in the directory.' },
  { key: 'yearOfPassing', header: 'Year of passing', width: 18, example: 2019,
    help: 'Required. Four-digit year, e.g. 2019.' },
  { key: 'course', header: 'Course', width: 22, example: 'B.Tech Computer Science',
    help: 'Required. Degree and field, e.g. B.Tech Computer Science.' },
  { key: 'mobile', header: 'Mobile', width: 20, example: '+91 98765 43210',
    help: 'Optional. Indian mobile: 10 digits starting 6, 7, 8 or 9. +91, a leading 0, spaces and hyphens are all accepted and normalised to +91XXXXXXXXXX. Adding it takes profile completion to 70%.' },
  { key: 'email', header: 'Email', width: 30, example: 'aditi.deshmukh@example.com',
    help: 'Optional.' },
  { key: 'city', header: 'City', width: 18, example: 'Pune', help: 'Optional.' },
  { key: 'headline', header: 'Headline', width: 34, example: 'Senior Engineer at Acme',
    help: 'Optional. One line shown under the name.' },
];

/** Header text -> field, lowercased so a hand-edited sheet still matches. */
const BY_HEADER = new Map(COLUMNS.map((c) => [c.header.toLowerCase(), c.key]));

/**
 * Build the sample workbook: one sheet of data with a filled example row, and
 * a second sheet explaining every column.
 *
 * The example row is real and valid — someone who downloads this, deletes
 * nothing and imports it straight back gets one good record rather than an
 * error, which is the fastest way to learn the format.
 */
export async function buildTemplate(): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Alumni Network';
  wb.created = new Date();

  const sheet = wb.addWorksheet('Alumni', {
    views: [{ state: 'frozen', ySplit: 1 }], // header stays put while scrolling
  });
  sheet.columns = COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }));

  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F4B7C' } };
  header.alignment = { vertical: 'middle' };
  header.height = 22;

  // Required columns are tinted, so the rule is visible in the file itself and
  // not only in the documentation nobody opens.
  COLUMNS.forEach((c, i) => {
    if (MANDATORY_SET.has(c.key)) {
      sheet.getCell(1, i + 1).fill = {
        type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3557' },
      };
    }
  });

  sheet.addRow(Object.fromEntries(COLUMNS.map((c) => [c.key, c.example])));

  const notes = wb.addWorksheet('How to fill this in');
  notes.columns = [
    { header: 'Column', key: 'col', width: 20 },
    { header: 'Required', key: 'req', width: 12 },
    { header: 'Notes', key: 'note', width: 70 },
  ];
  notes.getRow(1).font = { bold: true };
  COLUMNS.forEach((c) =>
    notes.addRow({ col: c.header, req: MANDATORY_SET.has(c.key) ? 'Yes' : 'No', note: c.help }),
  );
  notes.addRow({});
  notes.addRow({ col: 'Order', note: 'Columns may be reordered or omitted — they are matched by header text, not position.' });
  notes.addRow({ col: 'Sheet', note: 'Only the first sheet is read. This one is ignored by the importer.' });
  notes.addRow({ col: 'Extra columns', note: 'Add any column you like — Hostel, Batch section, Donor tier. Unrecognised headers are kept against each person as additional information rather than discarded.' });

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export interface ParsedRow {
  /** 1-based row number in the sheet, so an error can name where to look. */
  rowNumber: number;
  draft: Partial<AlumniDraft>;
}

/**
 * Read the first sheet into drafts. Validation is not done here — the importer
 * runs the same `validateAlumni` the form uses, so a row rejected on import is
 * rejected for the same stated reason it would be in the dialog.
 */
export async function parseWorkbook(file: File): Promise<ParsedRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());

  const sheet = wb.worksheets[0];
  if (!sheet) throw new Error('That file has no sheets.');

  // Match columns by header text rather than position, so a spreadsheet with
  // reordered or extra columns still imports.
  const headerRow = sheet.getRow(1);
  const fieldByCol = new Map<number, keyof AlumniDraft>();
  // Columns nobody planned for. An alumni office always has one — hostel, batch
  // section, donor tier — and silently dropping it means the import looks like
  // it worked while losing data. These land in `extra` under their own header.
  const extraByCol = new Map<number, string>();

  headerRow.eachCell((cell, col) => {
    const header = String(cell.value ?? '').trim();
    if (!header) return;
    const field = BY_HEADER.get(header.toLowerCase());
    if (field) fieldByCol.set(col, field);
    else extraByCol.set(col, header);
  });

  if (fieldByCol.size === 0) {
    throw new Error(
      'No recognised column headers in the first row. Download the sample file and use its headers.',
    );
  }

  const rows: ParsedRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const draft: Partial<AlumniDraft> = {};
    fieldByCol.forEach((field, col) => {
      const value = cellText(row.getCell(col).value);
      if (value === '') return;
      draft[field] =
        field === 'yearOfPassing' ? (Number(value) as never) : (value as never);
    });

    const extra: Record<string, string> = {};
    extraByCol.forEach((header, col) => {
      const value = cellText(row.getCell(col).value);
      if (value !== '') extra[header] = value;
    });
    if (Object.keys(extra).length > 0) draft.extra = extra;

    // A row where every mapped cell was blank is spreadsheet padding, not a
    // record someone forgot to fill in. Reporting it as an error would bury
    // the real ones.
    if (Object.keys(draft).length > 0) rows.push({ rowNumber, draft });
  });

  return rows;
}

/**
 * ExcelJS hands back rich values — a hyperlink is an object, a formula cell
 * carries its result separately, and a phone number typed with a leading + may
 * arrive as text or as a number.
 */
function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    if ('text' in value && value.text) return String(value.text).trim();
    if ('result' in value && value.result !== undefined) return String(value.result).trim();
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join('').trim();
    }
    if (value instanceof Date) return String(value.getFullYear());
    return '';
  }
  return String(value).trim();
}
