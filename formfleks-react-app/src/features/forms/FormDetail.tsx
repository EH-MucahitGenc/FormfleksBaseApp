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
            <h3 className="text-lg font-bold text-brand-dark mb-4 pb-3 border-b border-surface-muted flex items-center gap-2">
              <FileText className="h-5 w-5 text-brand-primary" />
              Form İçeriği
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 pt-2">
              {data.values && data.values.length > 0 ? (
                data.values.map((f: any, i: number) => (
                  <div key={i} className="group">
                    <span className="block text-xs font-bold text-brand-gray uppercase tracking-widest mb-1 shadow-sm opacity-80 group-hover:opacity-100 transition-opacity">
                      {f.label || f.fieldKey}
                    </span>
                    <div className="text-base font-semibold text-brand-dark bg-surface-muted/30 p-3 rounded-md border border-brand-gray/10">
                      {f.valueText || <span className="text-brand-gray/50 italic">Belirtilmedi</span>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-8 text-center text-sm font-medium text-brand-gray bg-surface-muted/20 rounded-lg border border-dashed border-brand-gray/30">
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
                  let statusText = 'İşlem Sırada';
                  
                  let stepName = w.step;
                  if (stepName.startsWith('Eski Adım')) {
                     stepName = stepName.replace('Eski Adım', 'Önceki İşlem');
                     statusColor = 'border-surface-muted text-brand-gray/50';
                  }

                  if (w.status === 'Approved') {
                    statusColor = 'border-status-success text-status-success';
                    Icon = CheckCircle;
                    statusText = 'Onaylandı / Tamamlandı';
                  } else if (w.status === 'Submitted') {
                    statusColor = 'border-brand-gray text-brand-dark';
                    bgIcon = 'bg-surface-muted';
                    Icon = FileText;
                    statusText = 'Form Gönderildi';
                  } else if (w.status === 'Future') {
                    statusColor = 'border-surface-muted text-brand-gray/40';
                    bgIcon = 'bg-surface-muted/30';
                    Icon = Clock;
                    statusText = 'Sırada Bekliyor';
                  } else if (w.status === 'Pending') {
                    statusColor = 'border-brand-primary text-brand-primary';
                    bgIcon = 'bg-brand-primary/10';
                    statusText = 'Onay Bekliyor';
                  } else if (w.status === 'Rejected') {
                    statusColor = 'border-status-danger text-status-danger text-bold';
                    Icon = XCircle;
                    statusText = 'Reddedildi';
                  } else if (w.status === 'ReturnedForRevision') {
                    statusColor = 'border-status-warning text-status-warning';
                    Icon = CornerUpLeft;
                    statusText = 'İade Edildi';
                  }

                  return (
                    <div key={idx} className={`relative ${w.status === 'Future' ? 'opacity-70' : ''}`}>
                      <div className={`absolute -left-[31px] top-1 p-1 rounded-full ${bgIcon} border-2 ${statusColor} shadow-sm`}>
                        <Icon className="h-3 w-3" />
                      </div>
                      <div className="bg-white p-3 rounded-md border border-surface-muted shadow-sm mb-4">
                        <h4 className={`text-sm font-extrabold ${w.status === 'Future' ? 'text-brand-gray/80' : 'text-brand-dark'}`}>{stepName}</h4>
                        <div className={`text-xs font-bold mb-2 inline-block px-2 py-0.5 mt-1 rounded-full border ${statusColor} bg-white`}>{statusText}</div>
                        <div className="text-xs text-brand-gray mt-1">
                          Sorumlu: <span className="font-semibold text-brand-dark">{w.actor}</span>
                        </div>
                        {w.date && (
                          <div className="text-xs text-brand-gray mt-0.5">
                            Tarih: <span className="font-medium">{new Date(w.date).toLocaleString('tr-TR')}</span>
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
