import React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm, FormProvider } from 'react-hook-form';
import { Send, ArrowLeft, Save, Trash2, Loader2, Check, FileText } from 'lucide-react';

import { notify } from '@/lib/notifications';
import { formService } from '@/services/form.service';
import { adminService } from '@/services/admin.service';
import { useDeleteDraft } from '@/features/forms/hooks/useForms';

import { PageHeader, FfButton, cn } from '@/components/ui/index';
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
import { integrationsService } from '@/services/integrations.service';
import { useWatch } from 'react-hook-form';

const evaluateFormula = (formula: string, context: Record<string, any>) => {
  if (!formula) return null;
  try {
    const keys = Object.keys(context);
    const values = Object.values(context).map(v => (v === undefined || v === '') ? 0 : v);
    
    // Matematiksel yardımcı fonksiyonlar (Grid'ler için)
    const SUM = (arr: any[], key: string) => Array.isArray(arr) ? arr.reduce((acc, val) => acc + (Number(val[key]) || 0), 0) : 0;
    const AVG = (arr: any[], key: string) => {
        if (!Array.isArray(arr) || arr.length === 0) return 0;
        const total = SUM(arr, key);
        return total / arr.length;
    };

    const fn = new Function('SUM', 'AVG', ...keys, `return ${formula};`);
    const result = fn(SUM, AVG, ...values);
    return isNaN(result) || !isFinite(result) ? null : result;
  } catch (e) {
    return null; // Silent catch for incomplete/invalid formulas
  }
};

const isFillableField = (field: DynamicFieldSchema) =>
  field.editorType !== 'statichtml' && field.editorType !== 'calculation' && !!field.dataField;

const hasMeaningfulValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string') {
    const normalizedValue = value.trim();
    if (!normalizedValue) return false;
    if (normalizedValue === '[]' || normalizedValue === '{}') return false;
    return true;
  }
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  if (typeof File !== 'undefined' && value instanceof File) return value.size > 0;
  if (Array.isArray(value)) return value.some(hasMeaningfulValue);
  if (typeof value === 'object') return Object.values(value).some(hasMeaningfulValue);
  return false;
};

const hasFilledFieldValue = (field: DynamicFieldSchema, value: unknown) => {
  if (field.editorType === 'boolean') return value === true;
  return hasMeaningfulValue(value);
};

const getSectionDomId = (sectionId: string | number | undefined, index: number) => `dynamic-form-section-${sectionId || index}`;

const CalculationField = ({ field, control }: { field: DynamicFieldSchema, control: any }) => {
  const formValues = useWatch({ control });
  const val = evaluateFormula(field.calculationRuleJson || '', formValues);

  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center justify-between text-sm font-bold text-brand-dark">
        <span>{field.label} {field.isRequired && <span className="text-status-danger">*</span>}</span>
        <span className="rounded-full border border-orange-100 bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-brand-primary">Hesaplama</span>
      </label>
      <div className="w-full cursor-not-allowed rounded-2xl border border-surface-muted bg-surface-ground/60 px-4 py-3 font-bold text-brand-dark shadow-soft">
        {val !== null ? val.toLocaleString('tr-TR', { maximumFractionDigits: 2 }) : '-'}
      </div>
    </div>
  );
};

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
    queryFn: () => dynamicFormService.getTemplateByCode(formCode || '', searchParams.get('draftId') || undefined),
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
  const watchedValues = useWatch({ control });

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
          else if (val === null || val === undefined || val === '') val = false; // Prevent indeterminate "filled" state
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

  const handleFieldBlur = async (field: DynamicFieldSchema) => {
    if (!field.autoFillJson) return;

    try {
      const settings = JSON.parse(field.autoFillJson);
      if (!settings.queryId) return;

      const currentValue = methods.getValues(field.dataField);
      if (!currentValue) return;

      // Extract parameters from mappings
      const params: Record<string, any> = {};
      let hasMissingRequiredParam = false;
      
      const mappings = settings.inputMappings;
      if (mappings) {
        for (const [paramKey, sourceVal] of Object.entries(mappings)) {
           let val: any = null;
           if (sourceVal === '$currentValue') {
              val = currentValue;
           } else if (typeof sourceVal === 'string' && sourceVal.startsWith('$form.')) {
              const formFieldKey = sourceVal.replace('$form.', '');
              val = methods.getValues(formFieldKey);
           } else if (typeof sourceVal === 'string' && methods.getValues(sourceVal) !== undefined) {
              // Intuitively fallback to checking if the string is a valid field key
              val = methods.getValues(sourceVal);
           } else {
              val = sourceVal;
           }
           
           // Check if value is truly empty (null, undefined, or empty string)
           if (val === null || val === undefined || val === '') {
              hasMissingRequiredParam = true;
           }
           
           params[paramKey] = val;
        }
      }

      if (hasMissingRequiredParam) {
         console.log("AutoFill paused: Waiting for all mapped parameters to be filled.");
         return; // Wait silently until all parameters are filled
      }

      // Execute query
      const results = await integrationsService.executeIntegrationQuery(settings.queryId, params);
      
      if (results) {
        const firstResult = Array.isArray(results) ? results[0] : results;
        if (!firstResult) return;
        
        // Map outputs
        const outMappings = settings.outputMappings;
        if (outMappings) {
           const processMapping = (mapping: any) => {
              // Format 1: { sourceKey: "X", targetFieldKey: "Y" }
              if (mapping.sourceKey && mapping.targetFieldKey) {
                 if (firstResult[mapping.sourceKey] !== undefined) {
                    methods.setValue(mapping.targetFieldKey, firstResult[mapping.sourceKey], { shouldValidate: true, shouldDirty: true });
                 }
              } 
              // Format 2: { "ADSOYAD": "field_931", "BOLUMU": "field_261" }
              else {
                 for (const [sqlCol, formField] of Object.entries(mapping)) {
                    if (typeof formField === 'string' && firstResult[sqlCol] !== undefined) {
                       methods.setValue(formField, firstResult[sqlCol], { shouldValidate: true, shouldDirty: true });
                    }
                 }
              }
           };

           if (Array.isArray(outMappings)) {
              outMappings.forEach(processMapping);
           } else if (typeof outMappings === 'object') {
              processMapping(outMappings);
           }
        }
      }

    } catch (e) {
      console.error("AutoFill Error", e);
    }
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
  const renderFieldContent = (field: DynamicFieldSchema) => {
    switch (field.editorType) {
      case 'calculation':
        return <CalculationField field={field} control={control} />;
      case 'statichtml':
        return (
          <div className="w-full">
            {field.label && <h4 className="text-sm font-semibold text-brand-dark mb-2">{field.label}</h4>}
            <div 
              className="prose prose-sm max-w-none text-brand-gray" 
              dangerouslySetInnerHTML={{ __html: field.optionsJson || '' }} 
            />
          </div>
        );
      case 'grid':
        return (
          <FfDynamicGridField
            name={field.dataField}
            label={field.label}
            required={field.isRequired}
            columnsSchema={field.gridColumns || []}
            optionsJson={field.optionsJson}
          />
        );
      case 'file':
        return (
          <FfField
            control={control}
            name={field.dataField}
            component={FfDynamicFileField as any}
            label={field.label}
            componentProps={{
              isRequired: field.isRequired,
              fieldKey: field.dataField,
              optionsJson: field.optionsJson
            }}
          />
        );
      case 'select':
        return (
          <FfField
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
          />
        );
      case 'date':
        return (
          <FfDateBoxRHF
            name={field.dataField}
            label={field.label}
            required={field.isRequired}
          />
        );
      case 'time':
        return (
          <FfTimeBox
            name={field.dataField}
            label={field.label}
            required={field.isRequired}
          />
        );
      case 'datetime':
        return (
          <FfDateTimeBoxRHF
            name={field.dataField}
            label={field.label}
            required={field.isRequired}
          />
        );
      case 'number':
        return (
          <FfField
            control={control}
            component={NumberBox as any}
            name={field.dataField}
            label={field.label}
            componentProps={{
              required: field.isRequired,
              stylingMode: "outlined",
              onFocusOut: () => handleFieldBlur(field)
            }}
          />
        );
      case 'boolean':
        return (
          <FfField
            control={control}
            component={FfCheckBox}
            name={field.dataField}
            label={field.label}
          />
        );
      case 'textarea':
        return (
          <FfField
            control={control}
            component={TextArea as any}
            name={field.dataField}
            label={field.label}
            componentProps={{
              required: field.isRequired,
              stylingMode: "outlined",
              minHeight: 100,
              onFocusOut: () => handleFieldBlur(field)
            }}
          />
        );
      case 'text':
      default:
        return (
          <FfTextField
            name={field.dataField}
            label={field.label}
            required={field.isRequired}
            onBlur={() => handleFieldBlur(field)}
          />
        );
    }
  };

  const renderField = (field: DynamicFieldSchema) => {
    const colSpanClass = {
      1: 'md:col-span-1',
      2: 'md:col-span-2',
      3: 'md:col-span-3',
      4: 'md:col-span-4',
      5: 'md:col-span-5',
      6: 'md:col-span-6',
      7: 'md:col-span-7',
      8: 'md:col-span-8',
      9: 'md:col-span-9',
      10: 'md:col-span-10',
      11: 'md:col-span-11',
      12: 'md:col-span-12',
    }[field.colSpan || 12] || 'md:col-span-12';

    return (
      <div key={field.dataField} className={`${colSpanClass} w-full`}>
        {renderFieldContent(field)}
      </div>
    );
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

  const sectionMetrics = template.sections.map((section, index) => {
    const fields = (section.fields || []).filter(isFillableField);
    const requiredFields = fields.filter(field => field.isRequired);
    const completedFields = fields.filter(field => hasFilledFieldValue(field, watchedValues?.[field.dataField]));
    const completedRequiredFields = requiredFields.filter(field => hasFilledFieldValue(field, watchedValues?.[field.dataField]));
    return {
      id: getSectionDomId(section.id, index),
      title: section.title || `Bölüm ${index + 1}`,
      total: fields.length,
      completed: completedFields.length,
      required: requiredFields.length,
      requiredCompleted: completedRequiredFields.length,
      missingRequired: Math.max(requiredFields.length - completedRequiredFields.length, 0)
    };
  });
  const allFields = template.sections.flatMap(section => section.fields || []).filter(isFillableField);
  const requiredFieldCount = allFields.filter(field => field.isRequired).length;
  const totalFieldCount = allFields.length;
  const completedFieldCount = allFields.filter(field => hasFilledFieldValue(field, watchedValues?.[field.dataField])).length;
  const completedRequiredCount = allFields.filter(field => field.isRequired && hasFilledFieldValue(field, watchedValues?.[field.dataField])).length;
  const missingRequiredCount = Math.max(requiredFieldCount - completedRequiredCount, 0);
  const completionPercent = totalFieldCount > 0 ? Math.round((completedFieldCount / totalFieldCount) * 100) : 0;
  const autoSaveLabel = autoSaveStatus === 'saving'
    ? 'Otomatik kaydediliyor'
    : autoSaveStatus === 'saved'
      ? `Taslak kaydedildi${lastSavedTime ? ` • ${lastSavedTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}` : ''}`
      : autoSaveStatus === 'error'
        ? 'Otomatik kayıt başarısız'
        : activeDraftId
          ? 'Taslak modu aktif'
          : 'Yeni form';
  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] w-full pb-8">
      <section className="relative overflow-hidden rounded-2xl border border-orange-100/80 bg-[radial-gradient(circle_at_top_right,rgba(255,122,61,0.14),transparent_32%),linear-gradient(135deg,#ffffff_0%,#fffaf6_48%,#f7f8fa_100%)] p-5 shadow-[0_22px_70px_rgba(24,24,27,0.08)] md:p-6">
        <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-orange-100/70 blur-3xl" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-surface-muted bg-white/78 text-brand-gray shadow-soft transition-colors hover:border-brand-primary/30 hover:text-brand-primary"
              aria-label="Geri"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-white/78 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-primary shadow-soft">
                <FileText className="h-3.5 w-3.5" />
                Form çalışma alanı
              </div>
              <h1 className="mt-4 text-2xl font-extrabold leading-tight text-brand-dark md:text-3xl">{template.name}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-gray">
                {template.description || "Lütfen kurallara uygun olarak formu doldurunuz."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <FormProvider {...methods}>
        <form className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]" onSubmit={(e) => e.preventDefault()}>
          <div className="ff-dynamic-form-canvas min-w-0 rounded-2xl border border-surface-muted/80 bg-white/72 p-3 shadow-[0_18px_55px_rgba(24,24,27,0.06)] md:p-4">
            <div className="space-y-5">
              {template.sections.map((section, index) => (
                <FormSection key={section.id} id={getSectionDomId(section.id, index)} title={section.title} variant="premium" index={index}>
                  {section.fields?.map(field => renderField(field))}
                </FormSection>
              ))}
            </div>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <div className="rounded-2xl border border-surface-muted/80 bg-white p-5 shadow-[0_18px_55px_rgba(24,24,27,0.06)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-primary">Form kontrolü</div>
                  <div className="mt-1 text-sm font-extrabold text-brand-dark">{completionPercent}% tamamlandı</div>
                </div>
                <span className={cn(
                  'rounded-full border px-2.5 py-1 text-[11px] font-bold',
                  missingRequiredCount === 0 ? 'border-emerald-100 bg-emerald-50 text-status-success' : 'border-orange-100 bg-orange-50 text-brand-primary'
                )}>
                  {missingRequiredCount === 0 ? 'Gönderime hazır' : `${missingRequiredCount} zorunlu eksik`}
                </span>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-ground">
                <div className="h-full rounded-full bg-gradient-to-r from-brand-primary via-amber-300 to-emerald-400 transition-all duration-500" style={{ width: `${completionPercent}%` }} />
              </div>
              <div className="mt-4 rounded-xl border border-surface-muted bg-surface-ground/35 p-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-gray">Kayıt durumu</div>
                <div className="mt-1 text-xs font-bold text-brand-dark">{autoSaveLabel}</div>
              </div>
              <div className="mt-5 space-y-2">
                {sectionMetrics.map((section) => {
                  const isComplete = section.total > 0 && section.completed === section.total;
                  const sectionStatus = section.total === 0
                    ? { label: 'bilgi', tone: 'bg-surface-ground text-brand-gray' }
                    : isComplete
                      ? { label: 'tamam', tone: 'bg-emerald-50 text-status-success' }
                      : section.missingRequired > 0
                        ? { label: `${section.missingRequired} zorunlu`, tone: 'bg-orange-50 text-brand-primary' }
                        : { label: `${section.total - section.completed} boş`, tone: 'bg-surface-ground text-brand-gray' };
                  return (
                    <button
                      type="button"
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className="group w-full rounded-xl border border-surface-muted bg-surface-ground/35 p-3 text-left transition-all hover:border-orange-100 hover:bg-orange-50/35"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn('h-2 w-2 rounded-full', isComplete ? 'bg-status-success' : 'bg-brand-primary')} />
                            <span className="truncate text-sm font-bold text-brand-dark">{section.title}</span>
                          </div>
                          <div className="mt-1 text-xs font-medium text-brand-gray">
                            {section.completed}/{section.total} alan dolu
                          </div>
                        </div>
                        <span className={cn(
                          'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold',
                          sectionStatus.tone
                        )}>
                          {sectionStatus.label}
                        </span>
                      </div>
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white">
                        <div className="h-full rounded-full bg-brand-primary transition-all duration-500" style={{ width: `${section.total > 0 ? Math.round((section.completed / section.total) * 100) : 0}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 rounded-xl border border-surface-muted bg-white p-3 text-xs leading-5 text-brand-gray">
                Bölüm kartlarına tıklayarak ilgili alana hızlıca geçebilirsin. Gönderimden önce zorunlu eksikler otomatik kontrol edilir.
              </div>
            </div>

          </aside>

          <div className="sticky bottom-4 z-20 rounded-2xl border border-surface-muted/80 bg-white/92 p-3 shadow-[0_18px_55px_rgba(24,24,27,0.12)] backdrop-blur xl:col-span-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {activeDraftId && (
                  <FfButton
                    type="button"
                    variant="outline"
                    leftIcon={deleteDraftMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    onClick={() => setIsDeleteDialogOpen(true)}
                    disabled={submitMutation.isPending || draftMutation.isPending || autoSaveMutation.isPending || deleteDraftMutation.isPending}
                    className="w-full border-red-100 bg-red-50 text-status-danger hover:border-red-200 hover:bg-red-100 sm:w-auto"
                  >
                    Taslağı Sil
                  </FfButton>
                )}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
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
          </div>
        </form>
      </FormProvider>

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
