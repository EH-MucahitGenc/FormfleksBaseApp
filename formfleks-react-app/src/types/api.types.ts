// Formfleks Global Common DTOs and Interfaces

/**
 * Standard .NET API Call Result Wrapper (BFF representation).
 * Many APIs might return raw data, but for standardized paginated or wrapped responses
 * we establish this generic interface.
 */
export interface ApiCallResult<T> {
  success: boolean;
  statusCode: number;
  message?: string;
  error?: string;
  data: T;
}

/**
 * Generic pagination state representation for TanStack Query keys or generic DataGrids
 */
export interface PaginationFilters {
  pageIndex: number;
  pageSize: number;
  sortBy?: string;
  sortDesc?: boolean;
}

/**
 * Generic Paginated Response DTO
 */
export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  pageIndex: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  roles: string[];
}
