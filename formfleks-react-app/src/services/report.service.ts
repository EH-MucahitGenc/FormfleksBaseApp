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
  location: string;
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

export interface FormTrackingListItemDto {
  requestId: string;
  requestNo: string;
  formTypeName: string;
  systemUsageType?: string;
  subjectPersonName: string;
  department?: string;
  title?: string;
  statusCode: number;
  status: string;
  ownerUserId: string;
  ownerName: string;
  ownerEmail?: string;
  currentStepNo?: number;
  currentStepName?: string;
  currentAssignees: string[];
  draftCandidates: string[];
  isPooledDraft: boolean;
  createdAt: string;
  lastActivityAt: string;
  waitingSince: string;
  waitingDays: number;
}

export interface FormTrackingListResultDto {
  items: FormTrackingListItemDto[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface FormTrackingEventDto {
  id: string;
  category: 'system' | 'assignment' | 'action' | 'email' | string;
  eventType: string;
  title: string;
  description?: string;
  actorName?: string;
  occurredAt: string;
  deliveryStatus?: string;
  recipients: string[];
  count: number;
  emailLogId?: string;
  detailJson?: string;
}

export interface FormTrackingDetailDto {
  summary: FormTrackingListItemDto;
  events: FormTrackingEventDto[];
}

export interface FormTrackingEmailDetailDto {
  requestId: string;
  email: {
    id: string;
    messageType: string;
    fromAddress?: string;
    toAddresses: string[];
    ccAddresses: string[];
    bccAddresses: string[];
    replyToAddress?: string;
    subject: string;
    bodyHtml: string;
    bodyText?: string;
    headersJson: string;
    attachmentManifestJson: string;
    status: string;
    attemptCount: number;
    lastError?: string;
    smtpMessageId?: string;
    queuedAt: string;
    sentAt?: string;
  };
}

export interface FormTrackingFilters {
  search?: string;
  systemUsageType?: string;
  status?: string;
  ownerSearch?: string;
  startDate?: string;
  endDate?: string;
  minWaitingDays?: string;
  page: number;
  pageSize: number;
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
  },

  getFormTracking: async (filters: FormTrackingFilters): Promise<FormTrackingListResultDto> => {
    const params = new URLSearchParams();
    if (filters.search) params.append('Search', filters.search);
    if (filters.systemUsageType) params.append('SystemUsageType', filters.systemUsageType);
    if (filters.status) params.append('Status', filters.status);
    if (filters.ownerSearch) params.append('OwnerSearch', filters.ownerSearch);
    if (filters.startDate) params.append('StartDate', new Date(filters.startDate).toISOString());
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      params.append('EndDate', end.toISOString());
    }
    if (filters.minWaitingDays) params.append('MinWaitingDays', filters.minWaitingDays);
    params.append('Page', String(filters.page));
    params.append('PageSize', String(filters.pageSize));
    const response = await api.get<FormTrackingListResultDto>(`/dynamic-forms/reports/form-tracking?${params.toString()}`);
    return response.data;
  },

  getFormTrackingDetail: async (requestId: string): Promise<FormTrackingDetailDto> => {
    const response = await api.get<FormTrackingDetailDto>(`/dynamic-forms/reports/form-tracking/${requestId}`);
    return response.data;
  },

  getFormTrackingEmailDetail: async (requestId: string, emailId: string): Promise<FormTrackingEmailDetailDto> => {
    const response = await api.get<FormTrackingEmailDetailDto>(`/dynamic-forms/reports/form-tracking/${requestId}/emails/${emailId}`);
    return response.data;
  }
};
