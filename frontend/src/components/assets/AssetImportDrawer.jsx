import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Upload, X } from 'lucide-react';
import * as XLSX from 'xlsx';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { importAssets } from '@/lib/assets';

const VALID_STATUSES = new Set(['operational', 'maintenance', 'down', 'retired', 'decommissioned']);
const BATCH_SIZE = 25;

const FIELD_ALIASES = {
  name: ['name', 'assetname', 'title'],
  code: ['code', 'assetcode', 'tag', 'assetid'],
  status: ['status', 'state'],
  location: ['location'],
  category: ['category', 'type'],
  purchaseDate: ['purchasedate', 'purchase_date', 'purchased'],
  cost: ['cost', 'purchasecost', 'purchase_cost'],
  criticality: ['criticality', 'criticallevel'],
  manufacturer: ['manufacturer'],
  modelNumber: ['modelnumber', 'model'],
  serialNumber: ['serialnumber', 'serial'],
  commissionedAt: ['commissionedat', 'commissioned'],
  warrantyProvider: ['warrantyprovider'],
  warrantyContact: ['warrantycontact'],
  warrantyExpiresAt: ['warrantyexpiresat', 'warrantyexpires'],
  warrantyNotes: ['warrantynotes', 'warrantydetails'],
  siteId: ['siteid', 'site'],
  areaId: ['areaid', 'area'],
  lineId: ['lineid', 'line'],
  stationId: ['stationid', 'station'],
};

function normalizeHeader(value) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

const NORMALIZED_ALIASES = Object.fromEntries(
  Object.entries(FIELD_ALIASES).map(([key, aliases]) => [
    key,
    aliases.map((alias) => normalizeHeader(alias)).filter(Boolean),
  ]),
);

function excelSerialNumberToDate(serial) {
  if (typeof serial !== 'number' || Number.isNaN(serial)) {
    return null;
  }

  const epoch = Date.UTC(1899, 11, 30);
  const milliseconds = Math.round(serial * 24 * 60 * 60 * 1000);
  const date = new Date(epoch + milliseconds - 24 * 60 * 60 * 1000);

  return Number.isNaN(date.getTime()) ? null : date;
}

function coerceOptionalString(value) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return String(value ?? '').trim() || undefined;
}

function coerceRequiredString(value, label, errors) {
  const parsed = coerceOptionalString(value);

  if (!parsed) {
    errors.push(`${label} is required`);
    return undefined;
  }

  return parsed;
}

function coerceOptionalNumber(value, label, errors) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'number') {
    if (Number.isFinite(value)) {
      return value;
    }

    errors.push(`${label} must be a valid number`);
    return undefined;
  }

  const trimmed = String(value).replace(/[^0-9+\-.]/g, '').trim();

  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  if (Number.isFinite(parsed)) {
    return parsed;
  }

  errors.push(`${label} must be a valid number`);
  return undefined;
}

function coerceOptionalInteger(value, label, errors) {
  const parsed = coerceOptionalNumber(value, label, errors);

  if (parsed === undefined) {
    return undefined;
  }

  if (!Number.isInteger(parsed)) {
    errors.push(`${label} must be an integer value`);
    return undefined;
  }

  return parsed;
}

function coerceOptionalDate(value, label, errors) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  if (typeof value === 'number') {
    const serialDate = excelSerialNumberToDate(value);
    if (serialDate) {
      return serialDate.toISOString();
    }
  }

  const trimmed = String(value).trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    errors.push(`${label} must be a valid date`);
    return undefined;
  }

  return parsed.toISOString();
}

function getValue(sourceMap, key) {
  const aliases = NORMALIZED_ALIASES[key] ?? [];
  for (const alias of aliases) {
    if (sourceMap.has(alias)) {
      return sourceMap.get(alias);
    }
  }
  return undefined;
}

function parseRow(rawRow, index) {
  const sourceMap = new Map();
  let hasValues = false;

  Object.entries(rawRow).forEach(([header, value]) => {
    const normalized = normalizeHeader(header);
    if (!normalized) {
      return;
    }

    if (value !== null && value !== undefined && value !== '') {
      hasValues = true;
    }

    if (!sourceMap.has(normalized)) {
      sourceMap.set(normalized, value);
    }
  });

  if (!hasValues) {
    return null;
  }

  const errors = [];
  const asset = {};

  const name = coerceRequiredString(getValue(sourceMap, 'name'), 'Name', errors);
  const code = coerceRequiredString(getValue(sourceMap, 'code'), 'Code', errors);

  if (name) {
    asset.name = name;
  }

  if (code) {
    asset.code = code;
  }

  const status = coerceOptionalString(getValue(sourceMap, 'status'));
  if (status) {
    const normalizedStatus = status.toLowerCase();
    if (VALID_STATUSES.has(normalizedStatus)) {
      asset.status = normalizedStatus;
    } else {
      errors.push('Status must be one of operational, maintenance, down, retired, or decommissioned');
    }
  }

  const location = coerceOptionalString(getValue(sourceMap, 'location'));
  if (location) {
    asset.location = location;
  }

  const category = coerceOptionalString(getValue(sourceMap, 'category'));
  if (category) {
    asset.category = category;
  }

  const manufacturer = coerceOptionalString(getValue(sourceMap, 'manufacturer'));
  if (manufacturer) {
    asset.manufacturer = manufacturer;
  }

  const modelNumber = coerceOptionalString(getValue(sourceMap, 'modelNumber'));
  if (modelNumber) {
    asset.modelNumber = modelNumber;
  }

  const serialNumber = coerceOptionalString(getValue(sourceMap, 'serialNumber'));
  if (serialNumber) {
    asset.serialNumber = serialNumber;
  }

  const warrantyProvider = coerceOptionalString(getValue(sourceMap, 'warrantyProvider'));
  if (warrantyProvider) {
    asset.warrantyProvider = warrantyProvider;
  }

  const warrantyContact = coerceOptionalString(getValue(sourceMap, 'warrantyContact'));
  if (warrantyContact) {
    asset.warrantyContact = warrantyContact;
  }

  const warrantyNotes = coerceOptionalString(getValue(sourceMap, 'warrantyNotes'));
  if (warrantyNotes) {
    asset.warrantyNotes = warrantyNotes;
  }

  const siteId = coerceOptionalString(getValue(sourceMap, 'siteId'));
  if (siteId) {
    asset.siteId = siteId;
  }

  const areaId = coerceOptionalString(getValue(sourceMap, 'areaId'));
  if (areaId) {
    asset.areaId = areaId;
  }

  const lineId = coerceOptionalString(getValue(sourceMap, 'lineId'));
  if (lineId) {
    asset.lineId = lineId;
  }

  const stationId = coerceOptionalString(getValue(sourceMap, 'stationId'));
  if (stationId) {
    asset.stationId = stationId;
  }

  const cost = coerceOptionalNumber(getValue(sourceMap, 'cost'), 'Cost', errors);
  if (cost !== undefined) {
    asset.cost = cost;
  }

  const criticality = coerceOptionalInteger(getValue(sourceMap, 'criticality'), 'Criticality', errors);
  if (criticality !== undefined) {
    if (criticality < 1 || criticality > 5) {
      errors.push('Criticality must be between 1 and 5');
    } else {
      asset.criticality = criticality;
    }
  }

  const purchaseDate = coerceOptionalDate(getValue(sourceMap, 'purchaseDate'), 'Purchase Date', errors);
  if (purchaseDate) {
    asset.purchaseDate = purchaseDate;
  }

  const commissionedAt = coerceOptionalDate(getValue(sourceMap, 'commissionedAt'), 'Commissioned At', errors);
  if (commissionedAt) {
    asset.commissionedAt = commissionedAt;
  }

  const warrantyExpiresAt = coerceOptionalDate(
    getValue(sourceMap, 'warrantyExpiresAt'),
    'Warranty Expires At',
    errors,
  );
  if (warrantyExpiresAt) {
    asset.warrantyExpiresAt = warrantyExpiresAt;
  }

  const rowNumber = index + 2;

  return {
    rowNumber,
    asset,
    errors,
  };
}

export function AssetImportDrawer({ open, onClose, onImported }) {
  const { toast } = useToast();
  const [file, setFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setParsedRows([]);
      setParseError('');
      setIsParsing(false);
      setIsImporting(false);
    }
  }, [open]);

  const validRows = useMemo(
    () => parsedRows.filter((row) => row && row.errors.length === 0),
    [parsedRows],
  );

  const invalidRows = useMemo(
    () => parsedRows.filter((row) => row && row.errors.length > 0),
    [parsedRows],
  );

  const totalRows = parsedRows.length;

  const parseFile = useCallback(async (nextFile) => {
    setIsParsing(true);
    setParseError('');

    try {
      const buffer = await nextFile.arrayBuffer();
      const workbook = XLSX.read(buffer, {
        type: 'array',
        cellDates: true,
        dense: true,
      });

      if (!workbook.SheetNames.length) {
        throw new Error('The selected file does not contain any sheets.');
      }

      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet, {
        defval: null,
        blankrows: false,
        raw: true,
        cellDates: true,
      });

      const nextParsedRows = [];

      rows.forEach((row, index) => {
        const parsed = parseRow(row, index);
        if (parsed) {
          nextParsedRows.push(parsed);
        }
      });

      if (!nextParsedRows.length) {
        throw new Error('No rows with data were found in the selected file.');
      }

      setParsedRows(nextParsedRows);
    } catch (error) {
      console.error('Failed to parse asset import file', error);
      setParsedRows([]);
      setParseError(error?.message || 'Unable to read the selected file.');
    } finally {
      setIsParsing(false);
    }
  }, []);

  const handleFileChange = useCallback(
    (event) => {
      const nextFile = event.target.files?.[0];
      event.target.value = '';

      if (!nextFile) {
        return;
      }

      setFile(nextFile);
      void parseFile(nextFile);
    },
    [parseFile],
  );

  const handleImport = useCallback(async () => {
    if (!validRows.length || isImporting) {
      return;
    }

    setIsImporting(true);

    const totalBatches = Math.ceil(validRows.length / BATCH_SIZE);
    const toastRef = toast({
      title: 'Importing assets…',
      description: `Uploading batch 1 of ${totalBatches}`,
    });

    try {
      const importedAssets = [];

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex += 1) {
        const start = batchIndex * BATCH_SIZE;
        const end = start + BATCH_SIZE;
        const batch = validRows.slice(start, end).map((row) => row.asset);

        toastRef?.update?.({
          title: 'Importing assets…',
          description: `Uploading batch ${batchIndex + 1} of ${totalBatches}`,
        });

        const result = await importAssets(batch);
        const imported = Array.isArray(result.assets) && result.assets.length > 0 ? result.assets : [];

        if (imported.length === 0) {
          const fallbackAssets = batch.map((asset, index) => ({
            ...asset,
            id: asset.id ?? `${asset.code ?? asset.name}-${Date.now()}-${batchIndex}-${index}`,
          }));
          importedAssets.push(...fallbackAssets);
          onImported?.(fallbackAssets);
          continue;
        }

        importedAssets.push(...imported);
        onImported?.(imported);
      }

      toastRef?.update?.({
        title: 'Import complete',
        description: `${importedAssets.length} assets imported successfully`,
      });

      setTimeout(() => toastRef?.dismiss?.(), 3500);

      onClose?.();
    } catch (error) {
      console.error('Failed to import assets', error);
      const description = error?.response?.data?.error?.message || error?.message || 'Unable to import assets.';
      if (toastRef?.update) {
        toastRef.update({
          title: 'Import failed',
          description,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Import failed',
          description,
          variant: 'destructive',
        });
      }
    } finally {
      setIsImporting(false);
    }
  }, [isImporting, onClose, onImported, toast, validRows]);

  const previewRows = useMemo(() => parsedRows.slice(0, 10), [parsedRows]);

  if (!open) {
    return null;
  }

  const canImport = !isParsing && validRows.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" onClick={() => (!isImporting ? onClose?.() : null)} />
      <aside className="relative ml-auto flex h-full w-full max-w-3xl flex-col bg-white shadow-xl">
        <header className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Import assets</h2>
            <p className="text-sm text-muted-foreground">
              Upload a CSV or Excel file to import new assets. The first sheet will be processed.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close import drawer"
            className="rounded-md p-2 text-muted-foreground hover:bg-muted"
            onClick={() => (!isImporting ? onClose?.() : null)}
            disabled={isImporting}
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground" htmlFor="asset-import-input">
                Choose a file
              </label>
              <input
                id="asset-import-input"
                type="file"
                accept=".csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleFileChange}
                disabled={isParsing || isImporting}
                className="w-full cursor-pointer rounded-md border border-dashed border-muted-foreground bg-transparent px-4 py-6 text-sm text-muted-foreground hover:border-foreground"
              />
              {file && (
                <p className="text-sm text-muted-foreground">
                  Selected file: <span className="font-medium text-foreground">{file.name}</span>
                </p>
              )}
            </div>

            {parseError && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {parseError}
              </div>
            )}

            {isParsing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Parsing file…</span>
              </div>
            )}

            {!isParsing && !!totalRows && (
              <div className="grid gap-4 rounded-md border bg-muted/30 p-4 text-sm">
                <div className="flex flex-wrap gap-4">
                  <span className="font-medium text-foreground">Rows detected: {totalRows}</span>
                  <span className="text-muted-foreground">Valid: {validRows.length}</span>
                  <span className="text-muted-foreground">Needs review: {invalidRows.length}</span>
                  <span className="text-muted-foreground">Batch size: {BATCH_SIZE}</span>
                </div>
                <p className="text-muted-foreground">
                  Required columns: <strong>Name</strong> and <strong>Code</strong>. Optional columns include Status, Location,
                  Category, Purchase Date, Cost, Criticality, Manufacturer, Model Number, Serial Number, and warranty details.
                </p>
              </div>
            )}

            {!isParsing && previewRows.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Preview</h3>
                <div className="overflow-hidden rounded-md border">
                  <table className="w-full min-w-[640px] table-fixed border-collapse text-left text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 font-medium text-muted-foreground">Row</th>
                        <th className="px-3 py-2 font-medium text-muted-foreground">Name</th>
                        <th className="px-3 py-2 font-medium text-muted-foreground">Code</th>
                        <th className="px-3 py-2 font-medium text-muted-foreground">Status</th>
                        <th className="px-3 py-2 font-medium text-muted-foreground">Location</th>
                        <th className="px-3 py-2 font-medium text-muted-foreground">Category</th>
                        <th className="px-3 py-2 font-medium text-muted-foreground">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row) => (
                        <tr key={row.rowNumber} className={row.errors.length ? 'bg-destructive/10' : ''}>
                          <td className="px-3 py-2 text-muted-foreground">{row.rowNumber}</td>
                          <td className="px-3 py-2 text-foreground">{row.asset.name || '—'}</td>
                          <td className="px-3 py-2 font-mono text-xs text-foreground">{row.asset.code || '—'}</td>
                          <td className="px-3 py-2 text-muted-foreground">{row.asset.status || '—'}</td>
                          <td className="px-3 py-2 text-muted-foreground">{row.asset.location || '—'}</td>
                          <td className="px-3 py-2 text-muted-foreground">{row.asset.category || '—'}</td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {row.errors.length ? row.errors.join('; ') : 'Ready to import'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {invalidRows.length > 0 && (
                  <div className="space-y-1 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                    <p className="font-medium">{invalidRows.length} row(s) require attention before they can be imported.</p>
                    <p>Please update the source file and re-upload it to include the corrected rows.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Upload className="h-4 w-4" aria-hidden="true" />
            <span>
              {validRows.length} row{validRows.length === 1 ? '' : 's'} ready to import
              {invalidRows.length > 0 ? `, ${invalidRows.length} need review` : ''}.
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => (!isImporting ? onClose?.() : null)} disabled={isImporting}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={!canImport}>
              {isImporting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Importing…
                </span>
              ) : (
                <>Import {validRows.length ? `(${validRows.length})` : ''}</>
              )}
            </Button>
          </div>
        </footer>
      </aside>
    </div>
  );
}
