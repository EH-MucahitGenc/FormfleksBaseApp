import { apiClient } from '@/lib/axios';
import type { AdminRoleDto, AdminUserDto } from './admin.service';
import { adminService } from './admin.service';

// --- AUDIT LOGS DTOs ---
export interface AuditLogItemDto {
  id: string;
  entityType: string;
  entityId: string;
  actionType: string;
  actorUserId?: string;
  detailJson?: string;
  createdAt: string;
}

// --- FORM DESIGNER DTOs ---
export interface FormTemplateSummaryDto {
  formTypeId: string;
  code: string;
  name: string;
  active: boolean;
  fieldCount: number;
  workflowStepCount: number;
  createdAt: string;
}

export interface FormTemplateFieldUpsertDto {
  fieldKey: string;
  label: string;
  fieldType: number; // 1: Text, 2: Textarea, 3: Checkbox, 4: Dropdown, 5: Date, 6: Time, 7: DateTime, 10: File
  isRequired: boolean;
  sortOrder: number;
  sectionTitle: string;
  placeholder?: string;
  optionsJson?: string; // Comma separated or JSON array for dropdown
  active: boolean;
}

export interface FormTemplateSectionUpsertDto {
  title: string;
  sortOrder: number;
}

export interface FormTemplateUpsertDto {
  formTypeId?: string;
  code: string;
  name: string;
  active: boolean;
  sections: FormTemplateSectionUpsertDto[];
  fields: FormTemplateFieldUpsertDto[];
}

// --- WORKFLOW DTOs ---
export interface FormTemplateWorkflowStepDto {
  stepNo: number;
  name: string;
  assigneeType: number; // 1: User, 2: Role, 3: Dynamic
  assigneeRoleId?: string;
  assigneeUserId?: string;
  allowReturnForRevision: boolean;
  fallbackAction?: number;
  fallbackUserId?: string;
  isParallel?: boolean;
}

export type FormTemplateWorkflowStepUpsertDto = FormTemplateWorkflowStepDto;

// --- MOCK SERVICE IMPLEMENTATION NOW LIVE ---
export const systemAdminService = {
  // --------- 1. AUDIT LOGS ---------
  getAuditLogs: async (): Promise<AuditLogItemDto[]> => {
    const { data } = await apiClient.get<AuditLogItemDto[]>('/dynamic-forms/admin/audit-logs');
    return data;
  },

  // --------- 2. FORM DESIGNER ---------
  getTemplates: async (): Promise<FormTemplateSummaryDto[]> => {
    const { data } = await apiClient.get<FormTemplateSummaryDto[]>('/dynamic-forms/admin/templates');
    return data;
  },

  setTemplateStatus: async (formTypeId: string, active: boolean): Promise<{ success: boolean; data?: FormTemplateSummaryDto; error?: string }> => {
    const { data } = await apiClient.patch(`/dynamic-forms/admin/templates/${formTypeId}/status`, { active });
    return { success: true, data };
  },

  saveTemplateDetailed: async (dto: FormTemplateUpsertDto): Promise<{ success: boolean; data?: string; error?: string }> => {
    const { data } = await apiClient.post('/dynamic-forms/admin/templates', dto);
    // Usually backend returns success ApiCallResult with ID or details
    return { success: true, data: data?.data?.formTypeId || data?.data || 'SUCCESS' };
  },

  getTemplateDetailed: async (formTypeCode: string): Promise<FormTemplateUpsertDto> => {
    const { data } = await apiClient.get<any>(`/dynamic-forms/${formTypeCode}`);
    // Extract definitions to match frontend interface
    return data?.data || data; 
  },

  // --------- 3. WORKFLOW DESIGNER ---------
  getTemplateWorkflow: async (formTypeId: string): Promise<FormTemplateWorkflowStepDto[]> => {
    const { data } = await apiClient.get<FormTemplateWorkflowStepDto[]>(`/dynamic-forms/admin/templates/${formTypeId}/workflow`);
    return data;
  },

  saveTemplateWorkflow: async (formTypeId: string, steps: FormTemplateWorkflowStepUpsertDto[]): Promise<{ success: boolean; data?: number; error?: string }> => {
    const { data } = await apiClient.post(`/dynamic-forms/admin/templates/${formTypeId}/workflow`, steps);
    return { success: true, data: data?.stepCount || steps.length };
  },

  // Helpers that hook into existing mock service for dropdowns
  getRolesLookup: async (): Promise<AdminRoleDto[]> => {
     return adminService.getRoles();
  },
  getUsersLookup: async (): Promise<AdminUserDto[]> => {
     return adminService.getUsers();
  }
};
