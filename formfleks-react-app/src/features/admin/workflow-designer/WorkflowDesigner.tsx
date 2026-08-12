import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Route, Save, Plus, Trash2, ChevronUp, ChevronDown, CheckCircle2, AlertTriangle, GitMerge, Sparkles, Workflow, ShieldCheck, GitBranch, Users } from 'lucide-react';
import { PageHeader, FfButton, PageContainer, GlassCard, cn } from '@/components/ui/index';
import { FfSelectBox } from '@/components/dev-extreme';
import { systemAdminService, type FormTemplateWorkflowStepUpsertDto, type FormTemplateSummaryDto } from '@/services/system-admin.service';
import type { AdminUserDto, AdminRoleDto } from '@/services/admin.service';

export const WorkflowDesigner: React.FC = () => {
  const queryClient = useQueryClient();
  
  // Selection State
  const [selectedFormId, setSelectedFormId] = useState<string>('');
  const [isFormPickerOpen, setIsFormPickerOpen] = useState(false);
  
  // Workflow Steps State
  const [steps, setSteps] = useState<FormTemplateWorkflowStepUpsertDto[]>([]);
  
  // UI State
  const [message, setMessage] = useState<{ type: 'success'|'error', text: string } | null>(null);

  const { data: templatesQueryData, isLoading: templatesLoading } = useQuery({
    queryKey: ['adminFormTemplates'],
    queryFn: systemAdminService.getTemplates
  });
  const templates: FormTemplateSummaryDto[] = templatesQueryData || [];

  const { data: rolesQueryData } = useQuery({
    queryKey: ['adminRolesLookup'],
    queryFn: systemAdminService.getRolesLookup
  });
  const roles: AdminRoleDto[] = rolesQueryData || [];

  const { data: usersQueryData } = useQuery({
    queryKey: ['adminUsersLookup'],
    queryFn: systemAdminService.getUsersLookup
  });
  const users: AdminUserDto[] = usersQueryData || [];

  // Fetch workflow when form changes
  const { data: existingSteps, isFetching: stepsFetching } = useQuery({
    queryKey: ['workflowSteps', selectedFormId],
    queryFn: () => systemAdminService.getTemplateWorkflow(selectedFormId),
    enabled: !!selectedFormId
  });

  useEffect(() => {
    if (existingSteps) {
      setSteps(existingSteps.map(s => ({ ...s })));
    } else {
      setSteps([]);
    }
  }, [existingSteps]);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: (payload: { formId: string, steps: FormTemplateWorkflowStepUpsertDto[] }) => 
      systemAdminService.saveTemplateWorkflow(payload.formId, payload.steps),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['workflowSteps', selectedFormId] });
      queryClient.invalidateQueries({ queryKey: ['adminFormTemplates'] });
      setMessage({ type: 'success', text: `Onay akışı kaydedildi. Toplam adım: ${res.data}` });
      setTimeout(() => setMessage(null), 3000);
    },
    onError: () => {
      setMessage({ type: 'error', text: 'Onay akışı kaydedilemedi.' });
    }
  });

  // Actions
  const handleAddStep = () => {
    setSteps([
      ...steps,
      {
        stepNo: steps.length + 1,
        name: `Adım ${steps.length + 1}`,
        assigneeType: 2, // Role by default
        allowReturnForRevision: true
      }
    ]);
  };

  const handleRemoveStep = (indexToRemove: number) => {
    const newSteps = steps.filter((_, idx) => idx !== indexToRemove).map((s, idx) => ({ ...s, stepNo: idx + 1 }));
    setSteps(newSteps);
  };

  const handleMoveUp = (idx: number) => {
    if (idx === 0) return;
    const items = [...steps];
    const temp = items[idx - 1];
    items[idx - 1] = items[idx];
    items[idx] = temp;
    
    // reindex
    items.forEach((item, i) => item.stepNo = i + 1);
    setSteps(items);
  };

  const handleMoveDown = (idx: number) => {
    if (idx === steps.length - 1) return;
    const items = [...steps];
    const temp = items[idx + 1];
    items[idx + 1] = items[idx];
    items[idx] = temp;
    
    // reindex
    items.forEach((item, i) => item.stepNo = i + 1);
    setSteps(items);
  };

  const handleUpdateStep = (idx: number, updates: Partial<FormTemplateWorkflowStepUpsertDto>) => {
    const items = [...steps];
    items[idx] = { ...items[idx], ...updates };
    
    // Clean up incompatible fields
    if (updates.assigneeType !== undefined) {
        if (updates.assigneeType !== 1) items[idx].assigneeUserId = undefined; 
        if (updates.assigneeType !== 2) items[idx].assigneeRoleId = undefined; 
    }

    if (updates.fallbackAction !== undefined) {
        if (updates.fallbackAction !== 2 && updates.fallbackAction !== 3) items[idx].fallbackUserId = undefined;
    }

    setSteps(items);
  };

  const handleSave = () => {
    if (!selectedFormId) {
      setMessage({ type: 'error', text: 'Lütfen önce form seçiniz.' });
      return;
    }
    if (steps.length === 0) {
      setMessage({ type: 'error', text: 'En az bir onay adımı eklemelisiniz.' });
      return;
    }
    
    const invalidStep = steps.find(s => !s.name || (s.assigneeType === 2 && !s.assigneeRoleId) || (s.assigneeType === 1 && !s.assigneeUserId));
    if (invalidStep) {
      setMessage({ type: 'error', text: 'Tüm adımların adı ve atama bilgileri (Rol/Kullanıcı) doldurulmalıdır.' });
      return;
    }

    saveMutation.mutate({ formId: selectedFormId, steps });
  };

  const loadDefaultPreset = () => {
    const hrRole = roles.find(r => r.code === 'MANAGER' || r.code === 'HR_MANAGER')?.id || '';
    const itRole = roles.find(r => r.code === 'SYS_ADMIN')?.id || '';
    
    setSteps([
      { stepNo: 1, name: 'Bölüm Yöneticisi Onayı', assigneeType: 2, assigneeRoleId: hrRole, allowReturnForRevision: true },
      { stepNo: 2, name: 'Sistem Yöneticisi Onayı', assigneeType: 2, assigneeRoleId: itRole, allowReturnForRevision: true }
    ]);
  };

  const selectedTemplateDetails = templates.find(t => t.formTypeId === selectedFormId);
  const activeTemplateCount = templates.filter(t => t.active).length;
  const dynamicStepCount = steps.filter(step => step.assigneeType >= 10).length;
  const fixedStepCount = steps.length - dynamicStepCount;
  const revisionEnabledCount = steps.filter(step => step.allowReturnForRevision).length;
  const missingAssigneeCount = steps.filter(step => (step.assigneeType === 2 && !step.assigneeRoleId) || (step.assigneeType === 1 && !step.assigneeUserId)).length;
  const workflowReadiness = !selectedFormId
    ? 'Form bekleniyor'
    : steps.length === 0
      ? 'Akış taslağı boş'
      : missingAssigneeCount > 0
        ? `${missingAssigneeCount} eksik hedef`
        : 'Kayda hazır';

  return (
    <PageContainer>
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        <PageHeader 
        title="Onay Akışı (Workflow) Tasarımcısı" 
        description="Form bazlı onay/ret rotalarını oluşturun, sıralamayı belirleyin." 
        className="hidden"
        breadcrumbs={[
          { label: 'Anasayfa', href: '/' },
          { label: 'Sistem & Araçlar', href: '/admin/audit-logs' },
          { label: 'Onay Akışı Tasarımcısı' }
        ]}
        actions={
          <div className="flex items-center gap-2">
            <FfButton variant="outline" leftIcon={<GitMerge className="h-4 w-4 text-brand-accent" />} onClick={loadDefaultPreset} disabled={!selectedFormId}>2 Adım Standart</FfButton>
            <FfButton variant="primary" leftIcon={<Save className="h-4 w-4" />} onClick={handleSave} isLoading={saveMutation.isPending} disabled={!selectedFormId}>Akışı Kaydet</FfButton>
          </div>
        }
      />

      <div className="relative mb-5 shrink-0 overflow-hidden rounded-[1.75rem] border border-orange-100/80 bg-[radial-gradient(circle_at_top_left,rgba(255,122,61,0.18),transparent_34%),linear-gradient(135deg,#fffaf6_0%,#ffffff_48%,#f8fafc_100%)] p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] md:p-7">
        <div className="pointer-events-none absolute right-8 top-6 h-24 w-24 rounded-full bg-brand-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-bold text-brand-gray">
              <span>Anasayfa</span>
              <span className="text-brand-gray/40">/</span>
              <span>Sistem & Araçlar</span>
              <span className="text-brand-gray/40">/</span>
              <span className="text-brand-dark">Onay Akışı Tasarımcısı</span>
            </div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-primary/20 bg-white/85 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-brand-primary shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Workflow Studio
            </div>
            <h1 className="max-w-3xl text-3xl font-black tracking-tight text-brand-dark md:text-4xl">Onay Akışı Tasarımcısı</h1>
            <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-brand-gray">
              Formların onay rotasını, dinamik rol atamalarını, fallback senaryolarını ve sıralı adım zincirini tek bir kontrollü alanda kurgulayın.
            </p>
          </div>

          <div className="flex flex-col gap-3 xl:items-end">
            <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/80 bg-white/80 p-2 shadow-sm backdrop-blur">
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-brand-gray">Şablon</p>
                <p className="mt-1 text-xl font-black text-brand-dark">{templates.length}</p>
              </div>
              <div className="rounded-xl bg-emerald-50 px-4 py-3">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">Aktif</p>
                <p className="mt-1 text-xl font-black text-emerald-700">{activeTemplateCount}</p>
              </div>
              <div className="rounded-xl bg-orange-50 px-4 py-3">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-brand-primary">Adım</p>
                <p className="mt-1 text-xl font-black text-brand-primary">{steps.length}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <FfButton variant="outline" leftIcon={<GitMerge className="h-4 w-4 text-brand-accent" />} onClick={loadDefaultPreset} disabled={!selectedFormId}>2 Adım Standart</FfButton>
              <FfButton variant="primary" leftIcon={<Save className="h-4 w-4" />} onClick={handleSave} isLoading={saveMutation.isPending} disabled={!selectedFormId}>Akışı Kaydet</FfButton>
            </div>
          </div>
        </div>
      </div>

      {message && (
        <div className={`mb-4 mx-2 p-3 rounded-lg flex items-center gap-2 border shadow-sm animate-in fade-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-status-success/10 text-status-success border-status-success/20' : 'bg-status-danger/10 text-status-danger border-status-danger/20'}`}>
           {message.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
           <span className="font-medium">{message.text}</span>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-6 md:flex-row">
        
        {/* Left Panel: Form Selector & Overview */}
        <div className="flex w-full flex-col gap-4 md:w-96">
            <div className="relative z-50 overflow-visible rounded-3xl border border-surface-muted bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                <div className="mb-4 flex items-start gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-primary/10 text-brand-primary">
                        <Route className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="font-black text-brand-dark">Hedef Form Seçimi</h3>
                        <p className="mt-1 text-xs font-semibold text-brand-gray">Akış tasarlamak istediğiniz form şablonunu seçin.</p>
                    </div>
                </div>

                <label className="mb-2 block text-xs font-black uppercase tracking-wider text-brand-gray">Tasarım Şablonu</label>
                <select
                    value={selectedFormId}
                    onChange={e => {
                        setSelectedFormId(e.target.value);
                        setIsFormPickerOpen(false);
                    }}
                    disabled={templatesLoading}
                    style={{ display: 'block', minHeight: 48, width: '100%' }}
                    className="relative z-50 block w-full rounded-2xl border border-surface-muted bg-white px-4 py-3 text-sm font-bold text-brand-dark shadow-sm outline-none transition-all focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 disabled:cursor-wait disabled:opacity-70"
                >
                    <option value="">{templatesLoading ? 'Yükleniyor...' : '-- Şablon Seçiniz --'}</option>
                    {templates.map(t => (
                        <option key={t.formTypeId} value={t.formTypeId}>{t.name} ({t.code})</option>
                    ))}
                </select>

                {selectedTemplateDetails && (
                    <div className="mt-4 rounded-2xl border border-surface-muted bg-slate-50 p-4">
                        <div className="mb-3 text-xs font-black uppercase tracking-wider text-brand-gray">Seçili Form Özeti</div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-brand-gray">Bağlı Alanlar:</span>
                                <span className="font-bold text-brand-dark">{selectedTemplateDetails.fieldCount} Alan</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-brand-gray">Kayıtlı Adımlar:</span>
                                <span className="font-bold text-brand-dark">{selectedTemplateDetails.workflowStepCount} Adım</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-brand-gray">Durum:</span>
                                <span className={selectedTemplateDetails.active ? 'text-status-success font-bold' : 'text-brand-gray font-bold'}>{selectedTemplateDetails.active ? 'Aktif Form' : 'Pasif Form'}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <GlassCard noPadding className="hidden">
                <h3 className="font-bold text-brand-dark mb-4 flex items-center gap-2">
                    <Route className="h-5 w-5 text-brand-primary" />
                    Hedef Form Seçimi
                </h3>
                
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-brand-gray uppercase tracking-wider">Tasarım Şablonu</label>
                    <button
                        type="button"
                        onClick={() => !templatesLoading && setIsFormPickerOpen(open => !open)}
                        disabled={templatesLoading}
                        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-surface-muted bg-white px-4 py-3 text-left text-sm font-bold text-brand-dark shadow-sm transition-all hover:border-brand-primary/40 focus:border-brand-primary focus:outline-none focus:ring-4 focus:ring-brand-primary/10 disabled:cursor-wait disabled:opacity-70"
                    >
                        <span className="min-w-0 truncate">
                            {templatesLoading
                                ? 'Yükleniyor...'
                                : selectedTemplateDetails
                                    ? `${selectedTemplateDetails.name} (${selectedTemplateDetails.code})`
                                    : '-- Şablon Seçiniz --'}
                        </span>
                        <ChevronDown className={cn('h-4 w-4 shrink-0 text-brand-gray transition-transform', isFormPickerOpen && 'rotate-180')} />
                    </button>

                    {isFormPickerOpen && (
                        <div className="mt-2 max-h-72 overflow-y-auto rounded-2xl border border-surface-muted bg-white p-2 shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
                            {templates.length === 0 ? (
                                <div className="px-3 py-4 text-sm font-semibold text-brand-gray">Listelenecek form şablonu bulunamadı.</div>
                            ) : (
                                templates.map(t => {
                                    const isSelected = selectedFormId === t.formTypeId;
                                    return (
                                        <button
                                            key={t.formTypeId}
                                            type="button"
                                            onClick={() => {
                                                setSelectedFormId(t.formTypeId);
                                                setIsFormPickerOpen(false);
                                            }}
                                            className={cn(
                                                'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition-all',
                                                isSelected ? 'bg-brand-primary text-white shadow-sm' : 'text-brand-dark hover:bg-orange-50'
                                            )}
                                        >
                                            <span className="min-w-0">
                                                <span className="block truncate text-sm font-black">{t.name}</span>
                                                <span className={cn('block truncate font-mono text-[11px] font-bold', isSelected ? 'text-white/80' : 'text-brand-gray')}>
                                                    {t.code}
                                                </span>
                                            </span>
                                            <span className={cn('shrink-0 rounded-full px-2 py-1 text-[11px] font-black', isSelected ? 'bg-white/15 text-white' : 'bg-slate-100 text-brand-gray')}>
                                                {t.workflowStepCount} adım
                                            </span>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>

                {selectedTemplateDetails && (
                    <div className="mt-6 p-4 bg-surface-hover rounded-lg border border-surface-muted">
                        <div className="text-xs text-brand-gray font-semibold mb-2 uppercase">Seçili Form Özeti</div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-brand-gray">Bağlı Alanlar:</span>
                                <span className="font-bold text-brand-dark">{selectedTemplateDetails.fieldCount} Alan</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-brand-gray">Kayıtlı Adımlar:</span>
                                <span className="font-bold text-brand-dark">{selectedTemplateDetails.workflowStepCount} Adım</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-brand-gray">Durum:</span>
                                <span className={selectedTemplateDetails.active ? 'text-status-success font-bold' : 'text-brand-gray font-bold'}>{selectedTemplateDetails.active ? 'Aktif Form' : 'Pasif Form'}</span>
                            </div>
                        </div>
                    </div>
                )}
            </GlassCard>

            <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-wider text-brand-primary">Bu Akış</p>
                    <p className="mt-2 text-2xl font-black text-brand-primary">{steps.length}</p>
                    <p className="text-[11px] font-bold text-brand-gray">adım</p>
                </div>
                <div className={cn(
                    'rounded-2xl border p-4 shadow-sm',
                    missingAssigneeCount > 0 ? 'border-red-100 bg-red-50/70' : 'border-emerald-100 bg-emerald-50/70'
                )}>
                    <p className={cn('text-[10px] font-black uppercase tracking-wider', missingAssigneeCount > 0 ? 'text-status-danger' : 'text-emerald-700')}>Durum</p>
                    <p className={cn('mt-2 text-sm font-black', missingAssigneeCount > 0 ? 'text-status-danger' : 'text-emerald-700')}>{workflowReadiness}</p>
                    <p className="text-[11px] font-bold text-brand-gray">kontrol</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">Dinamik</p>
                    <p className="mt-2 text-2xl font-black text-brand-dark">{dynamicStepCount}</p>
                    <p className="text-[11px] font-bold text-brand-gray">rol adımı</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">Sabit</p>
                    <p className="mt-2 text-2xl font-black text-brand-dark">{fixedStepCount}</p>
                    <p className="text-[11px] font-bold text-brand-gray">hedef</p>
                </div>
            </div>

            {/* Quick Helper Panel */}
            <div className="rounded-3xl border border-surface-muted bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-black text-brand-dark">
                    <ShieldCheck className="h-4 w-4 text-brand-primary" /> Akış Tasarım Rehberi
                </h4>
                <ul className="space-y-2 pl-4 text-xs font-semibold leading-5 text-brand-gray">
                    <li>Akışlar sıralı yürütülür (1. Adımdan N. Adıma).</li>
                    <li>Atamalar sistem yetki rollerine (Departman Yöneticisi) veya spesifik kullanıcılara yapılabilir.</li>
                    <li>Sıra numaraları sağ taraftaki yukarı/aşağı butonları ile değiştirilebilir.</li>
                </ul>
            </div>
        </div>

        {/* Right Panel: Workflow Builder */}
        <GlassCard noPadding className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-surface-muted bg-white shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
            <div className="flex items-center justify-between border-b border-orange-100 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_55%,#f8fafc_100%)] px-6 py-4">
                <div>
                   <h3 className="font-bold text-brand-dark">Akış Adımları Listesi</h3>
                   <p className="text-xs text-brand-gray mt-0.5">{selectedFormId ? "Seçilen forma ait zinciri aşağıdan yönetebilirsiniz." : "Önce sol taraftan form seçiniz."}</p>
                </div>
                {selectedFormId && (
                   <FfButton variant="outline" size="sm" onClick={handleAddStep} leftIcon={<Plus className="h-4 w-4" />}>Adım Ekle</FfButton>
                )}
            </div>
            
            <div className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 scrollbar-thin md:p-6">
                {selectedFormId && (
                    <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-4">
                        <div className="rounded-2xl border border-surface-muted bg-white p-4 shadow-sm">
                            <p className="text-[10px] font-black uppercase tracking-wider text-brand-gray">Seçili Form</p>
                            <p className="mt-2 truncate text-sm font-black text-brand-dark">{selectedTemplateDetails?.name || 'Form'}</p>
                        </div>
                        <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4 shadow-sm">
                            <p className="text-[10px] font-black uppercase tracking-wider text-brand-primary">Akış Adımı</p>
                            <p className="mt-1 text-2xl font-black text-brand-primary">{steps.length}</p>
                        </div>
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 shadow-sm">
                            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Revizyon Açık</p>
                            <p className="mt-1 text-2xl font-black text-emerald-700">{revisionEnabledCount}</p>
                        </div>
                        <div className={cn('rounded-2xl border p-4 shadow-sm', missingAssigneeCount > 0 ? 'border-red-100 bg-red-50/70' : 'border-slate-200 bg-white')}>
                            <p className={cn('text-[10px] font-black uppercase tracking-wider', missingAssigneeCount > 0 ? 'text-status-danger' : 'text-slate-600')}>Hazırlık</p>
                            <p className={cn('mt-2 text-sm font-black', missingAssigneeCount > 0 ? 'text-status-danger' : 'text-brand-dark')}>{workflowReadiness}</p>
                        </div>
                    </div>
                )}
                {!selectedFormId ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-4">
                        <Route className="h-16 w-16 text-brand-gray/20 mb-4" />
                        <h4 className="text-lg font-bold text-brand-dark mb-2">Form Seçilmedi</h4>
                        <p className="text-brand-gray max-w-sm">İşlem yapmak istediğiniz akışı hazırlamak için sol taraftan bir form şablonu seçin.</p>
                    </div>
                ) : stepsFetching ? (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
                    </div>
                ) : steps.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-4 border-2 border-dashed border-surface-muted rounded-xl bg-surface-hover/30">
                        <h4 className="text-brand-dark font-bold mb-2">Bu formun onay rotası yok</h4>
                        <p className="text-brand-gray text-sm mb-4">Yukarıdaki 'Adım Ekle' butonuna tıklayarak ilk onay adımını yaratın.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {steps.map((step, sIdx) => (
                            <div key={`step_${sIdx}`} className="flex items-center gap-4 rounded-3xl border border-surface-muted bg-white p-4 shadow-[0_16px_36px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-0.5 hover:border-brand-primary/30">
                                
                                <div className="flex flex-col gap-1 flex-shrink-0">
                                    <button onClick={() => handleMoveUp(sIdx)} disabled={sIdx === 0} className={`p-1 rounded ${sIdx === 0 ? 'text-surface-muted cursor-not-allowed' : 'text-brand-gray hover:bg-surface-hover hover:text-brand-primary'}`}><ChevronUp className="h-4 w-4" /></button>
                                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-brand-primary/20 bg-brand-primary/10 text-sm font-black text-brand-primary">{step.stepNo}</div>
                                    <button onClick={() => handleMoveDown(sIdx)} disabled={sIdx === steps.length - 1} className={`p-1 rounded ${sIdx === steps.length - 1 ? 'text-surface-muted cursor-not-allowed' : 'text-brand-gray hover:bg-surface-hover hover:text-brand-primary'}`}><ChevronDown className="h-4 w-4" /></button>
                                </div>

                                <div className="flex-1">
                                    <div className="mb-4 flex flex-wrap items-center gap-2">
                                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-brand-primary">
                                            <GitBranch className="h-3.5 w-3.5" />
                                            Adım {step.stepNo}
                                        </span>
                                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-700">
                                            {step.assigneeType >= 10 ? <Workflow className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
                                            {step.assigneeType >= 10 ? 'Dinamik atama' : 'Sabit hedef'}
                                        </span>
                                        {step.allowReturnForRevision && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700">
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                Revizyon açık
                                            </span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
                                        <div className="md:col-span-4">
                                            <label className="block text-xs font-bold text-brand-gray uppercase mb-1">Adım Adı</label>
                                            <input type="text" value={step.name} onChange={e => handleUpdateStep(sIdx, { name: e.target.value })} className="w-full bg-surface-hover border-none rounded-lg px-3 py-2 text-sm font-semibold text-brand-dark focus:ring-1 focus:ring-brand-primary" placeholder="Bölüm Onayı vs." />
                                        </div>
                                        
                                        <div className="md:col-span-4">
                                            <label className="block text-xs font-bold text-brand-gray uppercase mb-1">Atama Tipi</label>
                                            <select value={step.assigneeType} onChange={e => handleUpdateStep(sIdx, { assigneeType: Number(e.target.value) })} className="w-full bg-surface-hover border-none rounded-lg px-3 py-2 text-sm text-brand-dark focus:ring-1 focus:ring-brand-primary font-medium">
                                                <optgroup label="Kurumsal Roller (Dinamik)">
                                                    <option value={10}>Direkt Yönetici (1 Kademe)</option>
                                                    <option value={11}>Departman Yöneticisi</option>
                                                    <option value={12}>Kısım/Bölüm Lideri</option>
                                                    <option value={13}>Üst Yönetici (2 Kademe)</option>
                                                    <option value={15}>Lokasyon Bazlı Dinamik Rol</option>
                                                    <option value={16}>Global Yönetici (Dinamik Rol)</option>
                                                </optgroup>
                                                <optgroup label="Sabit Atamalar">
                                                    <option value={1}>Spesifik Kullanıcı</option>
                                                    <option value={2}>Rol Grubu Havuzu</option>
                                                </optgroup>
                                                <optgroup label="Geçmiş Uyumluluk">
                                                    <option value={3}>JSON Kuralları</option>
                                                </optgroup>
                                            </select>
                                        </div>

                                        <div className="md:col-span-4">
                                            <label className="block text-xs font-bold text-brand-gray uppercase mb-1 opacity-100 transition-opacity">
                                                {step.assigneeType === 1 || step.assigneeType === 2 ? 'Hedef Seçimi' : 'Hedef Bildirimi'}
                                            </label>
                                            
                                            {step.assigneeType === 1 && (
                                                <div className="bg-surface-base rounded-lg border border-brand-primary/20">
                                                    <FfSelectBox 
                                                        value={step.assigneeUserId || ''} 
                                                        onValueChanged={e => handleUpdateStep(sIdx, { assigneeUserId: e.value })} 
                                                        dataSource={users}
                                                        valueExpr="id"
                                                        displayExpr={(item: any) => item ? `${item.name || item.email} (${item.email})` : ''}
                                                        placeholder="Kullanıcı Ara & Seçiniz..."
                                                        searchEnabled={true}
                                                    />
                                                </div>
                                            )}
                                            {step.assigneeType === 2 && (
                                                <div className="bg-surface-base rounded-lg border border-brand-primary/20">
                                                    <FfSelectBox 
                                                        value={step.assigneeRoleId || ''} 
                                                        onValueChanged={e => handleUpdateStep(sIdx, { assigneeRoleId: e.value })} 
                                                        dataSource={roles}
                                                        valueExpr="id"
                                                        displayExpr={(item: any) => item ? `${item.name} (${item.code})` : ''}
                                                        placeholder="Rol Ara & Seçiniz..."
                                                        searchEnabled={true}
                                                    />
                                                </div>
                                            )}
                                            {step.assigneeType >= 10 && step.assigneeType !== 15 && step.assigneeType !== 16 && (
                                                <div className="px-3 py-2 text-sm text-brand-accent bg-brand-accent/5 border border-brand-accent/20 rounded-lg whitespace-nowrap overflow-hidden text-ellipsis italic font-medium">Bu rol HR ağacından çalışma anında (runtime) bulunur.</div>
                                            )}
                                            {(step.assigneeType === 15 || step.assigneeType === 16) && (
                                                <div className="flex flex-col gap-3">
                                                    <div className="bg-surface-base rounded-lg border border-brand-primary/20">
                                                        <FfSelectBox 
                                                            value={step.targetLocationRoleId || ''} 
                                                            onValueChanged={e => handleUpdateStep(sIdx, { targetLocationRoleId: e.value })} 
                                                            dataSource={roles}
                                                            valueExpr="id"
                                                            displayExpr={(item: any) => item ? `${item.name} (${item.code})` : ''}
                                                            placeholder="Rol Ara & Seçiniz..."
                                                            searchEnabled={true}
                                                        />
                                                    </div>
                                                    {step.assigneeType === 15 && (
                                                    <label className="flex items-start gap-2 cursor-pointer group mt-1">
                                                        <div className="relative pt-0.5">
                                                            <input type="checkbox" className="sr-only" checked={step.isGlobalManagerInfoOnly !== false} onChange={e => handleUpdateStep(sIdx, { isGlobalManagerInfoOnly: e.target.checked })} />
                                                            <div className={`block w-8 h-4.5 rounded-full transition-colors ${step.isGlobalManagerInfoOnly !== false ? 'bg-status-info' : 'bg-surface-muted'}`}></div>
                                                            <div className={`absolute left-0.5 top-1 bg-surface-base w-3.5 h-3.5 rounded-full transition-transform transform ${step.isGlobalManagerInfoOnly !== false ? 'translate-x-3.5' : ''}`}></div>
                                                        </div>
                                                        <span className="text-[11px] font-bold text-brand-dark group-hover:text-status-info">Global Yöneticilere Sadece Bilgilendirme (Aktif Onaycı Yapma)</span>
                                                    </label>
                                                    )}
                                                </div>
                                            )}
                                            {step.assigneeType === 3 && (
                                                <div className="px-3 py-2 text-sm text-brand-gray bg-surface-hover border border-surface-muted rounded-lg italic text-center">Tavsiye Edilmez</div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Fallback & Advanced Config Panel */}
                                    <div className="bg-surface-base border border-surface-muted rounded-lg p-3 grid grid-cols-1 md:grid-cols-12 gap-4">
                                        <div className="md:col-span-3">
                                            <label className="text-[11px] font-bold text-brand-gray uppercase mb-1.5 flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-status-warning"/> Hata Durumu (Fallback)</label>
                                            <select value={step.fallbackAction ?? 0} onChange={e => handleUpdateStep(sIdx, { fallbackAction: Number(e.target.value) })} className="w-full bg-surface-base border border-surface-muted rounded py-1.5 px-2.5 text-xs text-brand-dark">
                                                <option value={0}>Adımı Otomatik Atla</option>
                                                <option value={1}>Üst Yöneticisine Düşür</option>
                                                <option value={2}>Sabit Kişiye Düşür</option>
                                                <option value={3}>Sabit Role Düşür</option>
                                            </select>
                                        </div>

                                        {(step.fallbackAction === 2 || step.fallbackAction === 3) && (
                                            <div className="md:col-span-3">
                                                <label className="text-[11px] font-bold text-brand-gray uppercase mb-1.5 opacity-60">Fallback Hedefi</label>
                                                {step.fallbackAction === 2 ? (
                                                    <div className="bg-surface-base rounded py-1.5 border border-surface-muted">
                                                        <FfSelectBox 
                                                            value={step.fallbackUserId || ''} 
                                                            onValueChanged={e => handleUpdateStep(sIdx, { fallbackUserId: e.value })} 
                                                            dataSource={users}
                                                            valueExpr="id"
                                                            displayExpr={(item: any) => item ? `${item.name || item.email}` : ''}
                                                            placeholder="Kullanıcı Ara..."
                                                            searchEnabled={true}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="bg-surface-base rounded py-1.5 border border-surface-muted">
                                                        <FfSelectBox 
                                                            value={step.fallbackUserId || ''} 
                                                            onValueChanged={e => handleUpdateStep(sIdx, { fallbackUserId: e.value })} 
                                                            dataSource={roles}
                                                            valueExpr="id"
                                                            displayExpr="name"
                                                            placeholder="Rol Ara..."
                                                            searchEnabled={true}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        
                                        <div className="md:col-span-3 flex items-center pt-5">
                                            <label className="flex items-center gap-2 cursor-pointer group">
                                                <div className="relative">
                                                    <input type="checkbox" className="sr-only" checked={step.isParallel || false} onChange={e => handleUpdateStep(sIdx, { isParallel: e.target.checked })} />
                                                    <div className={`block w-8 h-4.5 rounded-full transition-colors ${step.isParallel ? 'bg-brand-primary' : 'bg-surface-muted'}`}></div>
                                                    <div className={`absolute left-0.5 top-0.5 bg-surface-base w-3.5 h-3.5 rounded-full transition-transform transform ${step.isParallel ? 'translate-x-3.5' : ''}`}></div>
                                                </div>
                                                <span className="text-xs font-bold text-brand-dark group-hover:text-brand-primary">Paralel Onay</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-shrink-0 border-l border-surface-muted pl-4 ml-2 flex items-center justify-center">
                                    <button onClick={() => handleRemoveStep(sIdx)} className="h-8 w-8 flex items-center justify-center rounded-lg text-brand-gray hover:bg-status-danger/10 hover:text-status-danger transition-colors z-[1]" title="Adımı Sil">
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </GlassCard>

      </div>
      </div>
    </PageContainer>
  );
};
