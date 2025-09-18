export interface ApiResult<T> {
  data: T | null;
  error: {
    code: number;
    message: string;
    details?: unknown;
  } | null;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  roles: ('tech' | 'planner' | 'supervisor' | 'admin')[];
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface SearchResult {
  id: string;
  type: 'asset' | 'work_order' | 'part' | 'vendor';
  title: string;
  subtitle?: string;
  url: string;
}