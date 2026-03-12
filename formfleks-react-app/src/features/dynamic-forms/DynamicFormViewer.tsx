import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm, FormProvider } from 'react-hook-form';
import { Send, ArrowLeft } from 'lucide-react';

import { PageHeader, FfButton } from '@/components/ui/index';
import { FfSkeletonLoader } from '@/components/shared/FfSkeletonLoader';
import { FfEmptyState } from '@/components/shared/FfEmptyState';
import { 
  FfTextField, 
  FfSelectBox, 
  FfDateBox,
  FfTimeBox,
  FfDateTimeBox,
  FfNumberBox,
  FormSection 
} from '@/components/dev-extreme/FfFormLayout';
import { dynamicFormService, type DynamicFieldSchema } from '@/services/dynamic-form.service';

export const DynamicFormViewer: React.FC = () => {
  const { formCode } = useParams<{ formCode: string }>();
  const navigate = useNavigate();

  const { data: template, isLoading, isError } = useQuery({
    queryKey: ['dynamic-form-schema', formCode],
    queryFn: () => dynamicFormService.getTemplateByCode(formCode || ''),
    enabled: !!formCode,
  });

  const methods = useForm({
    defaultValues: {} // This can be dynamically populated if editing an existing record
  });

  const submitMutation = useMutation({
    mutationFn: (payload: any) => dynamicFormService.submitFormData(formCode!, payload),
    onSuccess: () => {
      alert("Form başarıyla gönderildi!");
      navigate('/forms');
    }
  });

  const draftMutation = useMutation({
    mutationFn: (payload: any) => dynamicFormService.saveDraftFormData(formCode!, payload),
    onSuccess: () => {
      alert("Form başarıyla taslak olarak kaydedildi!");
      navigate('/forms');
    }
  });

  const onSubmit = (data: any) => {
    submitMutation.mutate(data);
  };

  const onSaveDraft = () => {
    // Trigger RHF's handleSubmit manually but map to draft mutation
    methods.handleSubmit((data) => draftMutation.mutate(data))();
  };

  // Maps a dynamic schema field to the corresponding standard Formfleks wrapper
  const renderField = (field: DynamicFieldSchema) => {
    switch (field.editorType) {
      case 'select':
        return (
          <FfSelectBox
            key={field.dataField}
            name={field.dataField}
            label={field.label}
            required={field.isRequired}
            className={field.colSpan === 2 ? 'col-span-full' : ''}
            dataSource={field.lookupData || []}
            displayExpr="name"
            valueExpr="id"
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
          <FfNumberBox
            key={field.dataField}
            name={field.dataField}
            label={field.label}
            required={field.isRequired}
            className={field.colSpan === 2 ? 'col-span-full' : ''}
          />
        );
      case 'textarea':
        return (
          <FfTextField
            key={field.dataField}
            name={field.dataField}
            label={field.label}
            required={field.isRequired}
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
         <div className="bg-white p-6 rounded-xl border border-surface-muted mt-4">
            <FfSkeletonLoader type="form" />
         </div>
      </div>
    );
  }

  if (isError || !template) {
    return <FfEmptyState title="Form Bulunamadı" description="Bu form şablonu silinmiş veya erişim yetkiniz bulunmuyor olabilir." />;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-5xl mx-auto w-full">
      <div className="mb-4">
        <FfButton variant="ghost" className="mb-2 -ml-3" leftIcon={<ArrowLeft className="h-4 w-4"/>} onClick={() => navigate(-1)}>
          Geri
        </FfButton>
        <PageHeader 
          title={template.name} 
          description={template.description || "Lütfen kurallara uygun olarak formu doldurunuz."} 
        />
      </div>

      <div className="flex-1 min-h-0 bg-white rounded-xl shadow-soft border border-surface-muted p-6 md:p-8 overflow-y-auto">
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
