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

/**
 * @service DashboardService
 * @description Anasayfa (Dashboard) ekranındaki özet istatistikler, grafikler ve son aktiviteleri getirmekle sorumlu veri erişim servisi.
 */
class DashboardService {
  async getOverviewStats(): Promise<DashboardStatsDto> {
    // Henüz sadece özet istatistik dönen bir API olmadığı için, gerçek verilerle hesaplama yapmak adına mevcut endpoint'leri kullanıyoruz.
    const [{ data: pendingApprovals }, { data: myRequests }, { data: myHistory }] = await Promise.all([
       apiClient.get<PendingApprovalListItemDto[]>('/dynamic-forms/approvals/pending'),
       apiClient.get<any[]>('/dynamic-forms/requests/my'),
       apiClient.get<any[]>('/dynamic-forms/approvals/history')
    ]);

    // Gerçek istatistikleri hesapla
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
    // Şu an bunun için bir arka yüz (backend) servisi bulunmuyor. 
    // Sahte veri dönmeyin. UI'ın (Arayüzün) grafiği gizleyebilmesi için boş liste dönün.
    return [];
  }
  
  async getFormsByStatusChart(): Promise<ChartDataPointDto[]> {
    return [];
  }

  async getRecentActivityLogs(): Promise<ActivityLogDto[]> {
    // Sahte veri yerine gerçek denetim izi (audit log) kayıtlarını getir
    try {
      // Yetkisi olmayan (admin olmayan) kullanıcılar için 403 Forbidden hatalarını konsolda göstermemek adına hataları sessizce yakala.
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
    // Doğrudan onay bekleyenler servisinden çekip ilk 5 kaydı alıyoruz.
    const { data } = await apiClient.get<PendingApprovalListItemDto[]>('/dynamic-forms/approvals/pending');
    return (data || []).slice(0, 5);
  }
}

export const dashboardService = new DashboardService();
