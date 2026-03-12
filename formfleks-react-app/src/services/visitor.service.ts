import { apiClient } from '@/lib/axios';

export interface VisitorDto {
  id: string;
  firstName: string;
  lastName: string;
  companyName: string;
  purpose: string;
  visitDate: string;
}

export interface CreateVisitorRequestDto {
  firstName: string;
  lastName: string;
  companyName: string;
  purpose: string;
  visitDate: Date;
}

export const visitorService = {
  getVisitors: async (): Promise<VisitorDto[]> => {
    // Visitor API returns ApiResponse wrapper { data, ... } depending on version
    // Assume axios interceptor strips down to response data payload if it matches ApiResponse
    const { data } = await apiClient.get<any>('/visitors');
    return data.data || data; // Handle ApiResponse wrapper 
  },

  createVisitor: async (req: CreateVisitorRequestDto): Promise<void> => {
    await apiClient.post('/visitors', req);
  }
};
