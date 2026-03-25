import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader, PageContainer, GlassCard } from '@/components/ui/index';
import { FfDataGrid } from '@/components/dev-extreme/FfDataGrid';
import { formService } from '@/services/form.service';
import { CheckCircle, XCircle, Eye } from 'lucide-react';

export const ApprovalHistory: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const statusQuery = searchParams.get('status');
  
  let defaultStatusFilter: number | null = null;
  if (statusQuery === 'approved') defaultStatusFilter = 2;
  else if (statusQuery === 'rejected') defaultStatusFilter = 3;

  const requestNoRenderer = ({ data }: any) => (
    <button 
      onClick={() => navigate(`/forms/${data.requestId}`)}
      className="font-bold text-brand-primary hover:text-brand-accent hover:underline transition-colors"
    >
      {data.requestNo}
    </button>
  );

  const statusRenderer = ({ data }: any) => {
    // 2: Approved, 3: Rejected/Returned
    // Based on MediatR Query logic "app.Status == (short)ApprovalStatus.Approved || app.Status == (short)ApprovalStatus.Rejected"
    if (data.status === 2) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-status-success/10 text-status-success border border-status-success/20">
          <CheckCircle className="h-3.5 w-3.5" /> Onaylandı
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-status-danger/10 text-status-danger border border-status-danger/20">
        <XCircle className="h-3.5 w-3.5" /> Reddedildi
      </span>
    );
  };

  const dateRenderer = ({ data }: any) => {
    const d = new Date(data.processedAt);
    return <span className="text-brand-gray">{d.toLocaleDateString('tr-TR')} {d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>;
  };

  const actionRenderer = ({ data }: any) => (
    <button 
      onClick={() => navigate(`/forms/${data.requestId}`)}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 transition-colors border border-brand-primary/20"
    >
      <Eye className="h-3.5 w-3.5" /> Görüntüle
    </button>
  );

  const columns = [
    { dataField: 'requestNo', caption: 'Talep No', minWidth: 150, cellRender: requestNoRenderer },
    { dataField: 'formTypeName', caption: 'Form Tipi', minWidth: 180 },
    { dataField: 'requestorName', caption: 'Talep Eden', minWidth: 180 },
    { dataField: 'status', caption: 'İşlem Durumu', minWidth: 150, cellRender: statusRenderer, filterValue: defaultStatusFilter ?? undefined, dataType: 'number' as const },
    { dataField: 'processedAt', caption: 'İşlem Tarihi', minWidth: 150, cellRender: dateRenderer, dataType: 'date' as const, sortOrder: 'desc' as const },
    { dataField: 'actions', caption: 'Detay', minWidth: 120, cellRender: actionRenderer, allowFiltering: false, allowSorting: false }
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Geçmiş Onay İşlemlerim"
        description="Daha önceden bizzat onayladığınız veya reddettiğiniz formların listesi."
        breadcrumbs={[
          { label: 'Anasayfa', href: '/' },
          { label: 'Onay Merkezi', href: '/approvals' },
          { label: 'İşlem Geçmişim' }
        ]}
      />

      <GlassCard noPadding className="overflow-hidden mt-6">
        <FfDataGrid
          queryKey={['approval-history']}
          fetchFn={formService.getApprovalHistory}
          columns={columns}
          className="border-0"
        />
      </GlassCard>
    </PageContainer>
  );
};
