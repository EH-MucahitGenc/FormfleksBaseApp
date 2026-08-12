import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import SelectBox from 'devextreme-react/select-box';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { dynamicFormService } from '@/services/dynamic-form.service';
import { PageHeader, PageContainer, GlassCard, cn, FfButton } from '@/components/ui/index';
import { ArrowLeft, CheckCircle, Clock, FileText, Edit, XCircle, CornerUpLeft, Check, X, Info, Printer, FastForward, ShieldCheck } from 'lucide-react';
import { PrintableFormDetail } from './components/PrintableFormDetail';
import { useFormDetail, usePendingApprovals, useApprovalAction, useCancelRequest } from './hooks/useForms';
import { useAuthStore } from '@/store/useAuthStore';
import { FfEmptyState } from '@/components/shared/FfEmptyState';
import { adminService } from '@/services/admin.service';
import { formService } from '@/services/form.service';

const formatFieldValue = (val: any): string => {
  if (!val) return '';
  if (typeof val !== 'string') return String(val);
  
  try {
    if (val.startsWith('{') || val.startsWith('[')) {
      let parsed = JSON.parse(val);
      
      let safety = 0;
      while (typeof parsed === 'string' && (parsed.startsWith('{') || parsed.startsWith('[')) && safety < 10) {
        parsed = JSON.parse(parsed);
        safety++;
      }
      
      safety = 0;
      while (parsed && typeof parsed === 'object' && parsed.Value && typeof parsed.Value === 'string' && safety < 10) {
        try { parsed = JSON.parse(parsed.Value); } catch { break; }
        safety++;
      }
      
      if (Array.isArray(parsed)) {
        return parsed.map(item => {
          if (item && typeof item === 'object') {
            return item.Text || item.Value || item.label || item.value || JSON.stringify(item);
          }
          return String(item);
        }).join(', ');
      }
      
      if (parsed && typeof parsed === 'object') {
        return parsed.Text || parsed.Value || parsed.label || parsed.value || JSON.stringify(parsed);
      }
      
      return String(parsed);
    }
  } catch(e) {
    // Ignore JSON parse errors
  }
  
  return val;
};

const getRequestStatusMeta = (status: number) => {
  switch (status) {
    case 1:
      return { label: 'Taslak', tone: 'border-surface-muted bg-surface-ground text-brand-gray', dot: 'bg-brand-gray' };
    case 2:
    case 3:
      return { label: 'Onay Bekliyor', tone: 'border-orange-100 bg-orange-50 text-brand-primary', dot: 'bg-brand-primary' };
    case 4:
      return { label: 'Onaylandı', tone: 'border-emerald-100 bg-emerald-50 text-status-success', dot: 'bg-status-success' };
    case 5:
      return { label: 'Reddedildi', tone: 'border-red-100 bg-red-50 text-status-danger', dot: 'bg-status-danger' };
    case 6:
      return { label: 'İptal Edildi', tone: 'border-surface-muted bg-surface-ground text-brand-gray', dot: 'bg-brand-gray' };
    case 7:
      return { label: 'Revizyon Bekliyor', tone: 'border-amber-100 bg-amber-50 text-status-warning', dot: 'bg-status-warning' };
    default:
      return { label: 'Bilinmiyor', tone: 'border-surface-muted bg-surface-ground text-brand-gray', dot: 'bg-brand-gray' };
  }
};

const workflowStatusMeta = (status: string) => {
  if (status === 'Approved') return { label: 'Onaylandı / Tamamlandı', icon: CheckCircle, tone: 'border-emerald-100 bg-emerald-50 text-status-success', line: 'bg-status-success' };
  if (status === 'Submitted') return { label: 'Form Gönderildi', icon: FileText, tone: 'border-surface-muted bg-white text-brand-dark', line: 'bg-brand-gray' };
  if (status === 'Future') return { label: 'Sırada Bekliyor', icon: Clock, tone: 'border-surface-muted bg-surface-ground text-brand-gray', line: 'bg-surface-muted' };
  if (status === 'Revised') return { label: 'Form Revize Edildi', icon: Edit, tone: 'border-orange-100 bg-orange-50 text-brand-primary', line: 'bg-brand-primary' };
  if (status === 'Pending') return { label: 'Onay Bekliyor', icon: Clock, tone: 'border-orange-100 bg-orange-50 text-brand-primary', line: 'bg-brand-primary' };
  if (status === 'Rejected') return { label: 'Reddedildi', icon: XCircle, tone: 'border-red-100 bg-red-50 text-status-danger', line: 'bg-status-danger' };
  if (status === 'ReturnedForRevision') return { label: 'İade Edildi', icon: CornerUpLeft, tone: 'border-amber-100 bg-amber-50 text-status-warning', line: 'bg-status-warning' };
  if (status === 'Skipped') return { label: 'Atlandı', icon: FastForward, tone: 'border-surface-muted bg-white text-brand-gray', line: 'bg-brand-gray' };
  return { label: 'İşlem Sırada', icon: Clock, tone: 'border-surface-muted bg-white text-brand-gray', line: 'bg-surface-muted' };
};

export const FormDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const { data, isLoading, isError } = useFormDetail(id || '');
  const { data: pendingApprovals } = usePendingApprovals();
  const approvalMutation = useApprovalAction();

  const { data: template } = useQuery({
    queryKey: ['dynamic-form-schema', data?.formTypeCode],
    queryFn: () => dynamicFormService.getTemplateByCode(data!.formTypeCode, data?.requestId),
    enabled: !!data?.formTypeCode,
  });

  
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: data?.requestNo || 'Form_Print'
  });
  
  const [modalState, setModalState] = useState<{ isOpen: boolean; actionType: 1 | 2 | 3 | 4 }>({
    isOpen: false,
    actionType: 1
  });
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  // Reassign Modal State
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [isApprovalReassign, setIsApprovalReassign] = useState(false);
  const [selectedReassignUserId, setSelectedReassignUserId] = useState<string>('');
  const [reassignMessage, setReassignMessage] = useState<string | null>(null);
  
  const { data: usersList } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminService.getUsers(),
    enabled: isReassignModalOpen,
  });

  const cancelMutation = useCancelRequest();

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

  const openModal = (actionType: 1 | 2 | 3 | 4) => {
    setModalState({ isOpen: true, actionType });
    setComment('');
    setMessage(null);
  };

  const closeModal = () => {
    setModalState({ isOpen: false, actionType: 1 });
    setComment('');
  };

  const closeReassignModal = () => {
    setIsReassignModalOpen(false);
    setIsApprovalReassign(false);
    setSelectedReassignUserId('');
    setReassignMessage(null);
  };

  const handleReassign = async () => {
    if (!selectedReassignUserId) return;
    try {
      if (isApprovalReassign && activeApproval) {
        await approvalMutation.mutateAsync({
          requestId: activeApproval.requestId,
          approvalId: activeApproval.approvalId,
          actorUserId: user?.id || '',
          approvalConcurrencyToken: activeApproval.approvalConcurrencyToken,
          actionType: 4, // 4: Reassign
          comment: 'Devredildi',
          newAssigneeUserId: selectedReassignUserId
        });
        setReassignMessage('Onay başarıyla devredildi.');
        queryClient.invalidateQueries({ queryKey: ['form-request', id!] });
        queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
        setTimeout(() => {
          closeReassignModal();
          navigate('/forms/pending-approvals');
        }, 1500);
      } else {
        await formService.reassignRequest(id!, selectedReassignUserId);
        setReassignMessage('Form başarıyla devredildi.');
        queryClient.invalidateQueries({ queryKey: ['form-request', id!] });
        setTimeout(() => {
          closeReassignModal();
          navigate('/forms');
        }, 1500);
      }
    } catch (err: any) {
      setReassignMessage('Devretme işlemi başarısız oldu.');
    }
  };

  const handleAction = async () => {
    if (modalState.actionType === 4) {
      cancelMutation.mutate(
        { requestId: id!, reason: comment || undefined },
        {
          onSuccess: () => {
            setMessage('Talep iptal edildi.');
            queryClient.invalidateQueries({ queryKey: ['form-request', id!] });
            closeModal();
          }
        }
      );
      return;
    }

    if (!activeApproval) return;

    approvalMutation.mutate(
      {
        requestId: activeApproval.requestId,
        approvalId: activeApproval.approvalId,
        actorUserId: user?.id || '',
        approvalConcurrencyToken: activeApproval.approvalConcurrencyToken,
        actionType: modalState.actionType as 1 | 2 | 3,
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

  const statusMeta = getRequestStatusMeta(data.status);
  const workflowItems = data.workflow || [];
  const completedWorkflowCount = workflowItems.filter((w: any) => !['Future', 'Pending'].includes(w.status)).length;
  const workflowProgress = workflowItems.length > 0 ? Math.round((completedWorkflowCount / workflowItems.length) * 100) : 0;
  const currentWorkflow = workflowItems.find((w: any) => w.status === 'Pending') || workflowItems.filter((w: any) => w.status !== 'Future').slice(-1)[0];
  const currentWorkflowIndex = Math.max(0, workflowItems.findIndex((w: any) => w === currentWorkflow));
  const remainingWorkflowCount = Math.max((workflowItems.length || 0) - completedWorkflowCount, 0);

  const renderField = (f: any, i: string | number) => {
    let isGrid = f.fieldType === 11;
    let gridData: any = null;
    
    if (f.valueText) {
      try {
        if (isGrid) {
          gridData = JSON.parse(f.valueText);
        } else if (f.valueText.startsWith('[') && f.valueText.includes('{')) {
          const parsed = JSON.parse(f.valueText);
          if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object' && !parsed[0].hasOwnProperty('Text')) {
            isGrid = true;
            gridData = parsed;
          }
        }
      } catch(e) {}
    }

    if (isGrid && gridData) {
      let gridCols: any[] = [];
      if (f.optionsJson) {
         try { 
             const parsedOpts = JSON.parse(f.optionsJson); 
             gridCols = Array.isArray(parsedOpts) ? parsedOpts : (parsedOpts.columns || []);
         } catch {}
      }
      if (!gridCols || gridCols.length === 0) {
         if (Array.isArray(gridData) && gridData.length > 0) {
            gridCols = Object.keys(gridData[0]).map(k => ({ dataField: k, caption: k }));
         } else {
            gridCols = [];
         }
      }

      if (Array.isArray(gridData) && gridData.length > 0 && gridData[0].hasOwnProperty('_fixedRow')) {
         if (!gridCols.find((c: any) => c.dataField === '_fixedRow')) {
            gridCols.unshift({ dataField: '_fixedRow', caption: f.label || 'Kriter / Satır Bilgisi' });
         }
      }

      if (Array.isArray(gridData)) {
        const numberCols = gridCols.filter((c: any) => c.editorType === 'number' || c.dataType === 'number');
        const hasSummary = numberCols.length > 0;

        return (
          <div key={`grid-${i}`} className="col-span-full group mt-2 mb-4">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-gray">
              {f.label || f.fieldKey}
            </span>
            <div className="w-full overflow-x-auto rounded-xl border border-surface-muted bg-white shadow-soft">
              <table className="w-full text-sm text-left">
                <thead className="border-b border-surface-muted bg-surface-ground text-xs uppercase text-brand-gray">
                  <tr>
                    <th className="px-4 py-3 w-12 text-center">#</th>
                    {gridCols.map((c: any) => (
                      <th key={c.dataField} className="px-4 py-3 font-semibold">{c.caption || c.label || c.dataField}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-muted">
                  {gridData.length === 0 ? (
                    <tr>
                      <td colSpan={gridCols.length + 1} className="px-4 py-6 text-center text-brand-gray italic">
                        Bu tabloya henüz bir veri eklenmemiş.
                      </td>
                    </tr>
                  ) : gridData.map((row: any, rIdx: number) => (
                    <tr key={rIdx} className="hover:bg-brand-primary/5 transition-colors">
                      <td className="px-4 py-3 text-center font-bold text-brand-gray/50">{rIdx + 1}</td>
                      {gridCols.map((c: any) => {
                          let val = row[c.dataField];
                          if (val === true) val = "Evet";
                          if (val === false) val = "Hayır";
                          if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val)) {
                            try {
                              const d = new Date(val);
                              if (!isNaN(d.getTime())) {
                                val = d.toLocaleDateString('tr-TR') + (c.editorType === 'datetime' ? ' ' + d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '');
                              }
                            } catch (e) {}
                          }
                          return (
                            <td key={c.dataField} className="px-4 py-3 text-brand-dark font-medium">{val ?? '-'}</td>
                          );
                      })}
                    </tr>
                  ))}
                </tbody>
                {hasSummary && gridData.length > 0 && (
                  <tfoot className="bg-surface-hover border-t-2 border-surface-muted">
                    <tr>
                      <td className="px-4 py-3 text-center font-bold text-brand-dark">Sonuçlar</td>
                      {gridCols.map((c: any) => {
                        if (c.editorType === 'number' || c.dataType === 'number') {
                          let sum = 0;
                          let count = 0;
                          gridData.forEach((row: any) => {
                            const num = parseFloat(row[c.dataField]);
                            if (!isNaN(num)) {
                              sum += num;
                              count++;
                            }
                          });
                          const avg = count > 0 ? (sum / count).toFixed(2) : '0';
                          return (
                            <td key={`sum_${c.dataField}`} className="px-4 py-3 text-brand-dark text-xs font-bold whitespace-nowrap">
                              Top: {sum} <br /> Ort: {avg.endsWith('.00') ? Math.round(sum/count) : avg}
                            </td>
                          );
                        }
                        return <td key={`empty_${c.dataField}`}></td>;
                      })}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        );
      }
    }

    if (f.fieldType === 13) {
       return (
        <div key={`static-${i}`} className="col-span-full group my-2">
          <div className="prose prose-sm max-w-none rounded-xl border border-surface-muted/70 bg-white p-4 text-brand-dark shadow-soft" dangerouslySetInnerHTML={{__html: f.label || f.valueText || ''}} />
        </div>
       );
    }

    if (f.fieldType === 10 && f.valueText) {
      const isImage = f.valueText.match(/\.(jpeg|jpg|gif|png)$/i) != null;
      const isPdf = f.valueText.match(/\.(pdf)$/i) != null;
      const fileName = f.valueText.split('/').pop() || 'Dosya';
      const apiBase = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : '';
      const fullUrl = f.valueText.startsWith('http') ? f.valueText : `${apiBase}${f.valueText.startsWith('/') ? '' : '/'}${f.valueText}`;
      
      return (
        <div key={`file-${i}`} className="group col-span-full md:col-span-1">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-gray">
            {f.label || f.fieldKey}
          </span>
          <div className="flex items-center gap-3 rounded-xl border border-orange-100 bg-orange-50/45 p-3 transition-colors hover:border-brand-primary/40">
             <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-brand-primary shadow-soft">
               <FileText className="h-5 w-5" />
             </div>
             <div className="flex-1 min-w-0">
                <a href={fullUrl} target="_blank" rel="noreferrer" className="text-sm font-bold text-brand-dark hover:text-brand-primary truncate block transition-colors" title="Dosyayı Görüntüle / İndir">
                  {fileName}
                </a>
                <span className="text-xs text-brand-gray uppercase">{isImage ? 'Resim' : isPdf ? 'PDF Belgesi' : 'Belge'}</span>
             </div>
          </div>
        </div>
      );
    }

    if (f.fieldType === 3) {
       const isChecked = f.valueBool === true || f.valueText === 'true';
       return (
         <div key={`field-${i}`} className="group">
           <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-gray">
             {f.label || f.fieldKey}
           </span>
           <div className={`flex h-7 w-7 items-center justify-center rounded-lg border shadow-soft transition-colors ${isChecked ? 'bg-brand-primary border-brand-primary text-white' : 'bg-white border-surface-muted text-transparent'}`}>
             <Check className="w-4 h-4 stroke-[3]" />
           </div>
         </div>
       );
    }

    let finalVal = formatFieldValue(f.valueText);
    if (f.valueText === 'true' || f.valueText === 'false') {
       finalVal = f.valueText === 'true' ? 'Evet' : 'Hayır';
    } else if (typeof f.valueNumber === 'number') {
       finalVal = String(f.valueNumber);
    }

    return (
      <div key={`field-${i}`} className="group">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-gray">
          {f.label || f.fieldKey}
        </span>
        <div className="min-h-[52px] rounded-xl border border-surface-muted bg-white px-4 py-3 text-base font-semibold text-brand-dark shadow-soft break-words">
           {finalVal || <span className="text-brand-gray/50 italic">Belirtilmedi</span>}
        </div>
      </div>
    );
  };

  return (
    <PageContainer maxWidth="full" className="pb-10">
      <section className="relative overflow-hidden rounded-2xl border border-orange-100/80 bg-[linear-gradient(135deg,#ffffff_0%,#fff8f3_48%,#f7f8fa_100%)] p-6 shadow-[0_22px_70px_rgba(24,24,27,0.08)]">
        <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-orange-100/70 blur-3xl" />
        <div className="relative flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
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
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-soft', statusMeta.tone)}>
              <span className={cn('h-2 w-2 rounded-full', statusMeta.dot)} />
              {statusMeta.label}
            </span>
            <span className="inline-flex items-center rounded-full border border-surface-muted bg-white/80 px-3 py-1.5 text-xs font-semibold text-brand-gray shadow-soft">
              {workflowItems.length || 0} akış adımı
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 xl:justify-end">
          {data && data.status >= 2 && (
            <FfButton 
              variant="outline" 
              leftIcon={<Printer className="h-4 w-4" />}
              onClick={() => handlePrint()}
              className="bg-surface-base hover:bg-surface-muted"
            >
              PDF İndir / Yazdır
            </FfButton>
          )}
          {(data.status === 1 || data.status === 7) && data.formTypeCode && (
            <>
              <FfButton 
                variant="outline" 
                leftIcon={<FastForward className="h-4 w-4" />}
                onClick={() => { setIsApprovalReassign(false); setIsReassignModalOpen(true); }}
                className="bg-surface-base hover:bg-surface-muted"
              >
                Başka Birine Yönlendir
              </FfButton>
              <FfButton 
                variant="primary" 
                leftIcon={<Edit className="h-4 w-4" />}
                onClick={() => navigate(`/forms/d/${data.formTypeCode}?draftId=${data.requestId}`)}
              >
                Düzenlemeye Devam Et
              </FfButton>
            </>
          )}
          {(data.status === 2 || data.status === 3) && data.requestorUserId === user?.id && (
            <FfButton 
              variant="danger" 
              leftIcon={<XCircle className="h-4 w-4" />}
              onClick={() => openModal(4)}
            >
              Formu İptal Et
            </FfButton>
          )}
        </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(380px,0.75fr)]">
        <div className="space-y-6">
          <GlassCard noPadding className="overflow-hidden border-surface-muted/80 bg-white p-6 shadow-[0_18px_55px_rgba(24,24,27,0.07)]">
            <h3 className="mb-6 flex items-center gap-3 border-b border-surface-muted pb-4 text-base font-bold text-brand-dark">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-brand-primary">
                <FileText className="h-4 w-4" />
              </span>
              Form İçeriği
            </h3>
            {template && template.sections && template.sections.length > 0 ? (
              template.sections.map((section: any, sIdx: number) => {
                const sectionFields = section.fields
                  .map((sf: any) => data.values.find((v: any) => v.fieldKey === sf.dataField))
                  .filter(Boolean);
                if (sectionFields.length === 0) return null;
                return (
                  <section key={section.id || sIdx} className="col-span-full mb-4 rounded-2xl border border-surface-muted/80 bg-surface-ground/35 p-4 last:mb-0">
                    <h4 className="mb-4 flex items-center gap-2 border-b border-surface-muted pb-3 text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
                      {section.title}
                    </h4>
                    <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
                      {sectionFields.map((f: any, i: number) => renderField(f, `${sIdx}-${i}`))}
                    </div>
                  </section>
                );
              })
            ) : (
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
                {data.values && data.values.length > 0 ? (
                  data.values.map((f: any, i: number) => renderField(f, i))
                ) : (
                  <div className="col-span-full py-8 text-center text-sm font-medium text-brand-gray bg-surface-muted/20 rounded-lg border border-dashed border-brand-gray/30">
                    Bu forma ait girilmiş bir veri bulunmuyor.
                  </div>
                )}
              </div>
            )}
          </GlassCard>
        </div>

        <div className="space-y-6">
          <GlassCard noPadding className="sticky top-6 overflow-hidden border-surface-muted/80 bg-white shadow-[0_18px_55px_rgba(24,24,27,0.07)]">
            <h3 className="mb-0 flex items-center justify-between border-b border-surface-muted bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_100%)] px-6 py-5 text-sm font-bold text-brand-dark">
              Durum Bilgileri
              <span className="rounded-full border border-surface-muted bg-white px-3 py-1 text-xs font-semibold text-brand-gray">
                {workflowProgress}%
              </span>
            </h3>
            <div className="border-b border-surface-muted bg-[linear-gradient(135deg,#fffaf6_0%,#ffffff_72%,#f8fafc_100%)] px-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-primary">Süreç özeti</div>
                  <div className="mt-1 text-sm font-extrabold text-brand-dark">{statusMeta.label}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-surface-muted bg-white px-3 py-1.5 text-xs font-semibold text-brand-dark shadow-soft">
                    {completedWorkflowCount}/{workflowItems.length || 0} adım
                  </span>
                  <span className="rounded-full border border-surface-muted bg-white px-3 py-1.5 text-xs font-semibold text-brand-gray shadow-soft">
                    {remainingWorkflowCount} kalan
                  </span>
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white shadow-inner">
                <div className="h-full rounded-full bg-gradient-to-r from-brand-primary via-amber-300 to-emerald-400 transition-all duration-700 ease-out" style={{ width: `${Math.max(6, workflowProgress)}%` }} />
              </div>
            </div>

            {activeApproval && (
              <div className="border-b border-orange-100/80 bg-[#fffdfa] px-5 py-4">
                <div className="relative overflow-hidden rounded-[22px] border border-orange-200/90 bg-[linear-gradient(135deg,#fff8f2_0%,#ffffff_58%,#f7fbfa_100%)] p-4 shadow-[0_18px_45px_-32px_rgba(245,115,43,0.55)]">
                  <div className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-orange-100/70 blur-2xl" />
                  <div className="relative flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-orange-100 bg-white text-brand-primary shadow-sm">
                      <ShieldCheck className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-brand-primary">Kararınız bekleniyor</div>
                          <h4 className="mt-1 text-sm font-extrabold text-brand-dark">Size atanmış onay işlemi</h4>
                        </div>
                        <span className="max-w-full truncate rounded-full border border-orange-100 bg-white px-2.5 py-1 text-[10px] font-bold text-[#8b5b42] shadow-sm">
                          {currentWorkflow?.step || 'Aktif onay adımı'}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[11px] font-medium leading-4 text-brand-gray">
                        Talebi inceleyerek mevcut onay adımı için kararınızı tamamlayın.
                      </p>
                    </div>
                  </div>

                  {message && (
                    <div className="relative mt-3 flex items-center gap-2 rounded-xl border border-status-info/20 bg-status-info/5 px-3 py-2 text-status-info">
                      <Info className="h-4 w-4 shrink-0" />
                      <span className="text-xs font-semibold">{message}</span>
                    </div>
                  )}

                  <div className="relative mt-4 grid grid-cols-3 gap-2">
                    <FfButton
                      variant="primary"
                      size="lg"
                      className="col-span-3 h-11 justify-center rounded-xl bg-[linear-gradient(135deg,#ff7a3d,#f36c2f)] text-sm font-bold shadow-[0_12px_24px_-14px_rgba(245,115,43,0.85)] hover:-translate-y-0.5 hover:bg-[linear-gradient(135deg,#ff854d,#eb6428)]"
                      leftIcon={<Check className="h-4 w-4" />}
                      onClick={() => openModal(1)}
                      disabled={approvalMutation.isPending}
                    >
                      Talebi Onayla
                    </FfButton>
                    <FfButton
                      variant="outline"
                      className="h-10 min-w-0 justify-center rounded-xl border-red-200 bg-white px-2 text-xs text-status-danger hover:border-red-300 hover:bg-red-50"
                      leftIcon={<X className="h-4 w-4" />}
                      onClick={() => openModal(2)}
                      disabled={approvalMutation.isPending}
                    >
                      Reddet
                    </FfButton>
                    <FfButton
                      variant="outline"
                      className="h-10 min-w-0 justify-center rounded-xl border-surface-muted bg-white px-2 text-xs hover:border-orange-200 hover:bg-orange-50/50"
                      leftIcon={<CornerUpLeft className="h-4 w-4" />}
                      onClick={() => openModal(3)}
                      disabled={approvalMutation.isPending}
                    >
                      İade Et
                    </FfButton>
                    <FfButton
                      variant="outline"
                      className="h-10 min-w-0 justify-center rounded-xl border-surface-muted bg-white px-2 text-xs hover:border-orange-200 hover:bg-orange-50/50"
                      leftIcon={<FastForward className="h-4 w-4" />}
                      onClick={() => { setIsApprovalReassign(true); setIsReassignModalOpen(true); }}
                      disabled={approvalMutation.isPending}
                    >
                      Yönlendir
                    </FfButton>
                  </div>
                </div>
              </div>
            )}
            
            <div className={cn(
              'overflow-y-auto px-6 py-5',
              activeApproval ? 'max-h-[calc(100vh-500px)] min-h-[220px]' : 'max-h-[calc(100vh-210px)]'
            )}>
              <div className="mb-4 flex items-center justify-between">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-gray">Adım geçmişi</div>
                <div className="text-[11px] font-semibold text-brand-gray">{currentWorkflow?.step || 'Akış bekleniyor'}</div>
              </div>
              <div className="relative space-y-5 pl-6">
                {data.workflow?.map((w: any, idx: number) => {
                  const meta = workflowStatusMeta(w.status);
                  let statusColor = meta.tone;
                  let bgIcon = 'bg-surface-base';
                  let Icon = meta.icon;
                  let statusText = 'İşlem Sırada';
                  
                  let stepName = w.step;
                  if (stepName.startsWith('Eski Adım')) {
                     stepName = stepName.replace('Eski Adım', 'Önceki İşlem');
                     statusColor = 'border-surface-muted bg-surface-ground text-brand-gray/50';
                  }

                  if (w.status === 'Approved') {
                    statusColor = 'border-emerald-100 bg-emerald-50 text-status-success';
                    Icon = CheckCircle;
                    statusText = 'Onaylandı / Tamamlandı';
                  } else if (w.status === 'Submitted') {
                    statusColor = 'border-surface-muted bg-white text-brand-dark';
                    bgIcon = 'bg-surface-muted';
                    Icon = FileText;
                    statusText = 'Form Gönderildi';
                  } else if (w.status === 'Future') {
                    statusColor = 'border-surface-muted bg-surface-ground text-brand-gray/60';
                    bgIcon = 'bg-surface-muted/30';
                    Icon = Clock;
                    statusText = 'Sırada Bekliyor';
                  } else if (w.status === 'Revised') {
                    statusColor = 'border-orange-100 bg-orange-50 text-brand-primary font-bold';
                    bgIcon = 'bg-brand-primary/10';
                    Icon = Edit;
                    statusText = 'Form Revize Edildi';
                  } else if (w.status === 'Pending') {
                    statusColor = 'border-orange-100 bg-orange-50 text-brand-primary';
                    bgIcon = 'bg-brand-primary/10';
                    statusText = 'Onay Bekliyor';
                  } else if (w.status === 'Rejected') {
                    statusColor = 'border-red-100 bg-red-50 text-status-danger font-bold';
                    Icon = XCircle;
                    statusText = 'Reddedildi';
                  } else if (w.status === 'ReturnedForRevision') {
                    statusColor = 'border-amber-100 bg-amber-50 text-status-warning';
                    Icon = CornerUpLeft;
                    statusText = 'İade Edildi';
                  } else if (w.status === 'Skipped') {
                    statusColor = 'border-surface-muted bg-white text-brand-gray';
                    bgIcon = 'bg-surface-base';
                    Icon = FastForward;
                    statusText = 'Atlandı';
                  }
                  const isActiveStep = idx === currentWorkflowIndex;

                  return (
                    <div key={idx} className={`relative ${w.status === 'Future' ? 'opacity-60' : ''}`}>
                      {idx < workflowItems.length - 1 && (
                        <span className={cn(
                          'absolute -left-[21px] top-12 h-[calc(100%+20px)] w-px rounded-full',
                          idx < completedWorkflowCount ? 'bg-gradient-to-b from-status-success to-status-success/20' : 'bg-surface-muted',
                          isActiveStep && 'bg-gradient-to-b from-brand-primary via-amber-300 to-transparent animate-pulse'
                        )} />
                      )}
                      <div className={`absolute -left-[36px] top-4 flex h-8 w-8 items-center justify-center rounded-full ${bgIcon} border ${statusColor} shadow-soft`}>
                        {isActiveStep && w.status === 'Pending' && <span className="absolute inset-0 animate-ping rounded-full border border-brand-primary/50" />}
                        <Icon className="h-3 w-3" />
                      </div>
                      <div className={cn(
                        'mb-4 rounded-2xl border bg-white p-4 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
                        isActiveStep ? 'border-orange-200 shadow-[0_18px_42px_rgba(255,112,67,0.13)]' : 'border-surface-muted/80'
                      )}>
                        {isActiveStep && (
                          <div className="mb-3 h-1 overflow-hidden rounded-full bg-orange-50">
                            <span className="ff-workflow-scan block h-full w-2/5 rounded-full bg-gradient-to-r from-transparent via-brand-primary to-transparent" />
                          </div>
                        )}
                        <div className="flex items-start justify-between gap-3">
                          <h4 className={`text-sm font-extrabold ${w.status === 'Future' ? 'text-brand-gray/80' : 'text-brand-dark'}`}>{stepName}</h4>
                          {isActiveStep && (
                            <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-brand-primary">
                              aktif
                            </span>
                          )}
                        </div>
                        <div className={`mb-2 mt-2 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusColor}`}>{statusText}</div>
                        <div className="text-xs text-brand-gray mt-1">
                          Sorumlu: <span className="font-semibold text-brand-dark">{w.actor}</span>
                        </div>
                        {w.date && (
                          <div className="text-xs text-brand-gray mt-0.5">
                            Tarih: <span className="font-medium">{new Date(w.date).toLocaleString('tr-TR')}</span>
                          </div>
                        )}
                        {w.comment && (
                          <div className="mt-3 rounded-xl border border-orange-100 bg-orange-50/45 p-3 text-xs italic text-brand-dark">
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

          </GlassCard>
        </div>
      </div>
      
      {/* Action Modal with React Portal */}
      {modalState.isOpen && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#0f172a]/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-base rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className={`px-6 py-4 border-b flex items-center gap-3 ${
              modalState.actionType === 1 ? 'bg-status-success/5 border-status-success/20' :
              modalState.actionType === 2 || modalState.actionType === 4 ? 'bg-status-danger/5 border-status-danger/20' :
              'bg-status-warning/5 border-status-warning/20'
            }`}>
              <div className={`p-2 rounded-full ${
                modalState.actionType === 1 ? 'bg-status-success/20 text-status-success' :
                modalState.actionType === 2 || modalState.actionType === 4 ? 'bg-status-danger/20 text-status-danger' :
                'bg-status-warning/20 text-status-warning'
              }`}>
                {modalState.actionType === 1 && <Check className="h-5 w-5" />}
                {modalState.actionType === 2 && <X className="h-5 w-5" />}
                {modalState.actionType === 3 && <CornerUpLeft className="h-5 w-5" />}
                {modalState.actionType === 4 && <XCircle className="h-5 w-5" />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-brand-dark">
                  {modalState.actionType === 1 ? 'Onayla' : modalState.actionType === 2 ? 'Reddet' : modalState.actionType === 4 ? 'İptal Et' : 'İade Et'}
                </h3>
                <p className="text-xs text-brand-gray">{data.requestNo} numaralı talep</p>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-brand-dark flex items-center gap-1.5">
                  Yorum / Açıklama
                  {modalState.actionType === 1 || modalState.actionType === 4 ? (
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
                disabled={approvalMutation.isPending || cancelMutation.isPending}
              >
                Vazgeç
              </FfButton>
              <FfButton 
                variant={modalState.actionType === 1 ? 'primary' : modalState.actionType === 2 || modalState.actionType === 4 ? 'danger' : 'secondary'}
                onClick={handleAction}
                disabled={!isCommentValid() || approvalMutation.isPending || cancelMutation.isPending}
                isLoading={approvalMutation.isPending || cancelMutation.isPending}
              >
                {approvalMutation.isPending || cancelMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
              </FfButton>
            </div>
          </div>
        </div>,
        document.body
      )}

      {isReassignModalOpen && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#0f172a]/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-base rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="px-6 py-4 border-b flex items-center gap-3 bg-brand-primary/5 border-brand-primary/20">
              <div className="p-2 rounded-full bg-brand-primary/20 text-brand-primary">
                <FastForward className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-brand-dark">Başka Birine Yönlendir</h3>
                <p className="text-xs text-brand-gray">{data.requestNo} numaralı talep</p>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {reassignMessage ? (
                <div className={`p-4 rounded-lg flex items-center gap-2 ${reassignMessage.includes('başarı') ? 'bg-status-success/10 text-status-success' : 'bg-status-danger/10 text-status-danger'}`}>
                  {reassignMessage.includes('başarı') ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                  <span className="font-medium text-sm">{reassignMessage}</span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-brand-dark">Devredilecek Kullanıcı</label>
                  <SelectBox
                    items={usersList || []}
                    valueExpr="id"
                    displayExpr="name"
                    value={selectedReassignUserId}
                    onValueChanged={(e) => setSelectedReassignUserId(e.value)}
                    placeholder="Lütfen Bir Kişi Seçin"
                    searchEnabled={true}
                    width="100%"
                    height={40}
                    stylingMode="outlined"
                    dropDownOptions={{ zIndex: 99999 } as any}
                    className="border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand-primary/20 focus-within:border-brand-primary transition-all"
                  />
                </div>
              )}
            </div>

            {!reassignMessage && (
              <div className="px-6 py-4 bg-surface-muted/50 border-t flex justify-end gap-3">
                <FfButton variant="outline" onClick={closeReassignModal}>Vazgeç</FfButton>
                <FfButton variant="primary" onClick={handleReassign} disabled={!selectedReassignUserId}>Devret</FfButton>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Hidden Print Container */}
      <div className="hidden">
        <PrintableFormDetail ref={printRef} data={data} template={template} />
      </div>

    </PageContainer>
  );
};
