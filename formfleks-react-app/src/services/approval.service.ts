import { apiClient } from '@/lib/axios';

export interface PendingApprovalListItemDto {
  requestId: string;
  approvalId: string;
  requestNo: string;
  formTypeName: string;
  stepNo: number;
  createdAt: string;
  approvalConcurrencyToken: string;
}

export interface ApprovalActionRequestDto {
  requestId: string;
  approvalId: string;
  actorUserId: string;
  approvalConcurrencyToken: string;
  actionType: number; // 1: Approve, 2: Reject, 3: Return
  comment: string;
}

/**
 * @service approvalService
 * @description Kullanıcının bekleyen onaylarını listeleme ve onaylama/reddetme/revizyon (Approval Actions) gibi iş akışı eylemlerini yöneten API servisi.
 */
export const approvalService = {
  getPendingApprovals: async (): Promise<PendingApprovalListItemDto[]> => {
    const { data } = await apiClient.get<PendingApprovalListItemDto[]>('/dynamic-forms/approvals/pending');
    return data;
  },

  executeAction: async (payload: ApprovalActionRequestDto): Promise<void> => {
    await apiClient.post('/dynamic-forms/approvals/action', payload);
  }
};
