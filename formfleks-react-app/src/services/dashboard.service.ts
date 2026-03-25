import { apiClient } from '@/lib/axios';
import type { PendingApprovalListItemDto } from './form.service';

export interface DashboardStatsDto {
  totalFormsSubmitted: number;
  pendingApprovalsCount: number;
  inProgressFormsCount: number;
  approvedFormsCount: number;
  rejectedFormsCount: number;
  approvedByMeCount: number;
  rejectedByMeCount: number;
  returnedFormsCount: number;
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
    const [{ data: pendingApprovals }, { data: myRequests }, { data: myHistory }] = await Promise.all([
       apiClient.get<PendingApprovalListItemDto[]>('/dynamic-forms/approvals/pending'),
       apiClient.get<any[]>('/dynamic-forms/requests/my'),
       apiClient.get<any[]>('/dynamic-forms/approvals/history')
    ]);

    // Calculate real stats
    return {
      totalFormsSubmitted: myRequests?.length || 0,
      pendingApprovalsCount: pendingApprovals?.length || 0,
      inProgressFormsCount: myRequests?.filter(r => r.status === 2 || r.status === 3)?.length || 0,
      approvedFormsCount: myRequests?.filter(r => r.status === 4)?.length || 0,
      rejectedFormsCount: myRequests?.filter(r => r.status === 5)?.length || 0,
      returnedFormsCount: myRequests?.filter(r => r.status === 7)?.length || 0,
      approvedByMeCount: myHistory?.filter(h => h.status === 2)?.length || 0, // ApprovalStatus.Approved = 2
      rejectedByMeCount: myHistory?.filter(h => h.status === 3)?.length || 0, // ApprovalStatus.Rejected = 3
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
      // Catch errors silently to avoid throwing 403 Forbidden exceptions in the browser console for non-admins
      const response = await apiClient.get<any[]>('/dynamic-forms/admin/audit-logs', { validateStatus: s => s < 500 });
      if (response.status === 403) return [];
      const data = response.data;
      return (data || []).slice(0, 10).map((log, index) => {
        let msg = 'Sistem kaydı güncellendi.';
        let type: 'info' | 'success' | 'warning' | 'error' = 'info';

        switch (log.actionType) {
          case 'FormSubmitted':
            msg = 'Yeni bir form talebi onaya gönderildi.';
            type = 'info';
            break;
          case 'Approved':
            msg = 'Bir talep onaylandı.';
            type = 'success';
            break;
          case 'Rejected':
            msg = 'Bir talep reddedildi.';
            type = 'error';
            break;
          case 'ReturnedForRevision':
            msg = 'Bir talep revizyona iade edildi.';
            type = 'warning';
            break;
          case 'FormDraftSaved':
            msg = 'Bir form taslak olarak kaydedildi.';
            type = 'info';
            break;
          case 'TemplateUpserted':
          case 'TemplateCreated':
            msg = 'Bir form şablonu/tasarımı güncellendi.';
            type = 'info';
            break;
          case 'WorkflowUpdated':
            msg = 'Bir formun onay akış şeması güncellendi.';
            type = 'warning';
            break;
          default:
            if (log.entityType === 'FormRequestApproval') msg = 'Onay sürecinde bir işlem yapıldı.';
            else if (log.entityType === 'FormRequest') msg = 'Form talebi üzerinde işlem yapıldı.';
            break;
        }

        return {
          id: log.id || String(index),
          message: msg,
          createdAt: log.createdAt,
          type: type
        };
      });
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
