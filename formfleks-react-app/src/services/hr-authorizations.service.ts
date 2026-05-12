import { apiClient } from '@/lib/axios';

export interface HrAuthorization {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  isGlobalManager: boolean;
  locationName: string | null;
  active: boolean;
  createdAt: string;
}

export interface SetHrAuthorizationsPayload {
  userId: string;
  isGlobalManager: boolean;
  locations: string[];
}

export const hrAuthorizationsService = {
  getAuthorizations: async (): Promise<HrAuthorization[]> => {
    const response = await apiClient.get('/admin/hr-authorizations');
    return response.data;
  },

  getDistinctLocations: async (): Promise<string[]> => {
    const response = await apiClient.get('/admin/hr-authorizations/locations');
    return response.data;
  },

  setAuthorizations: async (payload: SetHrAuthorizationsPayload): Promise<boolean> => {
    const response = await apiClient.post('/admin/hr-authorizations', payload);
    return response.data;
  },

  deleteAuthorizations: async (userId: string): Promise<boolean> => {
    const response = await apiClient.delete('/admin/hr-authorizations', { data: { userId } });
    return response.data;
  }
};
