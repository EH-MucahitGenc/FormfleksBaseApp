import { apiClient } from '@/lib/axios';

export interface ParticipantDto {
  userId: string | null;
  name: string;
  email: string;
  department: string;
  title: string;
}

export interface CreateCampaignPayload {
  templateId: string;
  campaignName: string;
  description: string;
  startDate: string;
  endDate: string;
  isAnonymous: boolean;
  participantUserIds: string[];
  resultViewerUserIds?: string[];
  saveAsDraft: boolean;
}

export interface CampaignListDto {
  id: string;
  title: string;
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
  status: string;
  emailDeliveryStatus: string;
  emailRetryCount: number;
  lastEmailAttemptAt?: string;
  emailErrorMessage?: string;
  completedAt?: string;
}

export const campaignService = {
  getCampaigns: async (): Promise<CampaignListDto[]> => {
    const response = await apiClient.get<CampaignListDto[]>('/admin/surveys/campaigns');
    return response.data;
  },

  getCampaignParticipants: async (id: string): Promise<any> => {
    const response = await apiClient.get<any>(`/admin/surveys/campaigns/${id}/participants`);
    return response.data;
  },

  resendEmail: async (assignmentId: string): Promise<void> => {
    await apiClient.post(`/admin/surveys/campaigns/participants/${assignmentId}/resend`);
  },

  searchParticipants: async (query: string): Promise<ParticipantDto[]> => {
    const response = await apiClient.get<ParticipantDto[]>('/admin/surveys/campaigns/participants/search', {
      params: { query }
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
