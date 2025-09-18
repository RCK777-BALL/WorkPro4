export interface DashboardWorkOrders {
  open: number;
  overdue: number;
  completedThisMonth: number;
  completedTrend: number;
}

export interface DashboardAssets {
  uptime: number;
  total: number;
  down: number;
  operational: number;
}

export interface DashboardInventory {
  totalParts: number;
  lowStock: number;
  stockHealth: number;
}

export interface DashboardSummaryResponse {
  workOrders: DashboardWorkOrders;
  assets: DashboardAssets;
  inventory: DashboardInventory;
}
