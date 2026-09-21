import { apiClient } from '@/lib/axios';

export interface ParticipantDto {
  userId: string | null;
  name: string;
  email: string;
  department: string;
  title: string;
}

export interface AudienceFilter {
  selectedUsersOnly?: boolean;
  searchTerm?: string;
  companies?: string[];
  locations?: string[];
  departments?: string[];
  titles?: string[];
  personnelGroups?: string[];
  roles?: string[];
  hasOrganizationData?: boolean;
  includedUserIds?: string[];
  excludedUserIds?: string[];
}

export interface AudienceFacets {
  companies: string[];
  locations: string[];
  departments: string[];
  titles: string[];
  personnelGroups: string[];
  roles: string[];
}

export interface SurveyAudienceUser {
  userId: string;
  displayName: string;
  email: string;
  company: string;
  location: string;
  department: string;
  title: string;
  personnelGroup: string;
  hasOrganizationData: boolean;
  roles: string[];
}

export interface SavedAudienceDto {
  id: string;
  name: string;
  description?: string;
  audienceDefinition: AudienceFilter;
  createdAt: string;
}

export interface CreateCampaignPayload {
  templateId: string;
  campaignName: string;
  description: string;
  startDate: string;
  endDate: string;
  isAnonymous: boolean;
  audienceDefinition: AudienceFilter;
  viewers?: { userId: string; accessLevel: number; }[];
  saveAsDraft: boolean;
  expectedAudienceCount?: number;
}

export interface CampaignListDto {
  id: string;
  title: string;
  description?: string | null;
  isAnonymous: boolean;
  status: string;
  statusValue: number;
  startDate?: string;
  endDate?: string;
  totalParticipants: number;
  totalResponses: number;
}

export interface CampaignParticipantDto {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  company?: string;
  department?: string;
  location?: string;
  jobTitle?: string;
  status: string;
  emailDeliveryStatus: string;
  emailRetryCount: number;
  lastEmailAttemptAt?: string;
  emailErrorMessage?: string;
  completedAt?: string;
  startedAt?: string;
  completionSeconds?: number;
  responseId?: string;
  snapshotSource: string;
}

export interface PaginatedCampaignParticipants {
  items: CampaignParticipantDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ParticipantResponseAnswer {
  questionId: string;
  questionTitle: string;
  questionType: number;
  isRequired: boolean;
  textValue?: string;
  numericValue?: number;
  dateValue?: string;
  jsonValue?: string;
  selectedOptions: string[];
  files: string[];
}

export interface IdentifiedParticipantResponse {
  responseId: string;
  assignmentId: string;
  userId: string;
  participantName: string;
  participantEmail: string;
  company?: string;
  department?: string;
  location?: string;
  jobTitle?: string;
  snapshotSource: string;
  startedAt: string;
  submittedAt: string;
  completionSeconds: number;
  answers: ParticipantResponseAnswer[];
}

export interface CampaignSegmentItem {
  label: string;
  participants?: number;
  responses?: number;
  responseRate?: number;
  isSuppressed: boolean;
}

export interface CampaignSegments {
  dimension: string;
  isAnonymous: boolean;
  minimumGroupSize: number;
  items: CampaignSegmentItem[];
}

export interface CampaignCrosstab {
  questionId: string;
  questionTitle: string;
  dimension: string;
  filteredResponses: number;
  columns: string[];
  rows: Array<{
    label: string;
    respondents?: number;
    isSuppressed: boolean;
    cells: Record<string, { count: number; rowPercentage: number } | null>;
  }>;
  statisticalTest: {
    isAvailable: boolean;
    unavailableReason?: string;
    chiSquare?: number;
    degreesOfFreedom?: number;
    cramersV?: number;
  };
}

export interface PagedTextAnswers {
  items: Array<{
    answerId: string;
    text: string;
    submittedAt: string;
    userId?: string;
    participantName?: string;
    department?: string;
    location?: string;
  }>;
  totalCount: number;
  page: number;
  pageSize: number;
  isAnonymous: boolean;
  isSuppressed: boolean;
  minimumGroupSize: number;
  suppressionReason?: string;
}

export const campaignService = {
  getAccess: async (id: string) => (await apiClient.get<CampaignAccess>(`/admin/surveys/campaigns/${id}/access`)).data,
  getAccessCandidates: async (id: string, search: string) => (await apiClient.get<{ items: SurveyAudienceUser[] }>(`/admin/surveys/campaigns/${id}/access/candidates`, { params: { search } })).data,
  setAccess: async (id: string, userId: string, values: { accessLevel: number; revoke: boolean; reason: string; validUntil?: string }) => {
    await apiClient.put(`/admin/surveys/campaigns/${id}/access/${userId}`, values);
  },
  browseAudience: async (directoryFilter: AudienceFilter, audienceDefinition: AudienceFilter, page = 1, pageSize = 25) => {
    const response = await apiClient.post<{ items: { user: SurveyAudienceUser; isSelected: boolean }[]; totalCount: number }>(
      '/admin/surveys/campaigns/participants/browse', { directoryFilter, audienceDefinition, page, pageSize });
    return response.data;
  },
  getCampaigns: async (): Promise<CampaignListDto[]> => {
    const response = await apiClient.get<CampaignListDto[]>('/admin/surveys/campaigns');
    return response.data;
  },

  getTemplate: async (id: string): Promise<any> => {
    const response = await apiClient.get(`/admin/surveys/templates/${id}`);
    return response.data;
  },

  getSavedAudiences: async (): Promise<SavedAudienceDto[]> => {
    const response = await apiClient.get('/admin/surveys/saved-audiences');
    return response.data;
  },

  createSavedAudience: async (name: string, description: string | undefined, audienceDefinition: AudienceFilter): Promise<{ id: string }> => {
    const response = await apiClient.post('/admin/surveys/saved-audiences', { name, description, audienceDefinition });
    return response.data;
  },

  deleteSavedAudience: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/surveys/saved-audiences/${id}`);
  },

  getCampaignParticipants: async (id: string, params: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    department?: string;
    location?: string;
  } = {}): Promise<PaginatedCampaignParticipants> => {
    const response = await apiClient.get<PaginatedCampaignParticipants>(`/admin/surveys/campaigns/${id}/participants`, { params });
    return response.data;
  },

  getParticipantResponse: async (campaignId: string, assignmentId: string): Promise<IdentifiedParticipantResponse> => {
    const response = await apiClient.get<IdentifiedParticipantResponse>(`/admin/surveys/campaigns/${campaignId}/participant-response`, {
      params: { assignmentId }
    });
    return response.data;
  },

  getCampaignSegments: async (campaignId: string, dimension: string): Promise<CampaignSegments> => {
    const response = await apiClient.get<CampaignSegments>(`/admin/surveys/campaigns/${campaignId}/analytics/segments`, {
      params: { dimension }
    });
    return response.data;
  },

  getCampaignCrosstab: async (campaignId: string, questionId: string, dimension: string): Promise<CampaignCrosstab> => {
    const response = await apiClient.get<CampaignCrosstab>(`/admin/surveys/campaigns/${campaignId}/analytics/crosstab`, {
      params: { questionId, dimension }
    });
    return response.data;
  },

  getQuestionTextAnswers: async (campaignId: string, questionId: string, page = 1, pageSize = 25, search?: string): Promise<PagedTextAnswers> => {
    const response = await apiClient.get<PagedTextAnswers>(`/admin/surveys/campaigns/${campaignId}/analytics/questions/${questionId}/text`, {
      params: { page, pageSize, search }
    });
    return response.data;
  },

  resendEmail: async (assignmentId: string): Promise<void> => {
    await apiClient.post(`/admin/surveys/campaigns/participants/${assignmentId}/resend`);
  },

  getFacets: async (): Promise<AudienceFacets> => {
    const response = await apiClient.get<AudienceFacets>('/admin/surveys/campaigns/participants/facets');
    return response.data;
  },

  searchAudience: async (filter: AudienceFilter, page: number = 1, pageSize: number = 10): Promise<{ items: SurveyAudienceUser[], totalCount: number }> => {
    const response = await apiClient.post<{ items: SurveyAudienceUser[], totalCount: number }>('/admin/surveys/campaigns/participants/search', filter, {
      params: { page, pageSize }
    });
    return response.data;
  },

  updateCampaignStatus: async (campaignId: string, newStatus: number): Promise<void> => {
    await apiClient.put(`/admin/surveys/campaigns/${campaignId}/status`, { campaignId, newStatus });
  },

  createCampaign: async (payload: CreateCampaignPayload): Promise<{ id: string }> => {
    const response = await apiClient.post<{ id: string }>('/admin/surveys/campaigns', payload);
    return response.data;
  },

  getMyViewableCampaigns: async (): Promise<CampaignListDto[]> => {
    const response = await apiClient.get<CampaignListDto[]>('/admin/surveys/campaigns/my-viewable');
    return response.data;
  }
};

export interface CampaignAccess {
  title: string;
  isAnonymous: boolean;
  entries: {
    userId: string; displayName: string; email: string; isActiveUser: boolean;
    accessLevel: number; isImplicit: boolean; isEffective: boolean;
    grantedAt?: string; revokedAt?: string; validUntil?: string;
  }[];
}
