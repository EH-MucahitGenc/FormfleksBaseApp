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

export const reportService = {
  getHrSummaryReport: async (startDate?: string, endDate?: string, requestorUserId?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('StartDate', startDate);
    if (endDate) params.append('EndDate', endDate);
    if (requestorUserId) params.append('RequestorUserId', requestorUserId);

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

  getHrAdvancedAnalytics: async (startDate?: string, endDate?: string, requestorUserId?: string, department?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('StartDate', startDate);
    if (endDate) params.append('EndDate', endDate);
    if (requestorUserId) params.append('RequestorUserId', requestorUserId);
    if (department) params.append('Department', department);

    const response = await api.get<HrAdvancedAnalyticsDto>(`/dynamic-forms/reports/hr-advanced-analytics?${params.toString()}`);
    return response.data;
  }
};
