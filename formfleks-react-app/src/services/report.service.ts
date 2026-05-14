import { api } from '@/lib/api';

export interface HrSummaryReportDto {
  requestorUserId: string;
  fullName: string;
  department: string;
  location: string;
  formTypeId: string;
  formTypeName: string;
  totalForms: number;
  totalApproved: number;
  totalRejected: number;
  totalDraft: number;
}

export interface HrFormDetailItemDto {
  formRequestId: string;
  formRequestNo: string;
  formTypeName: string;
  requestorName: string;
  createdAt: string;
  status: number;
  completedAt?: string;
}

export interface HrAdvancedAnalyticsDto {
  slaMetrics: SlaMetricDto[];
  statusDistributions: StatusDistributionDto[];
  trendMetrics: TrendMetricDto[];
}

export interface SlaMetricDto {
  formTypeName: string;
  averageCompletionDays: number;
  totalCompletedForms: number;
}

export interface StatusDistributionDto {
  statusName: string;
  count: number;
}

export interface TrendMetricDto {
  dateLabel: string;
  requestCount: number;
}

export interface HrPersonnelItemDto {
  userId: string;
  fullName: string;
  department: string;
  location: string;
}

export const reportService = {
  getHrSummaryReport: async (startDate?: string, endDate?: string, requestorUserId?: string, department?: string, location?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('StartDate', startDate);
    if (endDate) params.append('EndDate', endDate);
    if (requestorUserId) params.append('RequestorUserId', requestorUserId);
    if (department) params.append('Department', department);
    if (location) params.append('Location', location);
    const response = await api.get<HrSummaryReportDto[]>(`/dynamic-forms/reports/hr-summary?${params.toString()}`);
    return response.data;
  },

  getHrFormDetails: async (requestorUserId: string, formTypeId: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    params.append('RequestorUserId', requestorUserId);
    params.append('FormTypeId', formTypeId);
    if (startDate) params.append('StartDate', startDate);
    if (endDate) params.append('EndDate', endDate);

    const response = await api.get<HrFormDetailItemDto[]>(`/dynamic-forms/reports/hr-form-details?${params.toString()}`);
    return response.data;
  },

  getHrAdvancedAnalytics: async (startDate?: string, endDate?: string, requestorUserId?: string, department?: string, location?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('StartDate', startDate);
    if (endDate) params.append('EndDate', endDate);
    if (requestorUserId) params.append('RequestorUserId', requestorUserId);
    if (department) params.append('Department', department);
    if (location) params.append('Location', location);
    const response = await api.get<HrAdvancedAnalyticsDto>(`/dynamic-forms/reports/hr-advanced-analytics?${params.toString()}`);
    return response.data;
  },

  getDepartments: async (location?: string): Promise<string[]> => {
    const params = location ? `?location=${encodeURIComponent(location)}` : '';
    const response = await api.get<string[]>(`/dynamic-forms/reports/hr-departments${params}`);
    return response.data;
  },

  getLocations: async (): Promise<string[]> => {
    const response = await api.get<string[]>('/dynamic-forms/reports/hr-locations');
    return response.data;
  },

  getPersonnel: async (location?: string, department?: string): Promise<HrPersonnelItemDto[]> => {
    const params = new URLSearchParams();
    if (location) params.append('location', location);
    if (department) params.append('department', department);
    const response = await api.get<HrPersonnelItemDto[]>(`/dynamic-forms/reports/hr-personnel?${params.toString()}`);
    return response.data;
  }
};
