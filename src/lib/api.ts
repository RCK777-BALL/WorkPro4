import type { DashboardSummaryResponse } from '../../shared/types/dashboard';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface ApiResult<T> {
  data: T | null;
  error: {
    code: number;
    message: string;
    details?: unknown;
  } | null;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const result = await this.handleResponse<T>(response);

      if (result.error) {
        if (result.error.code === 401 || result.error.code === 403) {
          this.clearToken();
          // Don't redirect automatically, let the auth hook handle it
        }
        return result;
      }

      return result;
    } catch (error) {
      // If backend is not available, return mock data for development
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.warn('Backend not available, using mock data');
        const mockData = this.getMockData<T>(endpoint);
        return {
          data: mockData,
          error: null,
        } as ApiResult<T>;
      }

      return {
        data: null,
        error: {
          code: 500,
          message: error instanceof Error ? error.message : 'Network error',
        },
      };
    }
  }

  private getMockData<T>(endpoint: string): T {
    // Mock data for development when backend is not available
    if (endpoint.includes('/summary')) {
      const mockSummary: DashboardSummaryResponse = {
        workOrders: {
          open: 12,
          overdue: 3,
          completedThisMonth: 45,
          completedTrend: 8.5,
        },
        assets: {
          uptime: 94.5,
          total: 234,
          down: 3,
          operational: 231,
        },
        inventory: {
          totalParts: 1250,
          lowStock: 18,
          stockHealth: 87.3,
        },
      };

      return mockSummary as T;
    }
    
    // Return empty data for other endpoints to let components handle fallbacks
    return null as T;
  }

  private async handleResponse<T>(response: Response): Promise<ApiResult<T>> {
    let result: ApiResult<T>;
    
    try {
      result = await response.json();
    } catch {
      result = {
        data: null,
        error: {
          code: response.status,
          message: response.statusText || 'Request failed'
        }
      };
    }

    return result;
  }

  async get<T>(endpoint: string): Promise<T> {
    const result = await this.request<T>(endpoint, { method: 'GET' });
    if (result.error) {
      throw new Error(result.error.message);
    }
    return result.data!;
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const result = await this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
    if (result.error) {
      throw new Error(result.error.message);
    }
    return result.data!;
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    const result = await this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
    if (result.error) {
      throw new Error(result.error.message);
    }
    return result.data!;
  }

  async delete<T>(endpoint: string): Promise<T> {
    const result = await this.request<T>(endpoint, { method: 'DELETE' });
    if (result.error) {
      throw new Error(result.error.message);
    }
    return result.data!;
  }
}

export const api = new ApiClient();