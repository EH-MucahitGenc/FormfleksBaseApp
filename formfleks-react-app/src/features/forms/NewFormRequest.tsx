import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { PageHeader, FfButton, PageContainer, GlassCard } from '@/components/ui/index';
import { PremiumInput, PremiumSelect, PremiumCheckbox } from '@/components/forms';
import { useFormDefinition, useSubmitForm, useSaveDraft } from './hooks/useForms';
import { Save, Send, AlertTriangle, ArrowLeft } from 'lucide-react';

export const NewFormRequest: React.FC = () => {
  const { formCode } = useParams<{ formCode: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);

  // Fetch the form definition
  const { data: formDef, isLoading: isDefLoading, error: defError } = useFormDefinition(formCode);

  const { control, handleSubmit, reset, getValues, trigger } = useForm({
    mode: 'onTouched'
  });

  // Whenever definition loads, we could pre-fill or set defaults if needed
  useEffect(() => {
    if (formDef) {
      const defaultValues: Record<string, any> = {};
      (formDef.sections || []).forEach((sec: any) => {
        (sec.fields || []).forEach((f: any) => {
          if (f.fieldType === 3) defaultValues[f.key] = false;
          else defaultValues[f.key] = '';
        });
      });
      reset(defaultValues);
    }
  }, [formDef, reset]);

  const submitMutation = useSubmitForm();
  const draftMutation = useSaveDraft();

  if (isDefLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  if (defError || !formDef) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <span>Form şablonu bulunamadı veya pasif durumda.</span>
        </div>
      </div>
    );
  }

  const parseOptions = (optionsJson?: string) => {
    if (!optionsJson) return [];
    try {
      if (optionsJson.startsWith('[')) {
        const parsed = JSON.parse(optionsJson);
        return parsed.map((o: any) => o.text || o.value || o);
      }
    } catch {}
    return optionsJson.split(',').map(s => s.trim()).filter(Boolean);
  };

  const onSubmit = (data: any) => {
    submitMutation.mutate(data, {
      onSuccess: () => navigate('/forms')
    });
  };

  const onSaveDraft = async () => {
    // 1. Check validation state visually but don't block
    const isValid = await trigger();
    const data = getValues();
    
    draftMutation.mutate(data, {
      onSuccess: () => {
        if (!isValid) {
          // It's a draft, so we saved it, but we let them know they have unfinished required fields.
          // The useSaveDraft mutation already shows a success toast, so we might not need an extra warning, 
          // or we can just rely on the form highlighting the invalid fields in red (which trigger() does).
        }
        navigate('/forms');
      }
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
        <PageHeader
          title={formDef.name}
          description="Lütfen form alanlarını eksiksiz doldurun."
          breadcrumbs={[
            { label: 'Anasayfa', href: '/' },
            { label: 'Taleplerim', href: '/forms' },
            { label: 'Yeni Talep' }
          ]}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Body */}
        <div className="lg:col-span-2">
          <GlassCard noPadding className="overflow-hidden">
            {/* Tabs */}
            <div className="flex overflow-x-auto border-b border-surface-muted hide-scrollbar">
              {(formDef.sections || []).sort((a: any, b: any) => a.sortOrder - b.sortOrder).map((sec: any, idx: number) => (
                <button
                  key={sec.id || idx}
                  onClick={(e) => { e.preventDefault(); setActiveTab(idx); }}
                  className={`px-6 py-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === idx 
                      ? 'border-brand-primary text-brand-primary bg-brand-primary/5' 
                      : 'border-transparent text-brand-gray hover:text-brand-dark hover:bg-surface-muted/50'
                  }`}
                >
                  {sec.title}
                </button>
              ))}
            </div>

            <div className="p-6 md:p-8">
              <form id="dynamic-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {(formDef.sections || []).sort((a: any, b: any) => a.sortOrder - b.sortOrder).map((sec: any, idx: number) => (
                  <div key={sec.id || idx} className={activeTab === idx ? 'block' : 'hidden'}>
                    <div className="grid grid-cols-1 gap-6">
                      {(sec.fields || []).sort((a: any, b: any) => a.sortOrder - b.sortOrder).map((field: any) => {
                        const isRequired = field.isRequired;
                        const label = `${field.label}${isRequired ? ' *' : ''}`;
                        
                        return (
                          <div key={field.id}>
                            <Controller
                              name={field.key}
                              control={control}
                              rules={{ required: isRequired ? `${field.label} alanı zorunludur.` : false }}
                              render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => {
                                // Render based on FieldType
                                switch(field.fieldType) {
                                  case 1: // Text
                                  case 5: // Date
                                  case 6: // Time
                                  case 7: // DateTime
                                    let type = 'text';
                                    if(field.fieldType===5) type='date';
                                    if(field.fieldType===6) type='time';
                                    if(field.fieldType===7) type='datetime-local';
                                    return (
                                      <PremiumInput
                                        label={label}
                                        helperText={field.placeholder || ''}
                                        type={type}
                                        value={value || ''}
                                        onChange={onChange}
                                        onBlur={onBlur}
                                        error={error?.message}
                                      />
                                    );
                                  case 2: // Textarea
                                    return (
                                      <PremiumInput
                                        label={label}
                                        helperText={field.placeholder || ''}
                                        type="text"
                                        multiline={true}
                                        rows={3}
                                        value={value || ''}
                                        onChange={onChange}
                                        onBlur={onBlur}
                                        error={error?.message}
                                      />
                                    );
                                  case 3: // Checkbox
                                    return (
                                      <PremiumCheckbox
                                        label={label}
                                        helperText={field.placeholder || ''}
                                        checked={value === true}
                                        onChange={(checked) => onChange(checked)}
                                        error={error?.message}
                                      />
                                    );
                                  case 4: // Dropdown
                                    const opts = parseOptions(field.optionsJson);
                                    return (
                                      <PremiumSelect
                                        label={label}
                                        helperText={field.placeholder || ''}
                                        value={value || ''}
                                        onChange={onChange}
                                        onBlur={onBlur}
                                        error={error?.message}
                                      >
                                        <option value="" disabled>Seçiniz...</option>
                                        {opts.map((o: string, i: number) => (
                                          <option key={i} value={o}>{o}</option>
                                        ))}
                                      </PremiumSelect>
                                    );
                                  default:
                                    return <React.Fragment />;
                                }
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </form>
            </div>
            
            <div className="px-6 py-4 bg-surface-muted/30 border-t border-surface-muted flex items-center justify-end gap-3">
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
                type="submit"
                form="dynamic-form"
                isLoading={submitMutation.isPending}
                disabled={draftMutation.isPending}
              >
                Onayı Başlat
              </FfButton>
            </div>
          </GlassCard>
        </div>

        {/* Sidebar Info */}
        <div className="lg:col-span-1">
          <GlassCard noPadding className="p-6 sticky top-24">
            <h3 className="text-sm font-bold text-brand-dark mb-4 pb-4 border-b">Form Bilgileri</h3>
            <div className="space-y-4">
              <div>
                <span className="block text-xs font-semibold text-brand-gray uppercase tracking-wider mb-1">Form Tipi</span>
                <span className="text-sm font-medium text-brand-dark">{formDef.name}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-brand-gray uppercase tracking-wider mb-1">Durum</span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-primary/10 text-brand-primary">
                  Yeni Kayıt
                </span>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </PageContainer>
  );
};
