import { apiClient } from '@/lib/axios';

export interface UserDelegationDto {
  id: string;
  delegatorUserId: string;
  delegateeUserId: string;
  delegateeName: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  reason?: string;
  createdAt: string;
}

export interface CreateUserDelegationRequest {
  delegateeUserId: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

class DelegationService {
  async getMyDelegations(): Promise<UserDelegationDto[]> {
    const { data } = await apiClient.get<UserDelegationDto[]>('/dynamic-forms/users/me/delegations');
    return data;
  }

  async createDelegation(request: CreateUserDelegationRequest): Promise<string> {
    const { data } = await apiClient.post<string>('/dynamic-forms/users/me/delegations', request);
    return data;
  }

  async terminateDelegation(id: string): Promise<void> {
    await apiClient.delete(`/dynamic-forms/users/me/delegations/${id}`);
  }
}

export const delegationService = new DelegationService();
