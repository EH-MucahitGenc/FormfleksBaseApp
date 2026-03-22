/**
 * Formfleks V4 — Centralized DTO / Interface Definitions
 * 
 * All Data Transfer Object types live here, extracted from service files
 * to enable reuse across features without circular imports.
 */

// ─── Auth ────────────────────────────────────────────
export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthUser {
  userId: string;
  displayName: string;
  email: string;
  roles: string[];
  token: string;
  refreshToken: string;
}

// ─── Forms ───────────────────────────────────────────
export type RequestStatus = 1 | 2 | 3 | 4; // 1: Draft, 2: Pending, 3: Approved, 4: Rejected

export interface MyFormRequestListItemDto {
  requestId: string;
  requestNo: string;
  formTypeCode: string;
  formTypeName: string;
  status: RequestStatus;
  currentStepNo: number | null;
  createdAt: string;
}

export interface PendingApprovalListItemDto {
  requestId: string;
  requestNo: string;
  formTypeCode: string;
  formTypeName: string;
  approvalId: string;
  approvalConcurrencyToken: string;
  stepNo: number;
  createdAt: string;
}

export interface ApprovalActionRequestDto {
  requestId: string;
  approvalId: string;
  actorUserId: string;
  approvalConcurrencyToken: string;
  actionType: 1 | 2 | 3; // 1: Approve, 2: Reject, 3: Return
  comment?: string;
}

// ─── Admin ───────────────────────────────────────────
export interface AdminUserDto {
  id: string;
  name: string;
  email: string;
  roles: string[];
  isActive: boolean;
}

export interface UpdateUserRequest {
  displayName: string;
  roleIds: string[];
}

export interface AdminRoleDto {
  id: string;
  name: string;
  description: string;
  usersCount: number;
}

export interface AdminDepartmentDto {
  id: string;
  code: string;
  name: string;
  memberCount: number;
}

// ─── Dashboard ───────────────────────────────────────
export interface DashboardOverviewStats {
  totalFormsSubmitted: number;
  pendingApprovalsCount: number;
  approvedFormsCount: number;
  rejectedFormsCount: number;
}

export interface ChartDataItem {
  label: string;
  value: number;
}

export interface ActivityLogItem {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  createdAt: string;
}

export interface UrgentApprovalItem {
  requestId: string;
  requestNo: string;
  formTypeName: string;
  createdAt: string;
}

// ─── Settings ────────────────────────────────────────
export interface AppSettingsDto {
  companyName: string;
  logoUrl: string;
  maintenanceMode: boolean;
  maxFileUploadSize: number;
}

export interface EmailSettingsDto {
  smtpServer: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  senderEmail: string;
  senderName: string;
  enableSsl: boolean;
}

// ─── Visitors ────────────────────────────────────────
export interface VisitorDto {
  id: string;
  visitorName: string;
  companyName: string;
  visitDate: string;
  visitReason: string;
  hostEmployeeName: string;
  checkInTime: string | null;
  checkOutTime: string | null;
}

// ─── System Admin ────────────────────────────────────
export interface AuditLogDto {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  userName: string;
  timestamp: string;
  details: string;
}

export interface FormTemplateDto {
  id: string;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  fieldsJson: string;
}

export interface FormTemplateUpsertDto {
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  fieldsJson: string;
}

export interface WorkflowDefinitionDto {
  id: string;
  formTemplateId: string;
  formTemplateName: string;
  steps: WorkflowStepDto[];
}

export interface WorkflowStepDto {
  stepNo: number;
  approverType: 'role' | 'user' | 'dynamic';
  approverValue: string;
  approverLabel: string;
}
