export type AssetStatus = 'operational' | 'down' | 'maintenance' | 'retired';

export interface AssetMeter {
  name: string;
  value: number;
  unit: string;
}

export interface Asset {
  id: string;
  tenantId: string;
  stationId?: string;
  code: string;
  name: string;
  status: AssetStatus;
  criticality: number;
  meters?: AssetMeter[];
  docsFolder?: string;
  createdAt: string;
  updatedAt: string;
  station?: {
    id: string;
    name: string;
    line: {
      id: string;
      name: string;
      area: {
        id: string;
        name: string;
        site: {
          id: string;
          name: string;
        };
      };
    };
  };
}

export interface Site {
  id: string;
  tenantId: string;
  name: string;
  areas: Area[];
}

export interface Area {
  id: string;
  tenantId: string;
  siteId: string;
  name: string;
  lines: Line[];
}

export interface Line {
  id: string;
  tenantId: string;
  areaId: string;
  name: string;
  stations: Station[];
}

export interface Station {
  id: string;
  tenantId: string;
  lineId: string;
  name: string;
  assets: Asset[];
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
  meters?: AssetMeter[];
  docsFolder?: string;
}

export interface UpdateAssetRequest {
  stationId?: string;
  code?: string;
  name?: string;
  status?: AssetStatus;
  criticality?: number;
  meters?: AssetMeter[];
  docsFolder?: string;
}

export interface AddMeterReadingRequest {
  name: string;
  delta?: number;
  value?: number;
}