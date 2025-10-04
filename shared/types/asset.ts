export type AssetStatus = 'operational' | 'down' | 'maintenance' | 'retired' | 'decommissioned';

export interface AssetMeter {
  name: string;
  value: number;
  unit: string;
}

export interface AssetLocationRef {
  id: string;
  name: string;
  code?: string | null;
}

export interface AssetSummary {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  status: AssetStatus;
  criticality: number;
  manufacturer?: string | null;
  modelNumber?: string | null;
  serialNumber?: string | null;
  site?: AssetLocationRef | null;
  area?: AssetLocationRef | null;
  line?: AssetLocationRef | null;
  station?: AssetLocationRef | null;
  purchaseDate?: string | null;
  commissionedAt?: string | null;
  warrantyExpiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssetBomLine {
  id: string;
  tenantId: string;
  assetId: string;
  position: number;
  reference: string;
  description: string;
  quantity?: number | null;
  unit?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssetLifecycle extends AssetSummary {
  cost?: number | null;
  warrantyProvider?: string | null;
  warrantyContact?: string | null;
  warrantyNotes?: string | null;
  bomLines: AssetBomLine[];
  meters?: AssetMeter[];
  docsFolder?: string;
}

export interface Site {
  id: string;
  tenantId: string;
  code?: string | null;
  name: string;
  description?: string | null;
  areas: Area[];
  createdAt: string;
  updatedAt: string;
}

export interface Area {
  id: string;
  tenantId: string;
  siteId: string;
  code?: string | null;
  name: string;
  description?: string | null;
  lines: Line[];
  createdAt: string;
  updatedAt: string;
}

export interface Line {
  id: string;
  tenantId: string;
  areaId: string;
  code?: string | null;
  name: string;
  description?: string | null;
  stations: Station[];
  createdAt: string;
  updatedAt: string;
}

export interface Station {
  id: string;
  tenantId: string;
  lineId: string;
  code?: string | null;
  name: string;
  description?: string | null;
  position?: number | null;
  assets: AssetSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface AssetTree {
  sites: Site[];
}

export interface CreateAssetRequest {
  stationId?: string;
  code: string;
  name: string;
  status?: AssetStatus;
  criticality?: number;
  manufacturer?: string | null;
  modelNumber?: string | null;
  serialNumber?: string | null;
  meters?: AssetMeter[];
  docsFolder?: string;
}

export interface UpdateAssetRequest {
  stationId?: string;
  code?: string;
  name?: string;
  status?: AssetStatus;
  criticality?: number;
  manufacturer?: string | null;
  modelNumber?: string | null;
  serialNumber?: string | null;
  meters?: AssetMeter[];
  docsFolder?: string;
}

export interface AddMeterReadingRequest {
  name: string;
  delta?: number;
  value?: number;
}