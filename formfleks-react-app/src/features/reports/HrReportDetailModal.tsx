import { useQuery } from '@tanstack/react-query';
import { reportService } from '@/services/report.service';
import type { HrFormDetailItemDto } from '@/services/report.service';
import { FfModal } from '@/components/ui/FfModal';
import { FfStatusBadge } from '@/components/ui/FfStatusBadge';
import { FfButton } from '@/components/ui/FfButton';
import { FfSkeletonLoader } from '@/components/shared/FfSkeletonLoader';
import { ExternalLink } from 'lucide-react';

interface HrReportDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestorUserId: string;
  formTypeId: string;
  title: string;
  startDate?: string;
  endDate?: string;
}

export const HrReportDetailModal = ({ isOpen, onClose, requestorUserId, formTypeId, title, startDate, endDate }: HrReportDetailModalProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ['hr-form-details', requestorUserId, formTypeId, startDate, endDate],
    queryFn: () => reportService.getHrFormDetails(requestorUserId, formTypeId, startDate, endDate),
    enabled: isOpen && !!requestorUserId && !!formTypeId
  });

  const getStatusProps = (statusId: number) => {
    switch(statusId) {
      case 1: return { status: 0 as any, label: 'Taslak' };
      case 2: return { status: 2 as any, label: 'Gönderildi' };
      case 3: return { status: 2 as any, label: 'Onayda' };
      case 4: return { status: 1 as any, label: 'Onaylandı' };
      case 5: return { status: 3 as any, label: 'Reddedildi' };
      case 6: return { status: 3 as any, label: 'İptal' };
      case 7: return { status: 2 as any, label: 'Revize Bekliyor' };
      default: return { status: 0 as any, label: 'Taslak' };
    }
  };

  const handleViewForm = (formRequestId: string) => {
    // Open the form in a new tab to avoid losing context
    window.open(`/forms/${formRequestId}`, '_blank');
  };

  return (
    <FfModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="xl"
    >
      <div className="flex flex-col gap-4">
        {isLoading ? (
          <FfSkeletonLoader type="grid" count={5} />
        ) : data && data.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-surface-muted">
            <table className="w-full text-sm text-left text-brand-dark">
              <thead className="text-xs text-brand-gray uppercase bg-surface-muted/50 border-b border-surface-muted">
                <tr>
                  <th className="px-4 py-3">Form No</th>
                  <th className="px-4 py-3">Tarih</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item: HrFormDetailItemDto) => (
                  <tr key={item.formRequestId} className="bg-surface-base border-b border-surface-muted hover:bg-surface-hover/50">
                    <td className="px-4 py-3 font-medium text-brand-primary">{item.formRequestNo}</td>
                    <td className="px-4 py-3">{new Date(item.createdAt).toLocaleDateString('tr-TR')}</td>
                    <td className="px-4 py-3">
                      <FfStatusBadge 
                        status={getStatusProps(item.status).status} 
                        label={getStatusProps(item.status).label} 
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <FfButton 
                        variant="ghost" 
                        size="sm" 
                        rightIcon={<ExternalLink className="h-4 w-4" />}
                        onClick={() => handleViewForm(item.formRequestId)}
                      >
                        Görüntüle
                      </FfButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-brand-gray">Kayıt bulunamadı.</div>
        )}
      </div>
    </FfModal>
  );
};
