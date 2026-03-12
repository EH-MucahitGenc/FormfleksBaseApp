import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, FfButton } from '@/components/ui/index';
import { FfDataGrid } from '@/components/dev-extreme/FfDataGrid';
import { formService, type MyFormRequestListItemDto } from '@/services/form.service';
import { Plus, Edit2 } from 'lucide-react';

export const MyForms: React.FC = () => {
  const navigate = useNavigate();
  
  const statusRenderer = (data: MyFormRequestListItemDto) => {
    switch (data.status) {
      case 1: return <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">Taslak</span>;
      case 2: return <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">Onay Bekliyor</span>;
      case 3: return <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-status-success/10 text-status-success border border-status-success/20">Onaylandı</span>;
      case 4: return <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-status-danger/10 text-status-danger border border-status-danger/20">Reddedildi</span>;
      default: return <span>Bilinmiyor</span>;
    }
  };

  const requestNoRenderer = (data: MyFormRequestListItemDto) => {
    if (data.status === 1) { // Taslak ise tıklanıp düzenlenebilir
      return (
        <div 
          className="flex items-center gap-2 cursor-pointer text-brand-primary hover:underline font-medium"
          onClick={() => navigate(`/forms/request/${data.requestId}`)}
        >
          <span>{data.requestNo}</span>
          <Edit2 className="h-3.5 w-3.5 text-brand-gray" />
        </div>
      );
    }
    return <span className="font-medium text-brand-dark">{data.requestNo}</span>;
  };

  const stepRenderer = (data: MyFormRequestListItemDto) => {
    if (data.currentStepNo) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-brand-accent/10 text-brand-accent border border-brand-accent/20">
          Adım {data.currentStepNo}
        </span>
      );
    }
    return <span className="text-brand-gray/50">—</span>;
  };

  const dateRenderer = (data: MyFormRequestListItemDto) => {
    const d = new Date(data.createdAt);
    return <span className="text-brand-gray">{d.toLocaleDateString('tr-TR')} {d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>;
  };

  // Define columns
  const columns = [
    { dataField: 'requestNo', caption: 'Talep No', minWidth: 150, cellRender: requestNoRenderer },
    { dataField: 'formTypeName', caption: 'Form Tipi', minWidth: 200 },
    { dataField: 'status', caption: 'Durum', minWidth: 120, cellRender: statusRenderer, allowFiltering: false },
    { dataField: 'currentStepNo', caption: 'Adım', minWidth: 100, cellRender: stepRenderer, allowFiltering: false },
    { dataField: 'createdAt', caption: 'Tarih', minWidth: 150, cellRender: dateRenderer, dataType: 'date' as const }
  ];

  return (
    <div className="p-6 md:p-8 space-y-6 w-full">
      <PageHeader
        title="Form Talepleri"
        description="Gönderdiğiniz tüm form taleplerini buradan takip edebilirsiniz."
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

      <FfDataGrid
        queryKey={['my-forms']}
        fetchFn={formService.getMyRequests}
        columns={columns}
        className="mt-6"
      />
    </div>
  );
};
