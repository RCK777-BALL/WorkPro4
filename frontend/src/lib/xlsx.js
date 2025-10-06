import ExcelJS from 'exceljs';

const MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function toExcelValue(value) {
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

function unwrapCellValue(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'object') {
    if (Object.prototype.hasOwnProperty.call(value, 'result') && value.result !== undefined) {
      return unwrapCellValue(value.result);
    }

    if (typeof value.text === 'string') {
      return value.text;
    }

    if (Array.isArray(value.richText)) {
      return value.richText.map((entry) => entry.text).join('');
    }

    return null;
  }

  return value;
}

async function downloadWorkbook(workbook, filename) {
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

  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function collectColumns(rows) {
  const keys = new Set();
  rows.forEach((row) => {
    Object.keys(row).forEach((key) => keys.add(key));
  });
  return Array.from(keys);
}

function normaliseHeader(value, index) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return `Column${index + 1}`;
}

export async function exportArrayToXlsx(filename, rows, options = {}) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(options.sheetName ?? 'Sheet1');

  if (!rows.length) {
    worksheet.addRow([]);
    await downloadWorkbook(workbook, filename);
    return;
  }

  const columns = collectColumns(rows);
  worksheet.columns = columns.map((column) => ({ header: column, key: column }));

  rows.forEach((row) => {
    const data = {};
    columns.forEach((column) => {
      data[column] = toExcelValue(row[column]);
    });
    worksheet.addRow(data);
  });

  await downloadWorkbook(workbook, filename);
}

export async function exportTableToXlsx(filename, tableRows, options = {}) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(options.sheetName ?? 'Sheet1');

  tableRows.forEach((row) => {
    worksheet.addRow(row.map((cell) => toExcelValue(cell)));
  });

  await downloadWorkbook(workbook, filename);
}

export async function parseXlsxRows(buffer, options = {}) {
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

  const headers = [];
  for (let column = 1; column <= columnCount; column += 1) {
    headers.push(normaliseHeader(headerRow.getCell(column).value, column - 1));
  }

  const result = [];
  for (let rowIndex = headerRowIndex + 1; rowIndex <= worksheet.rowCount; rowIndex += 1) {
    const row = worksheet.getRow(rowIndex);
    const record = {};
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
