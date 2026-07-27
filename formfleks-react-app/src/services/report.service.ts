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
  subjectPersonName?: string;
  formValues?: Record<string, string>;
  gridColumnLabels?: Record<string, string>;
  orderedFieldLabels?: string[];
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
    
    // Note: Department and Location might need to be filtered post-fetch or passed to API if supported.
    // Assuming backend returns all for the user/date and we might filter frontend if needed, 
    // or backend needs to support it. Current API doesn't seem to take department/location params.
    
    const { data } = await api.get<HrSummaryReportDto[]>('/dynamic-forms/reports/hr-summary', { params });
    
    // Client-side filtering for department/location since they are in the DTO
    let result = data;
    if (department) result = result.filter(r => r.department === department);
    if (location) result = result.filter(r => r.location === location);
    
    return result;
  },

  getHrFormDetails: async (requestorUserId: string, formTypeId: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    params.append('RequestorUserId', requestorUserId);
    params.append('FormTypeId', formTypeId);
    if (startDate) params.append('StartDate', startDate);
    if (endDate) params.append('EndDate', endDate);
    const { data } = await api.get<HrFormDetailItemDto[]>('/dynamic-forms/reports/hr-form-details', { params });
    return data;
  },

  getAllHrFormDetails: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('StartDate', startDate);
    if (endDate) params.append('EndDate', endDate);
    const { data } = await api.get<HrFormDetailItemDto[]>('/dynamic-forms/reports/hr-form-details', { params });
    return data;
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
