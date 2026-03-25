import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader, FfButton, PageContainer, GlassCard } from '@/components/ui/index';
import { FfDataGrid } from '@/components/dev-extreme/FfDataGrid';
import { formService, type MyFormRequestListItemDto } from '@/services/form.service';
import { Plus, Edit2 } from 'lucide-react';

export const MyForms: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const statusQuery = searchParams.get('status');
  
  let defaultStatusFilter: number | null = null;
  if (statusQuery === 'draft') defaultStatusFilter = 1;
  else if (statusQuery === 'pending') defaultStatusFilter = 3;
  else if (statusQuery === 'approved') defaultStatusFilter = 4;
  else if (statusQuery === 'rejected') defaultStatusFilter = 5;
  else if (statusQuery === 'returned') defaultStatusFilter = 7;

  const statusRenderer = (data: { data: MyFormRequestListItemDto }) => {
    switch (data.data.status) {
      case 1: return <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">Taslak</span>;
      case 2: return <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">Değerlendirmede</span>;
      case 3: return <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-brand-primary/10 text-brand-primary border border-brand-primary/20">Onay Bekliyor</span>;
      case 4: return <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-status-success/10 text-status-success border border-status-success/20">Onaylandı</span>;
      case 5: return <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-status-danger/10 text-status-danger border border-status-danger/20">Reddedildi</span>;
      case 6: return <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">İptal Edildi</span>;
      case 7: return <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-status-warning/10 text-status-warning border border-status-warning/20">Revizyon Bekliyor</span>;
      default: return <span>Bilinmiyor</span>;
    }
  };

  const requestNoRenderer = (cell: { data: MyFormRequestListItemDto }) => {
    const data = cell.data;
    const isDraft = data.status === 1;
    return (
      <div 
        className={`flex items-center gap-2 cursor-pointer hover:underline font-medium ${isDraft ? 'text-brand-accent' : 'text-brand-primary'}`}
        onClick={() => navigate(`/forms/${data.requestId}`)}
        title={isDraft ? "Taslağı Düzenlemeye Devam Et" : "Form Detayını Görüntüle"}
      >
        <span>{data.requestNo}</span>
        {isDraft && <Edit2 className="h-3.5 w-3.5" />}
      </div>
    );
  };

  const stepRenderer = (cell: { data: MyFormRequestListItemDto }) => {
    const data = cell.data;
    if (data.currentStepNo) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-brand-accent/10 text-brand-accent border border-brand-accent/20">
          Adım {data.currentStepNo}
        </span>
      );
    }
    return <span className="text-brand-gray/50">—</span>;
  };

  const dateRenderer = (cell: { data: MyFormRequestListItemDto }) => {
    const d = new Date(cell.data.createdAt);
    return <span className="text-brand-gray">{d.toLocaleDateString('tr-TR')} {d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>;
  };

  // Define columns
  const columns = [
    { dataField: 'requestNo', caption: 'Talep No', minWidth: 150, cellRender: requestNoRenderer },
    { dataField: 'formTypeName', caption: 'Form Tipi', minWidth: 200 },
    { dataField: 'status', caption: 'Durum', minWidth: 120, cellRender: statusRenderer, filterValue: defaultStatusFilter ?? undefined, dataType: 'number' as const },
    { dataField: 'currentStepNo', caption: 'Adım', minWidth: 100, cellRender: stepRenderer, allowFiltering: false },
    { dataField: 'createdAt', caption: 'Tarih', minWidth: 150, cellRender: dateRenderer, dataType: 'date' as const }
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Form Talepleri"
        description="Gönderdiğiniz tüm form taleplerini buradan takip edebilirsiniz."
        breadcrumbs={[
          { label: 'Anasayfa', href: '/' },
          { label: 'Form Talepleri' }
        ]}
        actions={
          <FfButton 
            variant="primary" 
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => navigate('/forms/create')}
          >
            Yeni Form
          </FfButton>
        }
      />

      <GlassCard noPadding className="overflow-hidden animate-delay-100 glass-glow hover:shadow-2xl transition-all duration-500">
        <FfDataGrid
          key={`my-forms-grid-${statusQuery || 'all'}`}
          queryKey={['my-forms']}
          fetchFn={formService.getMyRequests}
          columns={columns}
          className="border-0"
        />
      </GlassCard>
    </PageContainer>
  );
};
