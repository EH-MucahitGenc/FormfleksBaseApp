import React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm, FormProvider } from 'react-hook-form';
import { Send, ArrowLeft, Save } from 'lucide-react';

import { notify } from '@/lib/notifications';
import { formService } from '@/services/form.service';

import { PageHeader, FfButton } from '@/components/ui/index';
import { FfSkeletonLoader } from '@/components/shared/FfSkeletonLoader';
import { FfEmptyState } from '@/components/shared/FfEmptyState';
import { 
  FfTextField, 
  FfTimeBox,
  FfDateTimeBox,
  FfDateBox,
  FormSection 
} from '@/components/dev-extreme/FfFormLayout';
import {
  FfSelectBox,
  FfField
} from '@/components/dev-extreme/index';
import NumberBox from 'devextreme-react/number-box';
import { dynamicFormService, type DynamicFieldSchema } from '@/services/dynamic-form.service';

export const DynamicFormViewer: React.FC = () => {
  const { formCode } = useParams<{ formCode: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const draftIdParam = searchParams.get('draftId');
  const [activeDraftId, setActiveDraftId] = React.useState<string | null>(draftIdParam);

  const { data: template, isLoading, isError } = useQuery({
    queryKey: ['dynamic-form-schema', formCode],
    queryFn: () => dynamicFormService.getTemplateByCode(formCode || ''),
    enabled: !!formCode,
  });

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
      await dynamicFormService.submitDraft(res.requestId);
    },
    onSuccess: () => {
      notify.success("Talebiniz başarıyla onay döngüsüne gönderildi!");
      navigate('/forms');
    }
  });

  const draftMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (!template?.id) throw new Error("Şablon ID bulunamadı");
      return await dynamicFormService.saveDraftFormData(template.id, payload, activeDraftId || undefined);
    },
    onSuccess: (res) => {
      setActiveDraftId(res.requestId);
      notify.success("Form başarıyla taslak olarak kaydedildi!");
    }
  });

  const onSubmit = () => {
    onSendRequest();
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
      notify.error("Taslak olarak kaydediliyor, ancak göndermeden önce zorunlu alanları doldurmalısınız.");
    }
    
    // Taslak kaydedilirken formun o anki verilerini al (validasyon bloğuna takılmadan)
    const data = getValues();
    draftMutation.mutate(data);
  };

  // Maps a dynamic schema field to the corresponding standard Formfleks wrapper
  const renderField = (field: DynamicFieldSchema) => {
    switch (field.editorType) {
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
          <FfDateBox
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
          <FfDateTimeBox
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

             <div className="pt-6 border-t border-surface-muted mt-4 flex justify-end gap-3">
               <FfButton variant="ghost" onClick={() => navigate(-1)}>İptal Et</FfButton>
               <FfButton 
                 variant="secondary" 
                 leftIcon={<Save className="h-4 w-4" />}
                 onClick={onSaveDraft}
                 isLoading={draftMutation.isPending}
                 disabled={submitMutation.isPending}
               >
                 Taslak Kaydet
               </FfButton>
               <FfButton 
                 variant="primary" 
                 leftIcon={<Send className="h-4 w-4" />}
                 onClick={methods.handleSubmit(onSubmit)}
                 isLoading={submitMutation.isPending}
                 disabled={draftMutation.isPending}
               >
                 Talebi Gönder
               </FfButton>
             </div>
            
          </form>
        </FormProvider>
      </div>
    </div>
  );
};
