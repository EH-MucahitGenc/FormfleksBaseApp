import { apiClient } from '@/lib/axios';

// DTOs
export interface DepartmentDistributionDto {
  departmentName: string;
  count: number;
}

export interface PersonnelStatsDto {
  totalActivePersonnel: number;
  totalDepartments: number;
  totalPositions: number;
  lastSyncDate: string | null;
  departmentDistribution: DepartmentDistributionDto[];
}

export interface SyncLogDto {
  id: string;
  startTime: string;
  endTime: string | null;
  insertedCount: number;
  updatedCount: number;
  deactivatedCount: number;
  errorMessage: string | null;
  isSuccess: boolean;
  triggeredByUser: string;
}

export interface QdmsPersonelDto {
  id: string;
  sirket: string;
  isyeri_Tanimi: string | null;
  sicil_No: string;
  adi: string | null;
  soyadi: string | null;
  email: string | null;
  pozisyon_Kodu: string | null;
  pozisyon_Aciklamasi: string | null;
  ust_Pozisyon_Kodu: string | null;
  departman_Kodu: string | null;
  departman_Adi: string | null;
  isActive: boolean;
  lastSyncDate: string | null;
  linkedUserFullName: string | null;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}

// Service
export const integrationsService = {
  triggerSyncPersonnel: async (): Promise<{ message: string }> => {
    const { data } = await apiClient.post<{ message: string }>('/admin/integrations/sync-personnel');
    return data;
  },

  getPersonnelStats: async (): Promise<PersonnelStatsDto> => {
    const { data } = await apiClient.get<PersonnelStatsDto>('/admin/integrations/personnel-stats');
    return data;
  },

  getSyncLogs: async (page = 1, pageSize = 10): Promise<PagedResult<SyncLogDto>> => {
    const { data } = await apiClient.get<PagedResult<SyncLogDto>>('/admin/integrations/sync-logs', {
      params: { page, pageSize }
    });
    return data;
  },

  getPersonnels: async (page = 1, pageSize = 100, searchTerm?: string, isActive?: boolean): Promise<PagedResult<QdmsPersonelDto>> => {
    const { data } = await apiClient.get<PagedResult<QdmsPersonelDto>>('/admin/integrations/personnel', {
      params: { page, pageSize, searchTerm, isActive }
    });
    return data;
  }
};
