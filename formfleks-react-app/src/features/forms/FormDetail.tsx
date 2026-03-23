import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader, PageContainer, GlassCard } from '@/components/ui/index';
import { ArrowLeft, CheckCircle, Clock, FileText, Edit, XCircle, CornerUpLeft, Check, X } from 'lucide-react';
import { FfButton } from '@/components/ui/index';
import { useFormDetail, usePendingApprovals, useApprovalAction } from './hooks/useForms';
import { useAuthStore } from '@/store/useAuthStore';

export const FormDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { data, isLoading } = useFormDetail(id || '');
  const { data: pendingApprovals } = usePendingApprovals();
  const approvalMutation = useApprovalAction();

  const activeApproval = pendingApprovals?.find(p => p.requestId === id);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  if (!data) return null;

  const handleAction = async (actionType: 1 | 2 | 3) => {
    if (!activeApproval) return;
    
    // In a real scenario, you'd open a modal for Reject/Return comments
    const comment = actionType !== 1 ? prompt('Lütfen bir açıklama giriniz:') : undefined;
    if (actionType !== 1 && !comment) return;

    approvalMutation.mutate({
      requestId: activeApproval.requestId,
      approvalId: activeApproval.approvalId,
      actorUserId: user?.id || '',
      approvalConcurrencyToken: activeApproval.approvalConcurrencyToken,
      actionType,
      comment: comment || undefined
    });
  };

  return (
    <PageContainer>
      <div className="flex items-center gap-4 mb-2">
        <button 
          onClick={() => navigate('/forms')}
          className="p-2 hover:bg-surface-muted rounded-full text-brand-gray transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <PageHeader
            title={`${data.formTypeName} - Detay`}
            description={`${data.requestNo || data.requestId} numaralı talebin detayları`}
            breadcrumbs={[
              { label: 'Anasayfa', href: '/' },
              { label: 'Taleplerim', href: '/forms' },
              { label: 'Form Detayı' }
            ]}
          />
        </div>
        {data.status === 1 && data.formTypeCode && (
          <FfButton 
            variant="primary" 
            leftIcon={<Edit className="h-4 w-4" />}
            onClick={() => navigate(`/forms/d/${data.formTypeCode}?draftId=${data.requestId}`)}
          >
            Düzenlemeye Devam Et
          </FfButton>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <GlassCard noPadding className="p-6">
            <h3 className="text-lg font-bold text-brand-dark mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-brand-primary" />
              Form İçeriği
            </h3>
            <div className="space-y-4">
              {data.values && data.values.length > 0 ? (
                data.values.map((f: any, i: number) => (
                  <div key={i} className="pb-4 border-b border-surface-muted last:border-0 last:pb-0">
                    <span className="block text-xs font-semibold text-brand-gray uppercase tracking-wider mb-1">
                      {f.label || f.fieldKey}
                    </span>
                    <span className="text-sm font-medium text-brand-dark">{f.valueText || 'Belirtilmedi'}</span>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-sm font-medium text-brand-gray">
                  Bu forma ait girilmiş bir veri bulunmuyor.
                </div>
              )}
            </div>
          </GlassCard>
        </div>

        <div className="space-y-6">
          <GlassCard noPadding className="p-6">
            <h3 className="text-sm font-bold text-brand-dark mb-4 pb-3 border-b border-surface-muted">
              Durum Bilgileri
            </h3>
            
            <div className="space-y-6">
              <div className="relative pl-6 border-l-2 border-surface-muted space-y-6">
                {data.workflow?.map((w: any, idx: number) => {
                  let statusColor = 'border-surface-muted text-brand-gray';
                  let bgIcon = 'bg-white';
                  let Icon = Clock;
                  let statusText = 'Bekliyor';

                  if (w.status === 'Approved') {
                    statusColor = 'border-status-success text-status-success';
                    Icon = CheckCircle;
                    statusText = 'Onaylandı';
                  } else if (w.status === 'InApproval') {
                    statusColor = 'border-brand-primary text-brand-primary';
                    bgIcon = 'bg-brand-primary/10';
                    statusText = 'Onay Bekliyor';
                  } else if (w.status === 'Rejected') {
                    statusColor = 'border-status-danger text-status-danger';
                    Icon = XCircle;
                    statusText = 'Reddedildi';
                  } else if (w.status === 'Returned') {
                    statusColor = 'border-status-warning text-status-warning';
                    Icon = CornerUpLeft;
                    statusText = 'İade Edildi';
                  }

                  return (
                    <div key={idx} className="relative">
                      <div className={`absolute -left-[31px] top-1 p-1 rounded-full ${bgIcon} border-2 ${statusColor}`}>
                        <Icon className="h-3 w-3" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-brand-dark">{w.step}</h4>
                        <div className="text-xs font-semibold text-brand-gray mb-1">{statusText}</div>
                        <div className="text-xs text-brand-gray mt-1">
                          Sorumlu: <span className="font-medium text-brand-dark">{w.actor}</span>
                        </div>
                        {w.date && (
                          <div className="text-xs text-brand-gray mt-0.5">
                            Tarih: {new Date(w.date).toLocaleString('tr-TR')}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {data.workflow?.length === 0 && (
                   <div className="text-sm text-brand-gray italic">Henüz bir onay adımı oluşmamış veya taslak durumunda.</div>
                )}
              </div>
            </div>

            {/* Aksiyon Butonları (Eğer aktif onayı varsa) */}
            {activeApproval && (
              <div className="mt-8 pt-6 border-t border-surface-muted space-y-3">
                <h4 className="text-sm font-bold text-brand-dark">Size Atanmış İşlem</h4>
                <div className="flex flex-col gap-2">
                  <FfButton 
                    variant="primary" 
                    className="w-full justify-center"
                    leftIcon={<Check className="h-4 w-4" />}
                    onClick={() => handleAction(1)}
                    isLoading={approvalMutation.isPending}
                  >
                    Onayla
                  </FfButton>
                  <div className="flex gap-2">
                    <FfButton 
                      variant="danger" 
                      className="flex-1 justify-center"
                      leftIcon={<X className="h-4 w-4" />}
                      onClick={() => handleAction(2)}
                      disabled={approvalMutation.isPending}
                    >
                      Reddet
                    </FfButton>
                    <FfButton 
                      variant="outline" 
                      className="flex-1 justify-center"
                      leftIcon={<CornerUpLeft className="h-4 w-4" />}
                      onClick={() => handleAction(3)}
                      disabled={approvalMutation.isPending}
                    >
                      İade Et
                    </FfButton>
                  </div>
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </PageContainer>
  );
};
