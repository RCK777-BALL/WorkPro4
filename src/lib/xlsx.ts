import ExcelJS from 'exceljs';

const MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

type RowRecord = Record<string, unknown>;

type TableRow = Array<string | number | boolean | Date | null | undefined>;

type ExportOptions = {
  sheetName?: string;
};

const defaultSheetName = 'Sheet1';

function toExcelValue(value: unknown): ExcelJS.CellValue {
  if (value === null || value === undefined) {
    return '';
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') {
    return value;
  }

  return String(value);
}

function unwrapCellValue(value: ExcelJS.CellValue): unknown {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'object') {
    if ('result' in value && value.result !== undefined) {
      return unwrapCellValue(value.result as ExcelJS.CellValue);
    }

    if ('text' in value && typeof value.text === 'string') {
      return value.text;
    }

    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join('');
    }

    return null;
  }

  return value;
}

async function downloadWorkbook(workbook: ExcelJS.Workbook, filename: string) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: MIME_TYPE });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function collectColumns(rows: RowRecord[]): string[] {
  const keys = new Set<string>();
  rows.forEach((row) => {
    Object.keys(row).forEach((key) => keys.add(key));
  });
  return Array.from(keys);
}

function normaliseHeader(value: unknown, index: number): string {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return `Column${index + 1}`;
}

export async function exportArrayToXlsx(
  filename: string,
  rows: RowRecord[],
  options: ExportOptions = {},
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(options.sheetName ?? defaultSheetName);

  if (rows.length === 0) {
    worksheet.addRow([]);
    await downloadWorkbook(workbook, filename);
    return;
  }

  const columns = collectColumns(rows);
  worksheet.columns = columns.map((column) => ({ header: column, key: column }));

  rows.forEach((row) => {
    const data: Record<string, ExcelJS.CellValue> = {};
    columns.forEach((column) => {
      data[column] = toExcelValue(row[column]);
    });
    worksheet.addRow(data);
  });

  await downloadWorkbook(workbook, filename);
}

export async function exportTableToXlsx(
  filename: string,
  tableRows: TableRow[],
  options: ExportOptions = {},
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(options.sheetName ?? defaultSheetName);

  tableRows.forEach((row) => {
    worksheet.addRow(row.map((cell) => toExcelValue(cell)));
  });

  await downloadWorkbook(workbook, filename);
}

export async function parseXlsxRows(
  buffer: ArrayBuffer,
  options: { sheetIndex?: number; headerRow?: number } = {},
): Promise<RowRecord[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheetIndex = options.sheetIndex ?? 0;
  const headerRowIndex = options.headerRow ?? 1;
  const worksheet = workbook.worksheets[sheetIndex];

  if (!worksheet) {
    return [];
  }

  const headerRow = worksheet.getRow(headerRowIndex);
  const columnCount = Math.max(
    worksheet.columnCount,
    headerRow.cellCount,
    Array.isArray(headerRow.values) ? headerRow.values.length - 1 : 0,
  );

  const headers: string[] = [];
  for (let column = 1; column <= columnCount; column += 1) {
    headers.push(normaliseHeader(headerRow.getCell(column).value, column - 1));
  }

  const result: RowRecord[] = [];
  for (let rowIndex = headerRowIndex + 1; rowIndex <= worksheet.rowCount; rowIndex += 1) {
    const row = worksheet.getRow(rowIndex);
    const record: RowRecord = {};
    let hasValue = false;

    headers.forEach((header, columnIndex) => {
      if (!header) {
        return;
      }

      const cellValue = unwrapCellValue(row.getCell(columnIndex + 1).value);
      const normalised = cellValue === '' ? null : cellValue;

      if (normalised !== null && normalised !== undefined && normalised !== '') {
        hasValue = true;
      }

      record[header] = normalised;
    });

    if (hasValue) {
      result.push(record);
    }
  }

  return result;
}

export function createCsvFromRecords(rows: RowRecord[]): string {
  if (rows.length === 0) {
    return '';
  }

  const columns = collectColumns(rows);

  const escape = (value: unknown): string => {
    if (value === null || value === undefined) {
      return '';
    }

    const stringValue = String(value);
    if (/[",\n]/.test(stringValue)) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  };

  const header = columns.join(',');
  const body = rows
    .map((row) => columns.map((column) => escape(row[column])).join(','))
    .join('\n');

  return `${header}\n${body}`;
}
