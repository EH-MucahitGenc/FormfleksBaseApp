import { apiClient } from '@/lib/axios';
import type { PendingApprovalListItemDto } from './form.service';

export interface DashboardStatsDto {
  totalFormsSubmitted: number;
  pendingApprovalsCount: number;
  inProgressFormsCount: number;
  approvedFormsCount: number;
  rejectedFormsCount: number;
}

export interface ChartDataPointDto {
  label: string;
  value: number;
}

export interface ActivityLogDto {
  id: string;
  message: string;
  createdAt: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

class DashboardService {
  async getOverviewStats(): Promise<DashboardStatsDto> {
    // In absence of a dedicated /dashboard/stats endpoint, we aggregate from existing endpoints to avoid ANY fake data
    const [{ data: pendingApprovals }, { data: myRequests }] = await Promise.all([
       apiClient.get<PendingApprovalListItemDto[]>('/dynamic-forms/approvals/pending'),
       apiClient.get<any[]>('/dynamic-forms/requests/my')
    ]);

    // Calculate real stats
    return {
      totalFormsSubmitted: myRequests?.length || 0,
      pendingApprovalsCount: pendingApprovals?.length || 0,
      inProgressFormsCount: myRequests?.filter(r => r.status === 2 || r.status === 3)?.length || 0,
      approvedFormsCount: myRequests?.filter(r => r.status === 4)?.length || 0,
      rejectedFormsCount: myRequests?.filter(r => r.status === 5)?.length || 0,
    };
  }

  async getFormsByDepartmentChart(): Promise<ChartDataPointDto[]> {
    // There is no real backend endpoint for this currently. 
    // Do not return fake data. Return empty or throw, so the UI can decide to hide the chart.
    return [];
  }
  
  async getFormsByStatusChart(): Promise<ChartDataPointDto[]> {
    return [];
  }

  async getRecentActivityLogs(): Promise<ActivityLogDto[]> {
    // Fetch from real audit logs instead of fake data
    try {
      const { data } = await apiClient.get<any[]>('/dynamic-forms/admin/audit-logs');
      return (data || []).slice(0, 10).map((log, index) => ({
        id: log.id || String(index),
        message: `${log.actionType} islem: ${log.entityType} (${log.entityId})`,
        createdAt: log.createdAt,
        type: 'info'
      }));
    } catch {
      return [];
    }
  }

  async getUrgentPendingApprovals(): Promise<PendingApprovalListItemDto[]> {
    // Directly pull from the real pending endpoint and taking the top 5
    const { data } = await apiClient.get<PendingApprovalListItemDto[]>('/dynamic-forms/approvals/pending');
    return (data || []).slice(0, 5);
  }
}

export const dashboardService = new DashboardService();
