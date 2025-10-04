export interface Part {
  id: string;
  tenantId: string;
  sku: string;
  name: string;
  description?: string | null;
  min: number;
  max: number;
  onHand: number;
  onOrder: number;
  cost: number | null;
  vendorId?: string;
  unitOfMeasure?: string | null;
  createdAt: string;
  updatedAt: string;
  vendor?: {
    id: string;
    name: string;
  };
}

export interface InventoryStats {
  totalSkus: number;
  lowStock: number;
  backordered: number;
  inventoryValue: number;
}

export interface LowStockAlert {
  partId: string;
  sku: string;
  name: string;
  warehouseId: string | null;
  warehouseName: string | null;
  onHand: number;
  minLevel: number;
}

export interface PartsResponse {
  parts: Part[];
  stats: InventoryStats;
  lowStock: LowStockAlert[];
}

export interface Vendor {
  id: string;
  tenantId: string;
  name: string;
  contact?: {
    email?: string;
    phone?: string;
    address?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrder {
  id: string;
  tenantId: string;
  vendorId: string;
  status: 'draft' | 'issued' | 'received' | 'closed';
  lines: PurchaseOrderLine[];
  createdAt: string;
  updatedAt: string;
  vendor: {
    id: string;
    name: string;
  };
}

export interface PurchaseOrderLine {
  partId: string;
  qty: number;
  unitCost: number;
  receivedQty?: number;
  warehouseId?: string | null;
}

export interface CreatePartRequest {
  sku: string;
  name: string;
  min?: number;
  max?: number;
  onHand?: number;
  cost?: number;
  vendorId?: string;
  description?: string;
  unitOfMeasure?: string;
}

export interface UpdatePartRequest {
  sku?: string;
  name?: string;
  min?: number;
  max?: number;
  cost?: number;
  vendorId?: string;
  description?: string;
  unitOfMeasure?: string;
}

export interface AdjustPartRequest {
  delta: number;
  reason: string;
  woId?: string;
}

export interface CreateVendorRequest {
  name: string;
  contact?: {
    email?: string;
    phone?: string;
    address?: string;
  };
}

export interface UpdateVendorRequest {
  name?: string;
  contact?: {
    email?: string;
    phone?: string;
    address?: string;
  };
}

export interface CreatePurchaseOrderRequest {
  vendorId: string;
  lines: PurchaseOrderLine[];
}

export interface UpdatePurchaseOrderRequest {
  vendorId?: string;
  lines?: PurchaseOrderLine[];
  status?: 'draft' | 'issued' | 'received' | 'closed';
}