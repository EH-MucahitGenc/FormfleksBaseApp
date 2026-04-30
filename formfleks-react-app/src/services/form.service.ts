import { apiClient } from '@/lib/axios';
export type RequestStatus = 1 | 2 | 3 | 4 | 5 | 6 | 7; // 1: Draft, 2: Submitted, 3: InApproval, 4: Approved, 5: Rejected, 6: Cancelled, 7: ReturnedForRevision

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
  requestorName: string;
  createdAt: string;
};

export type HistoryApprovalListItemDto = {
  approvalId: string;
  requestId: string;
  requestNo: string;
  formTypeName: string;
  stepNo: number;
  requestorUserId: string;
  requestorName: string;
  status: number;
  processedAt: string;
};

export type ApprovalActionRequestDto = {
  requestId: string;
  approvalId: string;
  actorUserId: string;
  approvalConcurrencyToken: string;
  actionType: 1 | 2 | 3; // 1: Approve, 2: Reject, 3: Return
  comment?: string;
};

export type FormRequestValueDto = {
  fieldKey: string;
  label: string;
  fieldType?: number;
  optionsJson?: string;
  valueText?: string;
};

export type FormRequestWorkflowStepDto = {
  step: string;
  status: string;
  actor: string;
  date?: string;
  comment?: string;
};

export type FormRequestDetailedDto = {
  requestId: string;
  requestNo: string;
  formTypeCode: string;
  formTypeName: string;
  status: RequestStatus;
  concurrencyToken: number;
  values: FormRequestValueDto[];
  workflow: FormRequestWorkflowStepDto[];
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

  async getApprovalHistory(): Promise<HistoryApprovalListItemDto[]> {
    const { data } = await apiClient.get<HistoryApprovalListItemDto[]>('/dynamic-forms/approvals/history');
    return data;
  }

  async getRequestDetailed(id: string): Promise<FormRequestDetailedDto> {
    const { data } = await apiClient.get<FormRequestDetailedDto>(`/dynamic-forms/requests/${id}`);
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
