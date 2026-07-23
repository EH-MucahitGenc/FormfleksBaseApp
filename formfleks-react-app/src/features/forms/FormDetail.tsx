import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import SelectBox from 'devextreme-react/select-box';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { dynamicFormService } from '@/services/dynamic-form.service';
import { PageHeader, PageContainer, GlassCard } from '@/components/ui/index';
import { ArrowLeft, CheckCircle, Clock, FileText, Edit, XCircle, CornerUpLeft, Check, X, Info, Printer, FastForward } from 'lucide-react';
import { FfButton } from '@/components/ui/index';
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
    queryFn: () => dynamicFormService.getTemplateByCode(data!.formTypeCode),
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
    setSelectedReassignUserId('');
    setReassignMessage(null);
  };

  const handleReassign = async () => {
    if (!selectedReassignUserId) return;
    try {
      await formService.reassignRequest(id!, selectedReassignUserId);
      setReassignMessage('Form başarıyla devredildi.');
      queryClient.invalidateQueries({ queryKey: ['form-request', id!] });
      setTimeout(() => {
        closeReassignModal();
        navigate('/forms');
      }, 1500);
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
            <span className="block text-xs font-bold text-brand-gray uppercase tracking-widest mb-2 shadow-sm opacity-80 group-hover:opacity-100 transition-opacity">
              {f.label || f.fieldKey}
            </span>
            <div className="overflow-x-auto w-full rounded-lg border border-surface-muted bg-surface-base shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="bg-surface-hover text-xs uppercase text-brand-gray border-b border-surface-muted">
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
          <div className="prose prose-sm max-w-none text-brand-dark bg-surface-muted/10 p-4 rounded-xl border border-surface-muted/50" dangerouslySetInnerHTML={{__html: f.label || f.valueText || ''}} />
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
          <span className="block text-xs font-bold text-brand-gray uppercase tracking-widest mb-1 shadow-sm opacity-80 group-hover:opacity-100 transition-opacity">
            {f.label || f.fieldKey}
          </span>
          <div className="flex items-center gap-3 bg-surface-muted/30 p-3 rounded-lg border border-surface-muted hover:border-brand-primary/40 transition-colors">
             <div className="h-10 w-10 shrink-0 bg-brand-primary/10 rounded-md flex items-center justify-center text-brand-primary">
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
           <span className="block text-xs font-bold text-brand-gray uppercase tracking-widest mb-2 shadow-sm opacity-80 group-hover:opacity-100 transition-opacity">
             {f.label || f.fieldKey}
           </span>
           <div className={`flex items-center justify-center w-6 h-6 rounded-md border-2 shadow-sm transition-colors ${isChecked ? 'bg-brand-primary border-brand-primary text-white' : 'bg-surface-base border-brand-gray/40 text-transparent'}`}>
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
        <span className="block text-xs font-bold text-brand-gray uppercase tracking-widest mb-1 shadow-sm opacity-80 group-hover:opacity-100 transition-opacity">
          {f.label || f.fieldKey}
        </span>
        <div className="text-base font-semibold text-brand-dark bg-surface-muted/30 p-3 rounded-md border border-brand-gray/10 break-words">
           {finalVal || <span className="text-brand-gray/50 italic">Belirtilmedi</span>}
        </div>
      </div>
    );
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
                onClick={() => setIsReassignModalOpen(true)}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <GlassCard noPadding className="p-6">
            <h3 className="text-lg font-bold text-brand-dark mb-4 pb-3 border-b border-surface-muted flex items-center gap-2">
              <FileText className="h-5 w-5 text-brand-primary" />
              Form İçeriği
            </h3>
            {template && template.sections && template.sections.length > 0 ? (
              template.sections.map((section: any, sIdx: number) => {
                const sectionFields = section.fields
                  .map((sf: any) => data.values.find((v: any) => v.fieldKey === sf.dataField))
                  .filter(Boolean);
                if (sectionFields.length === 0) return null;
                return (
                  <div key={section.id || sIdx} className="col-span-full mb-2">
                    <h4 className="text-md font-bold border-b pb-2 mb-4 text-brand-primary uppercase">{section.title}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      {sectionFields.map((f: any, i: number) => renderField(f, `${sIdx}-${i}`))}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 pt-2">
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
                  } else if (w.status === 'Revised') {
                    statusColor = 'border-brand-primary text-brand-primary font-bold';
                    bgIcon = 'bg-brand-primary/10';
                    Icon = Edit;
                    statusText = 'Form Revize Edildi';
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
                  } else if (w.status === 'Skipped') {
                    statusColor = 'border-surface-muted text-brand-gray';
                    bgIcon = 'bg-surface-base';
                    Icon = FastForward;
                    statusText = 'Atlandı';
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
                    dropDownOptions={{ zIndex: 99999 }}
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
