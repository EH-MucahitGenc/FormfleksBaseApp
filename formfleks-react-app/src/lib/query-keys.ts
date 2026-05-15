/**
 * Formfleks V4 — Centralized Query Key Factory
 * 
 * All TanStack Query keys are defined here to enable:
 * - Type-safe cache invalidation
 * - Consistent key naming across features
 * - Easy grep/search for all query dependencies
 */

export const queryKeys = {
  // --- Admin Module ---
  admin: {
    users: ['admin', 'users'] as const,
    roles: ['admin', 'roles'] as const,

    auditLogs: ['admin', 'audit-logs'] as const,
    formTemplates: ['admin', 'form-templates'] as const,
    workflows: ['admin', 'workflows'] as const,
  },

  // --- Forms Module ---
  forms: {
    myRequests: ['forms', 'my-requests'] as const,
    pendingApprovals: ['forms', 'pending-approvals'] as const,
    detail: (id: string) => ['forms', 'detail', id] as const,
    template: (code: string) => ['forms', 'template', code] as const,
  },

  // --- Dashboard Module ---
  dashboard: {
    stats: ['dashboard', 'stats'] as const,
    formTypeChart: ['dashboard', 'form-type-chart'] as const,
    statusChart: ['dashboard', 'status-chart'] as const,
    trendChart: ['dashboard', 'trend-chart'] as const,
    recentLogs: ['dashboard', 'recent-logs'] as const,
    urgentApprovals: ['dashboard', 'urgent-approvals'] as const,
  },

  // --- Settings Module ---
  settings: {
    app: ['settings', 'app'] as const,
    email: ['settings', 'email'] as const,
    profile: ['settings', 'profile'] as const,
  },
} as const;
