import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader, FfButton, PageContainer, GlassCard } from '@/components/ui/index';
import { FfDataGrid } from '@/components/dev-extreme/FfDataGrid';
import { formService, type PendingApprovalListItemDto } from '@/services/form.service';
import { Check, X, CornerUpLeft, Info } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

export const PendingApprovals: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [modalState, setModalState] = useState<{ isOpen: boolean; item: PendingApprovalListItemDto | null; actionType: 1 | 2 | 3 }>({
    isOpen: false,
    item: null,
    actionType: 1
  });
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const approveMutation = useMutation({
    mutationFn: (payload: { actionType: 1 | 2 | 3; comment: string; item: PendingApprovalListItemDto }) => {
      return formService.executeApprovalAction({
        requestId: payload.item.requestId,
        approvalId: payload.item.approvalId,
        actorUserId: user?.id || '',
        approvalConcurrencyToken: payload.item.approvalConcurrencyToken,
        actionType: payload.actionType,
        comment: payload.comment
      });
    },
    onSuccess: (_, variables) => {
      setMessage(
        variables.actionType === 1 ? 'Talep başarıyla onaylandı.' :
        variables.actionType === 2 ? 'Talep reddedildi.' : 'Talep revizyona iade edildi.'
      );
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      closeModal();
    }
  });

  const openModal = (item: PendingApprovalListItemDto, actionType: 1 | 2 | 3) => {
    setModalState({ isOpen: true, item, actionType });
    setComment('');
    setMessage(null);
  };

  const closeModal = () => {
    setModalState({ isOpen: false, item: null, actionType: 1 });
    setComment('');
  };

  const handleAction = () => {
    if (!modalState.item) return;
    approveMutation.mutate({ actionType: modalState.actionType, comment, item: modalState.item });
  };

  const isCommentValid = () => {
    if (modalState.actionType === 2 || modalState.actionType === 3) {
      return comment.trim().length > 0;
    }
    return true;
  };

  const actionRenderer = ({ data }: any) => (
    <div className="flex gap-2">
      <button 
        onClick={() => openModal(data, 1)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-status-success/10 text-status-success hover:bg-status-success/20 transition-colors border border-status-success/20"
      >
        <Check className="h-3.5 w-3.5" /> Onayla
      </button>
      <button 
        onClick={() => openModal(data, 2)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-status-danger/10 text-status-danger hover:bg-status-danger/20 transition-colors border border-status-danger/20"
      >
        <X className="h-3.5 w-3.5" /> Reddet
      </button>
      <button 
        onClick={() => openModal(data, 3)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-status-warning/10 text-status-warning hover:bg-status-warning/20 transition-colors border border-status-warning/20"
      >
        <CornerUpLeft className="h-3.5 w-3.5" /> İade
      </button>
    </div>
  );

  const stepRenderer = ({ data }: any) => (
    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-brand-accent/10 text-brand-accent border border-brand-accent/20">
      Adım {data.stepNo}
    </span>
  );

  const requestNoRenderer = ({ data }: any) => (
    <span className="font-medium text-brand-dark">{data.requestNo}</span>
  );

  const dateRenderer = ({ data }: any) => {
    const d = new Date(data.createdAt);
    return <span className="text-brand-gray">{d.toLocaleDateString('tr-TR')} {d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>;
  };

  const columns = [
    { dataField: 'requestNo', caption: 'Talep No', minWidth: 150, cellRender: requestNoRenderer },
    { dataField: 'formTypeName', caption: 'Form Tipi', minWidth: 200 },
    { dataField: 'stepNo', caption: 'Adım', minWidth: 100, cellRender: stepRenderer, allowFiltering: false },
    { dataField: 'createdAt', caption: 'Tarih', minWidth: 150, cellRender: dateRenderer, dataType: 'date' as const },
    { dataField: 'actions', caption: 'İşlem', minWidth: 280, cellRender: actionRenderer, allowFiltering: false, allowSorting: false }
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Bekleyen Onaylar"
        description="Size atanan bekleyen onay talepleri."
        breadcrumbs={[
          { label: 'Anasayfa', href: '/' },
          { label: 'Onay Merkezi' }
        ]}
      />

      {message && (
        <div className="p-4 mb-6 rounded-lg bg-status-info/10 border border-status-info/20 text-status-info flex items-center gap-2">
          <Info className="h-5 w-5" />
          <span className="font-medium text-sm">{message}</span>
        </div>
      )}

      <GlassCard noPadding className="overflow-hidden">
        <FfDataGrid
          queryKey={['pending-approvals']}
          fetchFn={formService.getPendingApprovals}
          columns={columns}
          className="border-0"
        />
      </GlassCard>

      {/* Action Modal */}
      {modalState.isOpen && modalState.item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
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
                <p className="text-xs text-brand-gray">{modalState.item.requestNo} numaralı talep</p>
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
                onClick={() => setModalState({ isOpen: false, actionType: 1, item: null })}
                disabled={approveMutation.isPending}
              >
                Vazgeç
              </FfButton>
              <FfButton 
                variant={modalState.actionType === 1 ? 'primary' : modalState.actionType === 2 ? 'danger' : 'secondary'}
                onClick={handleAction}
                disabled={!isCommentValid() || approveMutation.isPending}
                isLoading={approveMutation.isPending}
              >
                {approveMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
              </FfButton>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
};
