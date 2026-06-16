import React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm, FormProvider } from 'react-hook-form';
import { Send, ArrowLeft, Save, Trash2, Loader2, Check, AlertCircle } from 'lucide-react';

import { notify } from '@/lib/notifications';
import { formService } from '@/services/form.service';
import { adminService } from '@/services/admin.service';
import { useDeleteDraft } from '@/features/forms/hooks/useForms';

import { PageHeader, FfButton } from '@/components/ui/index';
import { FfConfirmDialog } from '@/components/ui/FfConfirmDialog';
import { FfModal } from '@/components/ui/FfModal';
import { FfSkeletonLoader } from '@/components/shared/FfSkeletonLoader';
import { FfEmptyState } from '@/components/shared/FfEmptyState';
import { 
  FfTextField, 
  FfTimeBox,
  FfDateTimeBoxRHF,
  FfDateBoxRHF,
  FormSection 
} from '@/components/dev-extreme/FfFormLayout';
import {
  FfSelectBox,
  FfField,
  FfCheckBox
} from '@/components/dev-extreme/index';
import { FfDynamicGridField } from '@/components/dev-extreme/FfDynamicGridField';
import { FfDynamicFileField } from '@/components/dev-extreme/FfDynamicFileField';
import NumberBox from 'devextreme-react/number-box';
import TextArea from 'devextreme-react/text-area';
import { dynamicFormService, type DynamicFieldSchema } from '@/services/dynamic-form.service';

export const DynamicFormViewer: React.FC = () => {
  const { formCode } = useParams<{ formCode: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const draftIdParam = searchParams.get('draftId');
  const [activeDraftId, setActiveDraftId] = React.useState<string | null>(draftIdParam);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  
  // Auto-Save States
  const [autoSaveStatus, setAutoSaveStatus] = React.useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedTime, setLastSavedTime] = React.useState<Date | null>(null);

  // Manual Assignment States
  const [manualAssignments, setManualAssignments] = React.useState<any[]>([]);
  const [manualAssignmentError, setManualAssignmentError] = React.useState<{stepNo: number, stepName: string, message: string} | null>(null);
  const [selectedManagerId, setSelectedManagerId] = React.useState<string | null>(null);

  const { data: adminUsers } = useQuery({
    queryKey: ['admin-users-list'],
    queryFn: () => adminService.getUsers(),
  });

  const { data: template, isLoading, isError } = useQuery({
    queryKey: ['dynamic-form-schema', formCode],
    queryFn: () => dynamicFormService.getTemplateByCode(formCode || ''),
    enabled: !!formCode,
  });

  const deleteDraftMutation = useDeleteDraft();

  const { data: draftData, isError: isDraftError } = useQuery({
    queryKey: ['draft-detail', activeDraftId],
    queryFn: () => formService.getRequestDetailed(activeDraftId!),
    enabled: !!activeDraftId,
  });

  const methods = useForm<any>({
    defaultValues: {} // Populated via useEffect
  });
  const { getValues, trigger, control } = methods;

  React.useEffect(() => {
    if (draftData && draftData.values) {
      const dv: any = {};
      draftData.values.forEach((v: any) => {
        let val = null;
        if (v.valueText !== null && v.valueText !== undefined && v.valueText !== "") {
          val = v.valueText;
          // Clean excessive double quotes from JSON stringify
          if (typeof val === 'string' && val.startsWith('"') && val.endsWith('"') && val.length > 2) {
            val = val.slice(1, -1);
          }
        }
        else if (v.valueNumber !== null && v.valueNumber !== undefined) {
          val = v.valueNumber;
        }
        else if (v.valueBool !== null && v.valueBool !== undefined) {
          val = v.valueBool;
        }
        else if (v.valueDateTime !== null && v.valueDateTime !== undefined) {
          val = v.valueDateTime;
        }

        // Fix boolean values stored as strings in older drafts
        if (v.fieldType === 3) {
          if (val === 'true') val = true;
          else if (val === 'false') val = false;
        }

        // Fix decimal strings coming back as "0,000000" or similar
        if (typeof val === 'string' && /^\d+,\d+$/.test(val)) {
          val = parseFloat(val.replace(',', '.'));
        }

        dv[v.fieldKey] = val;
      });
      console.log('✅[Draft Loading] Mapped RHF defaultValues:', dv);
      methods.reset(dv);
    }
  }, [draftData, methods]);

  const submitMutation = useMutation({
    mutationFn: async (targetDraftId: string) => {
      if (!template?.id) throw new Error("Şablon ID bulunamadı");
      // Formun son güncel değerlerini al ve payload olarak kullan
      const payload = methods.getValues();
      const res = await dynamicFormService.saveDraftFormData(template.id, payload, targetDraftId);
      
      // Use latest manualAssignments state by accessing the closure or a ref, but since we recreate useMutation on render, it should be fine.
      // However, to be safe, we'll pass manualAssignments directly
      return await dynamicFormService.submitDraft(res.requestId, manualAssignments);
    },
    onSuccess: () => {
      notify.success("Talebiniz başarıyla onay döngüsüne gönderildi!");
      navigate('/forms');
    },
    onError: (err: any) => {
      if (err.response?.data?.detail) {
        try {
          const parsed = JSON.parse(err.response.data.detail);
          if (parsed.ErrorCode === 'REQUIRES_MANUAL_ASSIGNMENT') {
             setManualAssignmentError({
                stepNo: parsed.StepNo,
                stepName: parsed.StepName,
                message: parsed.Message
             });
             return;
          }
        } catch {
          // not json
        }
      }
      notify.error("Gönderim sırasında bir hata oluştu: " + (err.response?.data?.detail || err.message));
    }
  });

  const draftMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (!template?.id) throw new Error("Şablon ID bulunamadı");
      return await dynamicFormService.saveDraftFormData(template.id, payload, activeDraftId || undefined);
    },
    onSuccess: (res) => {
      if (!activeDraftId) {
        setActiveDraftId(res.requestId);
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('draftId', res.requestId);
        window.history.replaceState({}, '', newUrl);
      }
      notify.success("Form başarıyla taslak olarak kaydedildi!");
    }
  });

  const autoSaveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (!template?.id) throw new Error("Şablon ID bulunamadı");
      return await dynamicFormService.saveDraftFormData(template.id, payload, activeDraftId || undefined);
    },
    onSuccess: (res) => {
      if (!activeDraftId) {
        setActiveDraftId(res.requestId);
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('draftId', res.requestId);
        window.history.replaceState({}, '', newUrl);
      }
      setAutoSaveStatus('saved');
      setLastSavedTime(new Date());
    },
    onError: () => {
      setAutoSaveStatus('error');
    }
  });

  React.useEffect(() => {
    if (!template?.id) return;
    
    // Yalnızca form tamamen yüklendikten ve default değerler oturduktan sonra dinlemeye başla
    if (isLoading || isDraftError) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const subscription = methods.watch((_value, { type }) => {
      if (type === 'change') {
        setAutoSaveStatus('idle');
        clearTimeout(timeoutId);
        
        timeoutId = setTimeout(() => {
          setAutoSaveStatus('saving');
          const currentData = methods.getValues();
          autoSaveMutation.mutate(currentData);
        }, 2000); // Kullanıcı yazmayı bıraktıktan 2 saniye sonra otomatik kaydet
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [methods, template?.id, activeDraftId, isLoading, isDraftError]);

  const onSubmit = () => {
    onSendRequest();
  };

  const handleManualAssignmentSubmit = () => {
    if (manualAssignmentError) {
      const newAssignment = {
        stepNo: manualAssignmentError.stepNo,
        assigneeUserId: selectedManagerId || null
      };
      
      // We must use functional state update and then trigger submit in useEffect or timeout to ensure the state is fresh
      setManualAssignments(prev => {
        const next = [...prev.filter(x => x.stepNo !== newAssignment.stepNo), newAssignment];
        return next;
      });
      
      setManualAssignmentError(null);
      setSelectedManagerId(null);
      
      setTimeout(() => {
        onSendRequest();
      }, 50);
    }
  };

  const onSendRequest = async () => {
    let targetDraftId = activeDraftId;
    if (!targetDraftId) {
      const isValid = await methods.trigger();
      if (!isValid) {
        notify.error('Lütfen zorunlu alanları doldurunuz.');
        return;
      }
      const values = methods.getValues();
      try {
        // Ensure template.id is available before calling saveDraftFormData
        if (!template?.id) {
          notify.error("Form şablonu bulunamadı.");
          return;
        }
        const response = await dynamicFormService.saveDraftFormData(template.id, values, activeDraftId || undefined);
        targetDraftId = response.requestId;
        setActiveDraftId(targetDraftId);
        notify.success('Formunuz taslak olarak başarıyla kaydedildi.');
      } catch (err) {
        notify.error('Taslak kaydedilirken bir hata oluştu.');
        return;
      }
    }
    if (targetDraftId) {
      submitMutation.mutate(targetDraftId);
    }
  };

  const onSaveDraft = async () => {
    // Eksik alanları kırmızı renkle ekranda belirtmek için trigger'ı çağırıyoruz.
    const isValid = await trigger();
    if (!isValid) {
      notify.error("Taslak olarak kaydetmeden veya göndermeden önce zorunlu alanları doldurmalısınız.");
      return; // Do not save draft if not valid
    }
    
    // Taslak kaydedilirken formun o anki verilerini al
    const data = getValues();
    draftMutation.mutate(data);
  };

  // Maps a dynamic schema field to the corresponding standard Formfleks wrapper
  const renderField = (field: DynamicFieldSchema) => {
    switch (field.editorType) {
      case 'grid':
        return (
          <FfDynamicGridField
            key={field.dataField}
            name={field.dataField}
            label={field.label}
            required={field.isRequired}
            columnsSchema={field.gridColumns || []}
            className={field.colSpan === 2 ? 'col-span-full' : ''}
          />
        );
      case 'file':
        return (
          <FfField
            key={field.dataField}
            control={control}
            name={field.dataField}
            component={FfDynamicFileField as any}
            label={field.label}
            componentProps={{
              isRequired: field.isRequired,
              fieldKey: field.dataField,
              optionsJson: field.optionsJson
            }}
            className={field.colSpan === 2 ? 'col-span-full' : ''}
          />
        );
      case 'select':
        return (
          <FfField
            key={field.dataField}
            control={control}
            component={FfSelectBox}
            name={field.dataField}
            label={field.label}
            componentProps={{
              required: field.isRequired,
              dataSource: field.lookupData || [],
              displayExpr: "name",
              valueExpr: "id"
            }}
            className={field.colSpan === 2 ? 'col-span-full' : ''}
          />
        );
      case 'date':
        return (
          <FfDateBoxRHF
            key={field.dataField}
            name={field.dataField}
            label={field.label}
            required={field.isRequired}
            className={field.colSpan === 2 ? 'col-span-full' : ''}
          />
        );
      case 'time':
        return (
          <FfTimeBox
            key={field.dataField}
            name={field.dataField}
            label={field.label}
            required={field.isRequired}
            className={field.colSpan === 2 ? 'col-span-full' : ''}
          />
        );
      case 'datetime':
        return (
          <FfDateTimeBoxRHF
            key={field.dataField}
            name={field.dataField}
            label={field.label}
            required={field.isRequired}
            className={field.colSpan === 2 ? 'col-span-full' : ''}
          />
        );
      case 'number':
        return (
          <FfField
            key={field.dataField}
            control={control}
            component={NumberBox as any}
            name={field.dataField}
            label={field.label}
            componentProps={{
              required: field.isRequired,
              stylingMode: "outlined"
            }}
            className={field.colSpan === 2 ? 'col-span-full' : ''}
          />
        );
      case 'boolean':
        return (
          <FfField
            key={field.dataField}
            control={control}
            component={FfCheckBox}
            name={field.dataField}
            label={field.label}
            className={field.colSpan === 2 ? 'col-span-full' : ''}
          />
        );
      case 'textarea':
        return (
          <FfField
            key={field.dataField}
            control={control}
            component={TextArea as any}
            name={field.dataField}
            label={field.label}
            componentProps={{
              required: field.isRequired,
              stylingMode: "outlined",
              minHeight: 100
            }}
            className={field.colSpan === 2 ? 'col-span-full' : ''}
          />
        );
      case 'text':
      default:
        return (
          <FfTextField
            key={field.dataField}
            name={field.dataField}
            label={field.label}
            required={field.isRequired}
            className={field.colSpan === 2 ? 'col-span-full' : ''}
          />
        );
    }
  };

  if (!formCode) {
    return <FfEmptyState title="Kayıp Parametre" description="Geçerli bir form kodu bulunamadı." />;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)]">
         <PageHeader title="Yükleniyor..." />
         <div className="bg-surface-base p-6 rounded-xl border border-surface-muted mt-4">
            <FfSkeletonLoader type="form" />
         </div>
      </div>
    );
  }

  if (isError || !template || isDraftError) {
    return <FfEmptyState title="Form Bulunamadı" description="Bu form silinmiş veya erişim yetkiniz bulunmuyor olabilir. URL'yi kontrol ediniz." />;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] w-full">
      <div className="mb-4">
        <FfButton variant="ghost" className="mb-2 -ml-3" leftIcon={<ArrowLeft className="h-4 w-4"/>} onClick={() => navigate(-1)}>
          Geri
        </FfButton>
        <PageHeader 
          title={template.name} 
          description={template.description || "Lütfen kurallara uygun olarak formu doldurunuz."} 
        />
      </div>

      <div className="flex-1 min-h-0 bg-surface-base rounded-xl shadow-soft border border-surface-muted p-6 md:p-8 overflow-y-auto">
        <FormProvider {...methods}>
          <form className="flex flex-col gap-6" onSubmit={(e) => e.preventDefault()}>
            
            {template.sections.map(section => {
               console.log(`Rendering Section: ${section.title}`, section.fields);
               return (
                 <FormSection key={section.id} title={section.title}>
                   {section.fields?.map(field => renderField(field))}
                 </FormSection>
               );
            })}

             <div className="pt-6 border-t border-surface-muted mt-4 flex items-center justify-between gap-3">
               
               {/* Left Side: Auto-Save Status & Delete Button */}
               <div className="flex items-center gap-4">
                 {activeDraftId && (
                   <FfButton 
                     variant="danger" 
                     leftIcon={<Trash2 className="h-4 w-4" />}
                     onClick={() => setIsDeleteDialogOpen(true)}
                     isLoading={deleteDraftMutation.isPending}
                     disabled={submitMutation.isPending || draftMutation.isPending || autoSaveMutation.isPending}
                   >
                     Taslağı Sil
                   </FfButton>
                 )}
                 
                 <div className="text-sm font-medium">
                   {autoSaveStatus === 'saving' && (
                     <span className="flex items-center gap-2 text-brand-gray"><Loader2 className="h-4 w-4 animate-spin"/> Otomatik kaydediliyor...</span>
                   )}
                   {autoSaveStatus === 'saved' && (
                     <span className="flex items-center gap-2 text-status-success"><Check className="h-4 w-4"/> Taslak kaydedildi ({lastSavedTime?.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })})</span>
                   )}
                   {autoSaveStatus === 'error' && (
                     <span className="flex items-center gap-2 text-status-danger"><AlertCircle className="h-4 w-4"/> Kaydedilemedi</span>
                   )}
                 </div>
               </div>

               {/* Right Side: Actions */}
               <div className="flex items-center gap-3">
                 <FfButton variant="ghost" onClick={() => navigate(-1)}>İptal Et</FfButton>
                 <FfButton 
                   variant="secondary" 
                   leftIcon={<Save className="h-4 w-4" />}
                   onClick={onSaveDraft}
                   isLoading={draftMutation.isPending}
                   disabled={submitMutation.isPending || autoSaveMutation.isPending}
                 >
                   Taslak Kaydet
                 </FfButton>
                 <FfButton 
                   variant="primary" 
                   leftIcon={<Send className="h-4 w-4" />}
                   onClick={methods.handleSubmit(onSubmit)}
                   isLoading={submitMutation.isPending}
                   disabled={draftMutation.isPending || autoSaveMutation.isPending}
                 >
                   Talebi Gönder
                 </FfButton>
               </div>
             </div>
            
          </form>
        </FormProvider>
      </div>

      <FfConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={() => {
          if (activeDraftId) {
            deleteDraftMutation.mutate(activeDraftId, {
              onSuccess: () => {
                setIsDeleteDialogOpen(false);
                navigate('/forms');
              }
            });
          }
        }}
        title="Taslağı Sil"
        message="Bu taslağı silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
        confirmLabel="Evet, Sil"
        variant="danger"
        isLoading={deleteDraftMutation.isPending}
      />

      <FfModal
        isOpen={!!manualAssignmentError}
        onClose={() => setManualAssignmentError(null)}
        title="Yönetici Ataması Gerekiyor"
        size="md"
      >
        <div className="flex flex-col gap-4">
           <div className="bg-amber-50 text-amber-800 p-4 rounded-md border border-amber-200 text-sm">
             <div className="font-semibold mb-1">Onay adımı: {manualAssignmentError?.stepNo}. {manualAssignmentError?.stepName}</div>
             <div>{manualAssignmentError?.message}</div>
             <div className="mt-2 text-xs">Lütfen bu adımın gitmesini istediğiniz kişiyi listeden seçiniz. Boş bırakırsanız adım atlanacaktır.</div>
           </div>
           
           <div className="flex flex-col gap-2">
             <label className="text-sm font-medium text-surface-text">Yönetici / Onaycı Seçin</label>
             <FfSelectBox
                dataSource={adminUsers || []}
                displayExpr="name"
                valueExpr="id"
                value={selectedManagerId}
                onValueChanged={(e: any) => setSelectedManagerId(e.value)}
                searchEnabled={true}
                placeholder="Listeden bir kullanıcı seçiniz..."
             />
           </div>

           <div className="flex justify-end gap-3 mt-4">
             <FfButton variant="ghost" onClick={() => setManualAssignmentError(null)}>İptal</FfButton>
             <FfButton variant="primary" onClick={handleManualAssignmentSubmit} leftIcon={<Check className="w-4 h-4" />}>
               Devam Et
             </FfButton>
           </div>
        </div>
      </FfModal>
    </div>
  );
};
