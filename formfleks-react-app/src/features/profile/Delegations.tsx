import React, { useState } from 'react';
import { PageContainer, PageHeader, GlassCard, FfButton } from '@/components/ui';
import { useTerminateDelegation } from './hooks/useDelegations';
import { Plus, Clock } from 'lucide-react';
import { FfDataGrid } from '@/components/dev-extreme/FfDataGrid';
import { delegationService } from '@/services/delegation.service';
import { CreateDelegationModal } from './components/CreateDelegationModal';

export const Delegations: React.FC = () => {
  const terminateMutation = useTerminateDelegation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleTerminate = (id: string) => {
    if (window.confirm("Bu vekaleti sonlandırmak istediğinize emin misiniz?")) {
      terminateMutation.mutate(id);
    }
  };

  const columns = [
    {
      dataField: 'delegateeName',
      caption: 'Vekil (Devralan)',
      minWidth: 200,
    },
    {
      dataField: 'startDate',
      caption: 'Başlangıç Tarihi',
      dataType: 'datetime',
      width: 170,
      cellRender: (data: any) => new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(data.value))
    },
    {
      dataField: 'endDate',
      caption: 'Bitiş Tarihi',
      dataType: 'datetime',
      width: 170,
      cellRender: (data: any) => new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(data.value))
    },
    {
      dataField: 'reason',
      caption: 'Gerekçe',
      minWidth: 150,
    },
    {
      dataField: 'isActive',
      caption: 'Durum',
      width: 120,
      cellRender: (data: any) => {
        const isActive = data.value;
        const now = new Date();
        const start = new Date(data.data.startDate);
        const end = new Date(data.data.endDate);
        
        if (!isActive) return <span className="text-xs font-semibold px-2 py-1 rounded bg-surface-muted text-brand-gray">İptal Edildi</span>;
        if (now < start) return <span className="text-xs font-semibold px-2 py-1 rounded bg-status-info/10 text-status-info">İleri Tarihli</span>;
        if (now > end) return <span className="text-xs font-semibold px-2 py-1 rounded bg-surface-muted text-brand-gray">Süresi Doldu</span>;
        
        return <span className="text-xs font-semibold px-2 py-1 rounded bg-status-success/10 text-status-success">Aktif</span>;
      }
    },
    {
      type: 'buttons',
      width: 120,
      buttons: [
        {
          hint: 'Sonlandır',
          icon: 'close',
          cssClass: 'text-status-danger',
          visible: (e: any) => e.row.data.isActive === true && new Date() <= new Date(e.row.data.endDate),
          onClick: (e: any) => handleTerminate(e.row.data.id),
        }
      ]
    }
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Vekalet & Yetki Devri"
        description="İzinli olduğunuz tarihlerde onayınıza düşen formların otomatik olarak vekilinize yönlendirilmesini buradan yönetebilirsiniz."
        breadcrumbs={[
          { label: 'Anasayfa', href: '/' },
          { label: 'Ayarlar', href: '/settings/profile' },
          { label: 'Vekalet Devri' }
        ]}
        actions={
          <FfButton variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setIsModalOpen(true)}>
            Yeni Vekalet Ekle
          </FfButton>
        }
      />

      <GlassCard noPadding className="mt-6 flex-1 min-h-[500px] flex flex-col">
          <div className="px-5 py-3 border-b border-surface-muted bg-surface-hover flex items-center gap-2 font-bold text-brand-primary">
              <Clock className="h-5 w-5" />
              Tüm Vekalet Kayıtlarım
          </div>
          <FfDataGrid
            queryKey={['my-delegations']}
            fetchFn={delegationService.getMyDelegations}
            columns={columns}
          />
      </GlassCard>

      {isModalOpen && (
        <CreateDelegationModal onClose={() => setIsModalOpen(false)} />
      )}
    </PageContainer>
  );
};
