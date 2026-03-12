import { apiClient } from '@/lib/axios';
export type RequestStatus = 1 | 2 | 3 | 4; // 1: Draft, 2: Pending, 3: Approved, 4: Rejected

export type MyFormRequestListItemDto = {
  requestId: string;
  requestNo: string;
  formTypeCode: string;
  formTypeName: string;
  status: RequestStatus;
  currentStepNo: number | null;
  createdAt: string;
};

export type PendingApprovalListItemDto = {
  requestId: string;
  requestNo: string;
  formTypeCode: string;
  formTypeName: string;
  approvalId: string;
  approvalConcurrencyToken: string;
  stepNo: number;
  createdAt: string;
};

export type ApprovalActionRequestDto = {
  requestId: string;
  approvalId: string;
  actorUserId: string;
  approvalConcurrencyToken: string;
  actionType: 1 | 2 | 3; // 1: Approve, 2: Reject, 3: Return
  comment?: string;
};

// Mocks removed

class FormService {
  async getMyRequests(): Promise<MyFormRequestListItemDto[]> {
    const { data } = await apiClient.get<MyFormRequestListItemDto[]>('/dynamic-forms/requests/my');
    return data;
  }

  async getPendingApprovals(): Promise<PendingApprovalListItemDto[]> {
    const { data } = await apiClient.get<PendingApprovalListItemDto[]>('/dynamic-forms/approvals/pending');
    return data;
  }

  async executeApprovalAction(payload: ApprovalActionRequestDto): Promise<{ success: boolean; message?: string }> {
    await apiClient.post('/dynamic-forms/approvals/action', payload);
    // Determine success structure. If API returns bare object or ApiCallResult wrapper.
    // We assume backend returns direct result or standard shape based on 2xx status.
    return { success: true };
  }

  async saveDraft(payload: any): Promise<{ success: boolean; data?: any }> {
    const { data } = await apiClient.post('/dynamic-forms/requests/draft', payload);
    return { success: true, data };
  }

  async submitForm(payload: any): Promise<{ success: boolean; requestId?: string }> {
    const { data } = await apiClient.post('/dynamic-forms/requests/submit', payload);
    return { success: true, requestId: data.requestId };
  }
}

export const formService = new FormService();
