import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Route, Save, Plus, Trash2, ChevronUp, ChevronDown, CheckCircle2, AlertTriangle, GitMerge } from 'lucide-react';
import { PageHeader, FfButton, PageContainer, GlassCard } from '@/components/ui/index';
import { FfSelectBox } from '@/components/dev-extreme';
import { systemAdminService, type FormTemplateWorkflowStepUpsertDto, type FormTemplateSummaryDto } from '@/services/system-admin.service';
import type { AdminUserDto, AdminRoleDto } from '@/services/admin.service';

export const WorkflowDesigner: React.FC = () => {
  const queryClient = useQueryClient();
  
  // Selection State
  const [selectedFormId, setSelectedFormId] = useState<string>('');
  
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

  return (
    <PageContainer>
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        <PageHeader 
        title="Onay Akışı (Workflow) Tasarımcısı" 
        description="Form bazlı onay/ret rotalarını oluşturun, sıralamayı belirleyin." 
        className="shrink-0 mb-4"
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

      {message && (
        <div className={`mb-4 mx-2 p-3 rounded-lg flex items-center gap-2 border shadow-sm animate-in fade-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-status-success/10 text-status-success border-status-success/20' : 'bg-status-danger/10 text-status-danger border-status-danger/20'}`}>
           {message.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
           <span className="font-medium">{message.text}</span>
        </div>
      )}

      <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-6">
        
        {/* Left Panel: Form Selector & Overview */}
        <div className="w-full md:w-80 flex flex-col gap-4">
            <GlassCard noPadding className="p-5">
                <h3 className="font-bold text-brand-dark mb-4 flex items-center gap-2">
                    <Route className="h-5 w-5 text-brand-primary" />
                    Hedef Form Seçimi
                </h3>
                
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-brand-gray uppercase tracking-wider">Tasarım Şablonu</label>
                    <select 
                        value={selectedFormId} 
                        onChange={e => setSelectedFormId(e.target.value)}
                        className="w-full bg-surface-base border border-surface-muted rounded-lg px-3 py-2.5 text-sm text-brand-dark font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary appearance-none"
                    >
                        <option value="">-- Şablon Seçiniz --</option>
                        {templatesLoading ? (
                            <option value="">Yükleniyor...</option>
                        ) : (
                            templates.map(t => (
                                <option key={t.formTypeId} value={t.formTypeId}>{t.name} ({t.code})</option>
                            ))
                        )}
                    </select>
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

            {/* Quick Helper Panel */}
            <div className="bg-status-info/10 rounded-xl border border-status-info/20 p-4">
                <h4 className="text-sm font-bold text-status-info mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" /> Nelere Dikkat Etmeli?
                </h4>
                <ul className="text-xs text-status-info/80 space-y-2 list-disc pl-4">
                    <li>Akışlar sıralı yürütülür (1. Adımdan N. Adıma).</li>
                    <li>Atamalar sistem yetki rollerine (Departman Yöneticisi) veya spesifik kullanıcılara yapılabilir.</li>
                    <li>Sıra numaraları sağ taraftaki yukarı/aşağı butonları ile değiştirilebilir.</li>
                </ul>
            </div>
        </div>

        {/* Right Panel: Workflow Builder */}
        <GlassCard noPadding className="flex-1 min-w-0 flex flex-col overflow-hidden">
            <div className="bg-surface-hover border-b border-surface-muted px-6 py-4 flex justify-between items-center">
                <div>
                   <h3 className="font-bold text-brand-dark">Akış Adımları Listesi</h3>
                   <p className="text-xs text-brand-gray mt-0.5">{selectedFormId ? "Seçilen forma ait zinciri aşağıdan yönetebilirsiniz." : "Önce sol taraftan form seçiniz."}</p>
                </div>
                {selectedFormId && (
                   <FfButton variant="outline" size="sm" onClick={handleAddStep} leftIcon={<Plus className="h-4 w-4" />}>Adım Ekle</FfButton>
                )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-surface-base scrollbar-thin">
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
                    <div className="space-y-3">
                        {steps.map((step, sIdx) => (
                            <div key={`step_${sIdx}`} className="bg-surface-base border border-surface-muted rounded-xl p-4 shadow-sm flex items-center gap-4 transition-all hover:border-brand-primary/30">
                                
                                <div className="flex flex-col gap-1 flex-shrink-0">
                                    <button onClick={() => handleMoveUp(sIdx)} disabled={sIdx === 0} className={`p-1 rounded ${sIdx === 0 ? 'text-surface-muted cursor-not-allowed' : 'text-brand-gray hover:bg-surface-hover hover:text-brand-primary'}`}><ChevronUp className="h-4 w-4" /></button>
                                    <div className="w-6 h-6 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center text-xs font-bold border border-brand-primary/20">{step.stepNo}</div>
                                    <button onClick={() => handleMoveDown(sIdx)} disabled={sIdx === steps.length - 1} className={`p-1 rounded ${sIdx === steps.length - 1 ? 'text-surface-muted cursor-not-allowed' : 'text-brand-gray hover:bg-surface-hover hover:text-brand-primary'}`}><ChevronDown className="h-4 w-4" /></button>
                                </div>

                                <div className="flex-1">
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
                                            {step.assigneeType >= 10 && step.assigneeType !== 15 && (
                                                <div className="px-3 py-2 text-sm text-brand-accent bg-brand-accent/5 border border-brand-accent/20 rounded-lg whitespace-nowrap overflow-hidden text-ellipsis italic font-medium">Bu rol HR ağacından çalışma anında (runtime) bulunur.</div>
                                            )}
                                            {step.assigneeType === 15 && (
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
