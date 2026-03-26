import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { PageHeader, PageContainer, GlassCard } from '@/components/ui/index';
import { ArrowLeft, CheckCircle, Clock, FileText, Edit, XCircle, CornerUpLeft, Check, X, Info, Printer } from 'lucide-react';
import { FfButton } from '@/components/ui/index';
import { PrintableFormDetail } from './components/PrintableFormDetail';
import { useFormDetail, usePendingApprovals, useApprovalAction } from './hooks/useForms';
import { useAuthStore } from '@/store/useAuthStore';
import { FfEmptyState } from '@/components/shared/FfEmptyState';

export const FormDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const { data, isLoading, isError } = useFormDetail(id || '');
  const { data: pendingApprovals } = usePendingApprovals();
  const approvalMutation = useApprovalAction();
  
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: data?.requestNo || 'Form_Print'
  });
  
  const [modalState, setModalState] = useState<{ isOpen: boolean; actionType: 1 | 2 | 3 }>({
    isOpen: false,
    actionType: 1
  });
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const activeApproval = pendingApprovals?.find(p => p.requestId === id);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center min-h-[50vh] mt-10">
          <FfEmptyState 
            title="Erişim Reddedildi veya Form Bulunamadı" 
            description="Bu formu görüntülemek için gerekli yetkilere sahip olmayabilirsiniz veya form sistemden tamamen kaldırılmış olabilir." 
          />
          <FfButton variant="outline" className="mt-6" leftIcon={<ArrowLeft className="w-4 h-4"/>} onClick={() => navigate('/forms')}>
            Taleplerime Dön
          </FfButton>
        </div>
      </PageContainer>
    );
  }

  if (!data) return null;

  const openModal = (actionType: 1 | 2 | 3) => {
    setModalState({ isOpen: true, actionType });
    setComment('');
    setMessage(null);
  };

  const closeModal = () => {
    setModalState({ isOpen: false, actionType: 1 });
    setComment('');
  };

  const handleAction = async () => {
    if (!activeApproval) return;

    approvalMutation.mutate(
      {
        requestId: activeApproval.requestId,
        approvalId: activeApproval.approvalId,
        actorUserId: user?.id || '',
        approvalConcurrencyToken: activeApproval.approvalConcurrencyToken,
        actionType: modalState.actionType,
        comment: comment || undefined
      },
      {
        onSuccess: () => {
          setMessage(
            modalState.actionType === 1 ? 'Talep başarıyla onaylandı.' :
            modalState.actionType === 2 ? 'Talep reddedildi.' : 'Talep revizyona iade edildi.'
          );
          queryClient.invalidateQueries({ queryKey: ['form-request', id!] });
          queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
          closeModal();
        }
      }
    );
  };

  const isCommentValid = () => {
    if (modalState.actionType === 2 || modalState.actionType === 3) {
      return comment.trim().length > 0;
    }
    return true;
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
        <div className="flex gap-2">
          {data && data.status >= 2 && (
            <FfButton 
              variant="outline" 
              leftIcon={<Printer className="h-4 w-4" />}
              onClick={() => handlePrint()}
              className="bg-white hover:bg-surface-muted"
            >
              PDF İndir / Yazdır
            </FfButton>
          )}
          {(data.status === 1 || data.status === 7) && data.formTypeCode && (
            <FfButton 
              variant="primary" 
              leftIcon={<Edit className="h-4 w-4" />}
              onClick={() => navigate(`/forms/d/${data.formTypeCode}?draftId=${data.requestId}`)}
            >
              Düzenlemeye Devam Et
            </FfButton>
          )}
        </div>
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
                  let bgIcon = 'bg-surface-base';
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
                      <div className="bg-surface-base p-3 rounded-md border border-surface-muted shadow-sm mb-4">
                        <h4 className={`text-sm font-extrabold ${w.status === 'Future' ? 'text-brand-gray/80' : 'text-brand-dark'}`}>{stepName}</h4>
                        <div className={`text-xs font-bold mb-2 inline-block px-2 py-0.5 mt-1 rounded-full border ${statusColor} bg-surface-base`}>{statusText}</div>
                        <div className="text-xs text-brand-gray mt-1">
                          Sorumlu: <span className="font-semibold text-brand-dark">{w.actor}</span>
                        </div>
                        {w.date && (
                          <div className="text-xs text-brand-gray mt-0.5">
                            Tarih: <span className="font-medium">{new Date(w.date).toLocaleString('tr-TR')}</span>
                          </div>
                        )}
                        {w.comment && (
                          <div className="mt-2 text-xs text-brand-dark bg-brand-gray/5 p-2 rounded-md border border-brand-gray/10 italic">
                            <span className="font-semibold not-italic text-brand-gray">Not:</span> {w.comment}
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
                {message && (
                  <div className="p-3 mb-2 rounded-lg bg-status-info/10 border border-status-info/20 text-status-info flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    <span className="font-medium text-xs">{message}</span>
                  </div>
                )}
                <h4 className="text-sm font-bold text-brand-dark">Size Atanmış İşlem</h4>
                <div className="flex flex-col gap-2">
                  <FfButton 
                    variant="primary" 
                    className="w-full justify-center"
                    leftIcon={<Check className="h-4 w-4" />}
                    onClick={() => openModal(1)}
                    disabled={approvalMutation.isPending}
                  >
                    Onayla
                  </FfButton>
                  <div className="flex gap-2">
                    <FfButton 
                      variant="danger" 
                      className="flex-1 justify-center"
                      leftIcon={<X className="h-4 w-4" />}
                      onClick={() => openModal(2)}
                      disabled={approvalMutation.isPending}
                    >
                      Reddet
                    </FfButton>
                    <FfButton 
                      variant="outline" 
                      className="flex-1 justify-center"
                      leftIcon={<CornerUpLeft className="h-4 w-4" />}
                      onClick={() => openModal(3)}
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
      
      {/* Action Modal with React Portal */}
      {modalState.isOpen && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0f172a]/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-base rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className={`px-6 py-4 border-b flex items-center gap-3 ${
              modalState.actionType === 1 ? 'bg-status-success/5 border-status-success/20' :
              modalState.actionType === 2 ? 'bg-status-danger/5 border-status-danger/20' :
              'bg-status-warning/5 border-status-warning/20'
            }`}>
              <div className={`p-2 rounded-full ${
                modalState.actionType === 1 ? 'bg-status-success/20 text-status-success' :
                modalState.actionType === 2 ? 'bg-status-danger/20 text-status-danger' :
                'bg-status-warning/20 text-status-warning'
              }`}>
                {modalState.actionType === 1 && <Check className="h-5 w-5" />}
                {modalState.actionType === 2 && <X className="h-5 w-5" />}
                {modalState.actionType === 3 && <CornerUpLeft className="h-5 w-5" />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-brand-dark">
                  {modalState.actionType === 1 ? 'Onayla' : modalState.actionType === 2 ? 'Reddet' : 'İade Et'}
                </h3>
                <p className="text-xs text-brand-gray">{data.requestNo} numaralı talep</p>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-brand-dark flex items-center gap-1.5">
                  Yorum / Açıklama
                  {modalState.actionType === 1 ? (
                    <span className="text-xs font-normal text-brand-gray/60">(Opsiyonel)</span>
                  ) : (
                    <span className="text-xs font-medium text-status-danger">* Zorunlu</span>
                  )}
                </label>
                <textarea
                  className="w-full h-24 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all resize-none"
                  placeholder="İşlem nedenini buraya yazabilirsiniz..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-surface-muted/50 border-t flex justify-end gap-3">
              <FfButton 
                variant="outline" 
                onClick={closeModal}
                disabled={approvalMutation.isPending}
              >
                Vazgeç
              </FfButton>
              <FfButton 
                variant={modalState.actionType === 1 ? 'primary' : modalState.actionType === 2 ? 'danger' : 'secondary'}
                onClick={handleAction}
                disabled={!isCommentValid() || approvalMutation.isPending}
                isLoading={approvalMutation.isPending}
              >
                {approvalMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
              </FfButton>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Hidden Print Container */}
      <div className="hidden">
        <PrintableFormDetail ref={printRef} data={data} />
      </div>

    </PageContainer>
  );
};
