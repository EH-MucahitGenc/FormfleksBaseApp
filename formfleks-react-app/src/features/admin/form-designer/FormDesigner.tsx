import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Columns, Save, FileType, CheckCircle2, RotateCcw, AlertTriangle, Eye, Plus, Trash2, GripVertical, Settings, List, Search, Database, Layers3, PenTool, ShieldCheck, Sparkles, Workflow } from 'lucide-react';

import { systemAdminService, type FormTemplateUpsertDto } from '@/services/system-admin.service';
import { integrationQueryService, type IntegrationQueryLookupDto } from '@/services/integration-query.service';
import { PageHeader, FfButton, PageContainer, GlassCard, FfModal, cn } from '@/components/ui/index';
import { generateUUID } from '@/lib/uuid';
import { AutoFillMappingBuilder } from './components/AutoFillMappingBuilder';
import { useForm, FormProvider } from 'react-hook-form';
import { FfDynamicGridField } from '@/components/dev-extreme/FfDynamicGridField';

// Form Builder Types (Local State overrides)
interface FieldState {
  id: string; // React key
  fieldKey: string;
  label: string;
  fieldType: number;
  isRequired: boolean;
  colSpan?: number;
  optionsJson?: string;
  autoFillJson?: string;
  calculationRuleJson?: string;
  placeholder?: string;
}

interface SectionState {
  id: string; // React key
  title: string;
  fields: FieldState[];
}

const formatOptionsToCsv = (val: any): string => {
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
        }).join(',');
      }
      if (parsed && typeof parsed === 'object') {
        return parsed.Text || parsed.Value || parsed.label || parsed.value || JSON.stringify(parsed);
      }
      return String(parsed);
    }
  } catch(e) { }
  return val;
};

export const FormDesigner: React.FC = () => {
  const queryClient = useQueryClient();
  const methods = useForm();
  const [activeTab, setActiveTab] = useState<'list' | 'designer' | 'preview'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Builder State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [sections, setSections] = useState<SectionState[]>([]);
  const [allowedCreateRoleCodes, setAllowedCreateRoleCodes] = useState<string[]>([]);
  const [allowedReportRoleCodes, setAllowedReportRoleCodes] = useState<string[]>([]);
  const [systemUsageType, setSystemUsageType] = useState<string>('');
  
  // UI State
  const [saveMessage, setSaveMessage] = useState<{ type: 'success'|'error', text: string } | null>(null);

  /**
   * Grid (Tablo) kolon yöneticisi state'i.
   * Modalın açık/kapalı durumu ve aktif kolonların bilgisini tutar.
   */
  const [gridManager, setGridManager] = useState<{sectionId: string, fieldId: string, columns: any[], fixedRows: string} | null>(null);

  const openGridManager = (sectionId: string, fieldId: string, currentOptions: string | undefined) => {
    let columns = [];
    let fixedRows = '';
    if (currentOptions) {
      try {
        const parsed = JSON.parse(currentOptions);
        if (Array.isArray(parsed)) {
            columns = parsed;
        } else {
            columns = parsed.columns || [];
            fixedRows = parsed.fixedRows ? parsed.fixedRows.join('\n') : '';
        }
      } catch (e) {
        console.error("Failed to parse grid options", e);
      }
    }
    setGridManager({ sectionId, fieldId, columns, fixedRows });
  };

  const saveGridColumns = () => {
    if (!gridManager) return;
    const { sectionId, fieldId, columns, fixedRows } = gridManager;
    const rowArray = fixedRows.split('\n').map(r => r.trim()).filter(r => r !== '');
    
    // Yalnızca array kaydetmek yerine object kaydet
    const optionsObj: any = { columns: columns };
    if (rowArray.length > 0) optionsObj.fixedRows = rowArray;
    
    const optionsJson = JSON.stringify(optionsObj);
    updateField(sectionId, fieldId, { optionsJson });
    setGridManager(null);
  };

  const [fileManager, setFileManager] = useState<{ secId: string, fieldId: string, settings: { maxSizeMB: number, allowedExtensions: string } } | null>(null);

  const openFileManager = (secId: string, fieldId: string, optionsJson?: string) => {
    let settings = { maxSizeMB: 10, allowedExtensions: '.pdf,.png,.jpg' };
    if (optionsJson) {
      try { 
        const parsed = JSON.parse(optionsJson); 
        if (parsed.maxSizeMB) settings.maxSizeMB = parsed.maxSizeMB;
        if (parsed.allowedExtensions) settings.allowedExtensions = parsed.allowedExtensions;
      } catch {}
    }
    setFileManager({ secId, fieldId, settings });
  };

  const saveFileSettings = () => {
    if (fileManager) {
      updateField(fileManager.secId, fileManager.fieldId, { optionsJson: JSON.stringify(fileManager.settings) });
      setFileManager(null);
    }
  };

  const [autoFillManager, setAutoFillManager] = useState<{ secId: string, fieldId: string, settings: any } | null>(null);

  const openAutoFillManager = (secId: string, fieldId: string, autoFillJson?: string) => {
    let settings = { queryId: '', inputMappings: {}, outputMappings: [] };
    if (autoFillJson) {
      try { 
        settings = JSON.parse(autoFillJson); 
      } catch {}
    }
    setAutoFillManager({ secId, fieldId, settings });
  };

  const saveAutoFillSettings = () => {
    if (autoFillManager) {
      updateField(autoFillManager.secId, autoFillManager.fieldId, { autoFillJson: JSON.stringify(autoFillManager.settings) });
      setAutoFillManager(null);
    }
  };

  // Load Existing Templates for reference listing
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['adminFormTemplates'],
    queryFn: systemAdminService.getTemplates
  });

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['adminRolesLookup'],
    queryFn: systemAdminService.getRolesLookup
  });

  const { data: integrationQueries = [], isLoading: integrationQueriesLoading } = useQuery({
    queryKey: ['integrationQueriesLookup'],
    queryFn: () => integrationQueryService.getLookup()
  });

  const searchLower = searchTerm.toLocaleLowerCase('tr-TR');
  const filteredTemplates = templates.filter((t: any) => 
    t.name?.toLocaleLowerCase('tr-TR').includes(searchLower) || 
    t.code?.toLocaleLowerCase('tr-TR').includes(searchLower)
  );
  const totalTemplateCount = templates.length;
  const activeTemplateCount = templates.filter((t: any) => t.active).length;
  const totalFieldCount = templates.reduce((sum: number, t: any) => sum + (Number(t.fieldCount) || 0), 0);
  const totalWorkflowStepCount = templates.reduce((sum: number, t: any) => sum + (Number(t.workflowStepCount) || 0), 0);
  const designedSectionCount = sections.length;
  const designedFieldCount = sections.reduce((sum, section) => sum + section.fields.length, 0);
  const requiredFieldCount = sections.reduce((sum, section) => sum + section.fields.filter(field => field.isRequired).length, 0);
  const activeTabLabel = activeTab === 'list' ? 'Kayıtlı Formlar' : activeTab === 'designer' ? 'Form Mimarı' : 'Canlı Önizleme';
  const activeTabDescription = activeTab === 'list'
    ? 'Sistemdeki şablonları yönetin, aktiflik durumunu kontrol edin ve detaylarını inceleyin.'
    : activeTab === 'designer'
      ? 'Form kimliğini, yetkileri, bölümleri ve alanları tek çalışma alanında kurgulayın.'
      : 'Tasarladığınız formun kullanıcıya nasıl görüneceğini yayınlamadan önce test edin.';

  const statusMutation = useMutation({
    mutationFn: ({ formTypeId, active }: { formTypeId: string, active: boolean }) => systemAdminService.setTemplateStatus(formTypeId, active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFormTemplates'] });
    }
  });

  const saveMutation = useMutation({
    mutationFn: (payload: FormTemplateUpsertDto) => systemAdminService.saveTemplateDetailed(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFormTemplates'] });
      setSaveMessage({ type: 'success', text: 'Form şablonu başarıyla kaydedildi!' });
      setTimeout(() => setSaveMessage(null), 3000);
      handleReset();
    },
    onError: () => {
      setSaveMessage({ type: 'error', text: 'Kayıt sırasında bir hata oluştu.' });
    }
  });

  const handlePreviewTemplate = async (template: any) => {
    try {
      const detailed = await systemAdminService.getTemplateDetailed(template.code);
      
      setCode(detailed.code || template.code);
      setName(detailed.name || template.name);
      setSystemUsageType(detailed.systemUsageType || '');
      if (detailed.allowedCreateRoleCodes) setAllowedCreateRoleCodes(detailed.allowedCreateRoleCodes);
      
      if (detailed.sections && detailed.sections.length > 0) {
        const mappedSections = detailed.sections.map((sec: any) => ({
          id: sec.sectionId || generateUUID(),
          title: sec.title,
          fields: sec.fields?.map((f: any) => ({
            id: f.fieldId || generateUUID(),
            fieldKey: f.key || f.fieldKey,
            label: f.label,
            fieldType: f.fieldType,
            isRequired: f.isRequired,
            optionsJson: f.fieldType === 4 ? formatOptionsToCsv(f.optionsJson) : (f.fieldType === 13 && f.optionsJson ? (() => { try { const p = JSON.parse(f.optionsJson); return p && p.html !== undefined ? p.html : f.optionsJson; } catch { return f.optionsJson; } })() : f.optionsJson),
            autoFillJson: f.autoFillJson,
            placeholder: f.placeholder,
            colSpan: f.colSpan || f.ColSpan || 12
          })) || []
        }));
        setSections(mappedSections);
      } else {
        setSections([{ id: generateUUID(), title: 'Genel Bilgiler', fields: [] }]);
      }
      
      setActiveTab('preview');
    } catch (err) {
      console.error("Önizleme yüklenirken hata:", err);
      alert("Form detayı yüklenemedi. Lütfen daha sonra tekrar deneyin.");
    }
  };

  // Actions
  const handleReset = () => {
    setCode('');
    setName('');
    setSystemUsageType('');
    setIsActive(true);
    setAllowedCreateRoleCodes([]);
    setAllowedReportRoleCodes([]);
    setSections([{ id: generateUUID(), title: 'Genel Bilgiler', fields: [] }]);
  };

  const loadPreset = () => {
    setCode('LEAVE_REQ');
    setName('Yıllık İzin Formu');
    setIsActive(true);
    setAllowedCreateRoleCodes([]);
    setAllowedReportRoleCodes(['HR', 'IK', 'Admin']);
    setSections([
      {
        id: generateUUID(),
        title: 'Temel İzin Bilgileri',
        fields: [
          { id: generateUUID(), fieldKey: 'leave_type', label: 'İzin Türü', fieldType: 4, isRequired: true, optionsJson: 'Yıllık İzin,Mazeret İzni,Hastalık İzni' },
          { id: generateUUID(), fieldKey: 'start_date', label: 'Başlangıç Tarihi', fieldType: 5, isRequired: true }
        ]
      },
      {
        id: generateUUID(),
        title: 'Ek Detaylar',
        fields: [
          { id: generateUUID(), fieldKey: 'reason', label: 'Açıklama / Mazeret', fieldType: 2, isRequired: false, placeholder: 'Eklemek istedikleriniz...' }
        ]
      }
    ]);
  };

  const addSection = () => {
    setSections([...sections, { id: generateUUID(), title: `Yeni Bölüm ${sections.length + 1}`, fields: [] }]);
  };

  const updateSectionTitle = (secId: string, val: string) => {
    setSections(sections.map(s => s.id === secId ? { ...s, title: val } : s));
  };

  const removeSection = (secId: string) => {
    setSections(sections.filter(s => s.id !== secId));
  };

  const addField = (secId: string) => {
    setSections(sections.map(s => {
      if (s.id === secId) {
        return {
          ...s,
          fields: [...s.fields, { 
            id: generateUUID(), 
            fieldKey: `field_${Math.floor(Math.random() * 1000)}`, 
            label: `Yeni Alan`, 
            fieldType: 1, 
            isRequired: false,
            colSpan: 12
          }]
        };
      }
      return s;
    }));
  };

  const updateField = (secId: string, fieldId: string, updates: Partial<FieldState>) => {
    setSections(sections.map(s => {
      if (s.id === secId) {
        return {
          ...s,
          fields: s.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f)
        };
      }
      return s;
    }));
  };

  const removeField = (secId: string, fieldId: string) => {
    setSections(sections.map(s => {
      if (s.id === secId) {
        return { ...s, fields: s.fields.filter(f => f.id !== fieldId) };
      }
      return s;
    }));
  };

  // --- Drag and Drop Handlers for Sections ---
  const [draggedSectionIndex, setDraggedSectionIndex] = useState<number | null>(null);
  const [draggableSectionId, setDraggableSectionId] = useState<string | null>(null);

  /**
   * Bölüm sürükleme işlemi başladığında tetiklenir.
   */
  const handleSectionDragStart = (e: React.DragEvent, index: number) => {
    // Sadece Grip icon'dan veya başlıktan tutulduğunda sürüklenmesi için hedefin input/select olmamasını sağlayabiliriz
    // Ancak en pratik yol event nesnesinden veri transferi başlatmaktır.
    e.dataTransfer.effectAllowed = 'move';
    setDraggedSectionIndex(index);
  };

  /**
   * Sürüklenen bölüm başka bir bölümün üzerine geldiğinde tetiklenir.
   */
  const handleSectionDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Sürüklenen objenin bırakılmasına izin ver
    e.dataTransfer.dropEffect = 'move';
  };

  /**
   * Sürüklenen bölüm yeni konumuna bırakıldığında tetiklenir ve diziyi günceller.
   */
  const handleSectionDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedSectionIndex === null || draggedSectionIndex === dropIndex) {
      setDraggedSectionIndex(null);
      return;
    }
    const newSections = [...sections];
    const draggedItem = newSections[draggedSectionIndex];
    newSections.splice(draggedSectionIndex, 1);
    newSections.splice(dropIndex, 0, draggedItem);
    setSections(newSections);
    setDraggedSectionIndex(null);
  };

  // --- Drag and Drop Handlers for Fields ---
  const [draggedField, setDraggedField] = useState<{ secId: string, index: number } | null>(null);
  const [draggableFieldId, setDraggableFieldId] = useState<string | null>(null);

  /**
   * Alan (field) sürükleme işlemi başladığında tetiklenir.
   */
  const handleFieldDragStart = (e: React.DragEvent, secId: string, index: number) => {
    e.stopPropagation(); // Parent section sürüklenmesini engelle
    e.dataTransfer.effectAllowed = 'move';
    setDraggedField({ secId, index });
  };

  /**
   * Sürüklenen alan satırı başka bir satırın üzerine geldiğinde tetiklenir.
   */
  const handleFieldDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  /**
   * Sürüklenen alan yeni konumuna bırakıldığında tetiklenir ve ilgili bölümün alan listesini günceller.
   * Not: Farklı bölümler (sections) arasına da alan taşınmasına izin verir.
   */
  const handleFieldDrop = (e: React.DragEvent, targetSecId: string, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedField) return;
    
    if (draggedField.secId === targetSecId && draggedField.index === dropIndex) {
      setDraggedField(null);
      return;
    }

    setSections(prevSections => {
      const newSections = JSON.parse(JSON.stringify(prevSections));
      const sourceSection = newSections.find((s: any) => s.id === draggedField.secId);
      const targetSection = newSections.find((s: any) => s.id === targetSecId);

      if (!sourceSection || !targetSection) return prevSections;

      const [movedField] = sourceSection.fields.splice(draggedField.index, 1);
      targetSection.fields.splice(dropIndex, 0, movedField);

      return newSections;
    });
    setDraggedField(null);
  };

  const handleSave = () => {
    if (!code || !name) {
      setSaveMessage({ type: 'error', text: 'Lütfen form kodu ve adı giriniz.' });
      return;
    }

    const hasEmptyKeys = sections.some(s => s.fields.some(f => !f.fieldKey || !f.label));
    if (hasEmptyKeys) {
      setSaveMessage({ type: 'error', text: 'Tüm alanlar için Anahtar (Key) ve Görünen Ad (Label) zorunludur.' });
      return;
    }

    // Build Payload
    const payload: FormTemplateUpsertDto = {
      code,
      name,
      active: isActive,
      sections: sections.map((s, i) => ({ title: s.title, sortOrder: i + 1 })),
      fields: sections.flatMap((s, _sIndex) => 
        s.fields.map((f, fIndex) => ({
          fieldKey: f.fieldKey,
          label: f.label,
          fieldType: f.fieldType,
          isRequired: f.isRequired,
          sortOrder: fIndex + 1,
          sectionTitle: s.title,
          active: true,
          colSpan: f.colSpan,
          calculationRuleJson: f.calculationRuleJson,
          optionsJson: f.fieldType === 4 && f.optionsJson ? JSON.stringify(f.optionsJson.split(',').map(x => ({ Value: x.trim(), Text: x.trim() }))) : (f.fieldType === 13 ? JSON.stringify({ html: f.optionsJson }) : ([10, 11].includes(f.fieldType) ? f.optionsJson : undefined)),
          autoFillJson: f.autoFillJson,
          placeholder: f.placeholder
        }))
      ),
      allowedCreateRoleCodes: allowedCreateRoleCodes.length > 0 ? allowedCreateRoleCodes : undefined,
      allowedReportRoleCodes: allowedReportRoleCodes.length > 0 ? allowedReportRoleCodes : undefined,
      systemUsageType: systemUsageType || undefined
    };

    saveMutation.mutate(payload);
  };

  // Initial Seed
  useEffect(() => {
    handleReset();
  }, []);

  return (
    <PageContainer>
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        <PageHeader 
          title="Form Şablon Tasarımcısı" 
          description="Sürükle bırak benzeri mantıkla dinamik referans formlarınızı tasarlayın, eylem kurallarını belirleyin." 
        className="hidden"
        breadcrumbs={[
          { label: 'Anasayfa', href: '/' },
          { label: 'Sistem & Araçlar', href: '/admin/audit-logs' },
          { label: 'Form Şablon Tasarımcısı' }
        ]}
        actions={
          <div className="flex items-center gap-2">
            <FfButton variant="outline" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={handleReset}>Temizle</FfButton>
            <FfButton variant="outline" leftIcon={<FileType className="h-4 w-4 text-brand-accent" />} onClick={loadPreset}>Örnek Yükle</FfButton>
            <FfButton variant="primary" leftIcon={<Save className="h-4 w-4" />} onClick={handleSave} isLoading={saveMutation.isPending}>Şablonu Kaydet</FfButton>
          </div>
        }
      />

      <div className="relative mb-3 shrink-0 overflow-hidden rounded-3xl border border-orange-100/80 bg-[radial-gradient(circle_at_top_left,rgba(255,122,61,0.14),transparent_34%),linear-gradient(135deg,#fffaf6_0%,#ffffff_48%,#f8fafc_100%)] p-4 shadow-[0_18px_45px_rgba(15,23,42,0.07)] md:p-5">
        <div className="pointer-events-none absolute right-8 top-6 h-24 w-24 rounded-full bg-brand-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-bold text-brand-gray">
              <span>Anasayfa</span>
              <span className="text-brand-gray/40">/</span>
              <span>Sistem & Araçlar</span>
              <span className="text-brand-gray/40">/</span>
              <span className="text-brand-dark">Form Şablon Tasarımcısı</span>
            </div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-brand-primary/20 bg-white/85 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-primary shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Formfleks Design Studio
            </div>
            <h1 className="max-w-3xl text-2xl font-black tracking-tight text-brand-dark md:text-3xl">Form Şablon Tasarımcısı</h1>
            <p className="mt-2 max-w-3xl text-xs font-semibold leading-5 text-brand-gray md:text-sm">
              Dinamik formları, yetki kurgusunu, otomasyon tetiklerini ve canlı önizlemeyi tek bir düzenli çalışma alanında yönetin.
            </p>
          </div>

          <div className="flex flex-col gap-2 xl:items-end">
            <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-white/80 bg-white/80 p-1.5 shadow-sm backdrop-blur">
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-brand-gray">Şablon</p>
                <p className="mt-0.5 text-lg font-black text-brand-dark">{totalTemplateCount}</p>
              </div>
              <div className="rounded-xl bg-emerald-50 px-3 py-2">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">Aktif</p>
                <p className="mt-0.5 text-lg font-black text-emerald-700">{activeTemplateCount}</p>
              </div>
              <div className="rounded-xl bg-orange-50 px-3 py-2">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-brand-primary">Alan</p>
                <p className="mt-0.5 text-lg font-black text-brand-primary">{totalFieldCount}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <FfButton variant="outline" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={handleReset}>Temizle</FfButton>
              <FfButton variant="outline" leftIcon={<FileType className="h-4 w-4 text-brand-accent" />} onClick={loadPreset}>Örnek Yükle</FfButton>
              <FfButton variant="primary" leftIcon={<Save className="h-4 w-4" />} onClick={handleSave} isLoading={saveMutation.isPending}>Şablonu Kaydet</FfButton>
            </div>
          </div>
        </div>
      </div>

      {saveMessage && (
        <div className={`mb-4 mx-2 p-3 rounded-lg flex items-center gap-2 border shadow-sm animate-in fade-in slide-in-from-top-2 ${saveMessage.type === 'success' ? 'bg-status-success/10 text-status-success border-status-success/20' : 'bg-status-danger/10 text-status-danger border-status-danger/20'}`}>
           {saveMessage.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
           <span className="font-medium">{saveMessage.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="hidden">
        <button 
          onClick={() => setActiveTab('list')}
          className={`px-4 py-2 font-semibold text-sm rounded-lg transition-all ${activeTab === 'list' ? 'bg-brand-primary text-white shadow-md' : 'bg-surface-base text-brand-gray hover:bg-surface-hover hover:text-brand-dark'}`}
        >
          <div className="flex items-center gap-2"><List className="h-4 w-4" /> Kayıtlı Formlar</div>
        </button>
        <button 
          onClick={() => setActiveTab('designer')}
          className={`px-4 py-2 font-semibold text-sm rounded-lg transition-all ${activeTab === 'designer' ? 'bg-brand-primary text-white shadow-md' : 'bg-surface-base text-brand-gray hover:bg-surface-hover hover:text-brand-dark'}`}
        >
          <div className="flex items-center gap-2"><Columns className="h-4 w-4" /> Form Mimarı</div>
        </button>
        <button 
          onClick={() => setActiveTab('preview')}
          className={`px-4 py-2 font-semibold text-sm rounded-lg transition-all ${activeTab === 'preview' ? 'bg-brand-primary text-white shadow-md' : 'bg-surface-base text-brand-gray hover:bg-surface-hover hover:text-brand-dark'}`}
        >
          <div className="flex items-center gap-2"><Eye className="h-4 w-4" /> Canlı Önizleme</div>
        </button>
      </div>

      <div className="mb-3 flex flex-col gap-2 rounded-2xl border border-surface-muted bg-white/85 p-1.5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'list' as const, label: 'Kayıtlı Formlar', icon: List, count: filteredTemplates.length },
            { id: 'designer' as const, label: 'Form Mimarı', icon: Columns, count: designedFieldCount },
            { id: 'preview' as const, label: 'Canlı Önizleme', icon: Eye, count: designedSectionCount },
          ].map(tab => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'group inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-extrabold transition-all',
                  isSelected
                    ? 'bg-brand-dark text-white shadow-[0_12px_30px_rgba(15,23,42,0.22)]'
                    : 'bg-transparent text-brand-gray hover:bg-surface-hover hover:text-brand-dark'
                )}
              >
                <span className={cn('grid h-7 w-7 place-items-center rounded-lg transition-colors', isSelected ? 'bg-white/15' : 'bg-surface-hover group-hover:bg-white')}>
                  <Icon className="h-4 w-4" />
                </span>
                {tab.label}
                <span className={cn('rounded-full px-2 py-0.5 text-[11px]', isSelected ? 'bg-white/15 text-white' : 'bg-surface-hover text-brand-gray')}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="hidden rounded-xl bg-surface-hover px-4 py-2 xl:block">
          <p className="text-xs font-black text-brand-dark">{activeTabLabel}</p>
          <p className="text-[11px] font-medium text-brand-gray">{activeTabDescription}</p>
        </div>
      </div>

      {/* Main Content Area */}
      <GlassCard noPadding className="flex-1 min-h-0 flex flex-col overflow-hidden">
        
        {activeTab === 'list' && (
          <div className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 scrollbar-thin md:p-6">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
               <div>
                  <h3 className="text-lg font-bold text-brand-dark">Sistemdeki Tasarlanmış Formlar</h3>
                  <p className="text-sm text-brand-gray">Sistemde varolan şablonları buradan yönetebilir, durdurup başlatabilirsiniz.</p>
               </div>
               <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                 <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <Search className="h-4 w-4 text-brand-gray" />
                   </div>
                   <input
                     type="text"
                     placeholder="Form adı veya kod..."
                     className="block w-full rounded-2xl border border-surface-muted bg-white py-3 pl-10 pr-4 text-sm font-semibold text-brand-dark shadow-sm transition-all placeholder:text-brand-gray/60 focus:border-brand-primary focus:outline-none focus:ring-4 focus:ring-brand-primary/10 sm:w-72"
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                   />
                 </div>
                 <FfButton variant="primary" leftIcon={<Plus className="h-4 w-4"/>} onClick={() => setActiveTab('designer')}>Yeni Tasarım</FfButton>
               </div>
            </div>
            <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-surface-muted bg-white p-4 shadow-sm">
                <p className="text-[11px] font-black uppercase tracking-wider text-brand-gray">Toplam Şablon</p>
                <p className="mt-2 text-2xl font-black text-brand-dark">{totalTemplateCount}</p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 shadow-sm">
                <p className="text-[11px] font-black uppercase tracking-wider text-emerald-700">Kullanımda</p>
                <p className="mt-2 text-2xl font-black text-emerald-700">{activeTemplateCount}</p>
              </div>
              <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4 shadow-sm">
                <p className="text-[11px] font-black uppercase tracking-wider text-brand-primary">Tanımlı Alan</p>
                <p className="mt-2 text-2xl font-black text-brand-primary">{totalFieldCount}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-600">Onay Adımı</p>
                <p className="mt-2 text-2xl font-black text-slate-800">{totalWorkflowStepCount}</p>
              </div>
            </div>
            <div className="overflow-hidden rounded-3xl border border-surface-muted bg-white shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                <table className="w-full text-left text-sm">
                    <thead className="border-b border-surface-muted bg-slate-50/90 text-xs font-black uppercase tracking-wider text-brand-gray">
                        <tr>
                            <th className="px-4 py-3">Form Adı</th>
                            <th className="px-4 py-3">Kod</th>
                            <th className="px-4 py-3 text-center">Alan Sayısı</th>
                            <th className="px-4 py-3 text-center">İşlem Onay Adımı</th>
                            <th className="px-4 py-3 text-center">Kullanıma Açık Mı?</th>
                            <th className="px-4 py-3 text-center">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-muted">
                        {templatesLoading && (
                            <tr>
                                <td colSpan={6} className="text-center py-8 text-brand-gray">Yükleniyor...</td>
                            </tr>
                        )}
                        {!templatesLoading && filteredTemplates.length === 0 && (
                            <tr>
                                <td colSpan={6} className="text-center py-8 text-brand-gray">
                                  {searchTerm ? 'Arama kriterinize uygun form bulunamadı.' : 'Kayıtlı hiçbir form şablonu bulunmuyor.'}
                                </td>
                            </tr>
                        )}
                        {filteredTemplates?.map((t: any) => (
                            <tr key={t.formTypeId} className="group transition-colors hover:bg-orange-50/45">
                                <td className="px-4 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-primary/10 text-brand-primary">
                                      <PenTool className="h-4 w-4" />
                                    </div>
                                    <div>
                                      <p className="font-black text-brand-dark">{t.name}</p>
                                      <p className="text-xs font-semibold text-brand-gray">{t.active ? 'Yayında ve kullanılabilir' : 'Pasif durumda'}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <span className="rounded-xl bg-slate-100 px-3 py-1.5 font-mono text-xs font-bold text-slate-700">{t.code}</span>
                                </td>
                                <td className="px-4 py-4 text-center">
                                  <span className="inline-flex min-w-12 justify-center rounded-full bg-orange-50 px-3 py-1 text-sm font-black text-brand-primary">{t.fieldCount}</span>
                                </td>
                                <td className="px-4 py-4 text-center text-brand-gray">
                                  <span className="inline-flex items-center gap-1 rounded-full border border-surface-muted bg-white px-3 py-1 text-xs font-bold text-brand-dark">
                                    <Workflow className="h-3.5 w-3.5 text-brand-gray" />
                                    {t.workflowStepCount} Adım
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center flex justify-center">
                                    <label className="relative inline-flex items-center cursor-pointer" title={t.active ? "Kapat" : "Aç"}>
                                        <input 
                                           type="checkbox" 
                                           checked={t.active} 
                                           disabled={statusMutation.isPending}
                                           onChange={(e) => statusMutation.mutate({ formTypeId: t.formTypeId, active: e.target.checked })} 
                                           className="sr-only peer" 
                                        />
                                        <div className="w-9 h-5 bg-surface-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-base after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-status-success"></div>
                                    </label>
                                </td>
                                <td className="px-4 py-4 text-center">
                                    <button 
                                      onClick={() => handlePreviewTemplate(t)}
                                      className="inline-flex items-center gap-1 rounded-xl bg-brand-primary/10 px-3 py-2 text-xs font-black text-brand-primary transition-colors hover:bg-brand-primary hover:text-white"
                                      title="Formu Önizle ve İncele"
                                    >
                                      <Eye className="h-3.5 w-3.5" /> Önizle
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
        )}

        {activeTab === 'designer' && (
          <div className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-3 scrollbar-thin md:p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-surface-muted bg-white px-4 py-2 shadow-sm">
              <span className="rounded-full bg-orange-50 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-brand-primary">Form Mimarı</span>
              <span className="max-w-[360px] truncate text-sm font-black text-brand-dark">{name || 'Henüz isim verilmedi'}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-bold text-slate-700">{code || 'FORM_KODU'}</span>
              <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-brand-gray">{designedSectionCount} bölüm</span>
              <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-brand-primary">{designedFieldCount} alan</span>
              <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-status-danger">{requiredFieldCount} zorunlu</span>
              <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-bold', isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-brand-gray')}>
                {isActive ? 'Kullanımda' : 'Pasif'}
              </span>
            </div>
            <div className="hidden">
              <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
                <div className="mb-4 flex items-center justify-between">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-primary/10 text-brand-primary">
                    <PenTool className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-orange-50 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-brand-primary">Kimlik</span>
                </div>
                <p className="text-xs font-black uppercase tracking-wider text-brand-gray">Aktif Şablon</p>
                <p className="mt-1 truncate text-lg font-black text-brand-dark">{name || 'Henüz isim verilmedi'}</p>
                <p className="mt-1 truncate font-mono text-xs font-bold text-brand-gray">{code || 'FORM_KODU_BEKLENIYOR'}</p>
              </div>
              <div className="rounded-3xl border border-surface-muted bg-white p-5 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
                <div className="mb-4 flex items-center justify-between">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                    <Layers3 className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-slate-600">Mimari</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-2xl font-black text-brand-dark">{designedSectionCount}</p>
                    <p className="text-[11px] font-bold text-brand-gray">Bölüm</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-brand-primary">{designedFieldCount}</p>
                    <p className="text-[11px] font-bold text-brand-gray">Alan</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-status-danger">{requiredFieldCount}</p>
                    <p className="text-[11px] font-bold text-brand-gray">Zorunlu</p>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-emerald-100 bg-emerald-50/60 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
                <div className="mb-4 flex items-center justify-between">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-emerald-700 shadow-sm">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-emerald-700">Erişim</span>
                </div>
                <p className="text-xs font-black uppercase tracking-wider text-emerald-800/70">Form Durumu</p>
                <p className="mt-1 text-lg font-black text-emerald-800">{isActive ? 'Kullanıma açık' : 'Pasif taslak'}</p>
                <p className="mt-1 text-xs font-semibold text-emerald-800/70">{allowedCreateRoleCodes.length || 'Tüm'} rol doldurabilir, {allowedReportRoleCodes.length || 'tüm'} rol raporlayabilir.</p>
              </div>
            </div>
            
            {/* Form Meta */}
            <div className="mb-3 rounded-2xl border border-surface-muted bg-white p-3 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-4">
                        <label className="block text-xs font-bold text-brand-gray uppercase tracking-wider mb-2">Form Kodu (Unique)</label>
                        <input type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/\s/g, '_'))} className="w-full px-4 py-2.5 bg-surface-base border border-surface-muted rounded-lg text-brand-dark font-mono font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all shadow-sm" placeholder="Örn: LEAVE_REQ" />
                    </div>
                    <div className="md:col-span-5">
                        <label className="block text-xs font-bold text-brand-gray uppercase tracking-wider mb-2">Form Görünen Adı</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2.5 bg-surface-base border border-surface-muted rounded-lg text-brand-dark font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all shadow-sm" placeholder="Örn: Yıllık İzin Formu" />
                    </div>
                    <div className="md:col-span-3 pb-2 pt-4 md:pt-0">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="sr-only peer" />
                            <div className="w-11 h-6 bg-surface-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-base after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-status-success"></div>
                            <span className="ml-3 text-sm font-bold text-brand-dark">Kullanıma Açık Mı?</span>
                        </label>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end mt-3">
                    <div className="md:col-span-12">
                        <label className="block text-xs font-bold text-brand-gray uppercase tracking-wider mb-2">Sistem Otomasyonu (Arka Plan Görevi) Tetiklemesi</label>
                        <select 
                            value={systemUsageType} 
                            onChange={e => setSystemUsageType(e.target.value)}
                            className="w-full px-4 py-2.5 bg-surface-base border border-surface-muted rounded-lg text-brand-dark font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all shadow-sm"
                        >
                            <option value="">(Yok) Manuel Doldurulacak Standart Form</option>
                            <option value="2_AY_DENEME">2 Aylık Deneme Süresi Değerlendirme Formu</option>
                            <option value="6_AY_DENEME">6 Aylık Deneme Süresi Değerlendirme Formu</option>
                        </select>
                        <p className="text-[11px] text-brand-gray mt-1">Eğer bu şablon sistem tarafından (ikinci/altıncı ay vb.) personellere otomatik atanacaksa, lütfen buradan ilgili senaryoyu seçiniz.</p>
                    </div>
                </div>
            </div>

            {/* Authorization Settings */}
            <div className="mb-3 max-h-36 overflow-y-auto rounded-2xl border border-surface-muted bg-white p-3 shadow-sm scrollbar-thin">
                <h4 className="text-sm font-bold text-brand-dark mb-2 flex items-center gap-2">
                   <Settings className="h-4 w-4 text-brand-gray" /> Form Yetki & Erişim Ayarları
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-bold text-brand-gray uppercase tracking-wider mb-3">Formu Kimler Doldurabilir? <span className="text-brand-gray/60 normal-case font-normal">(Boşsa Herkes)</span></label>
                        {rolesLoading ? (
                            <div className="text-sm text-brand-gray">Roller yükleniyor...</div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {roles.filter((r: any) => !['admin', 'administrator'].includes(r.code.toLowerCase())).map((r: any) => {
                                    const isSelected = allowedCreateRoleCodes.includes(r.code);
                                    return (
                                        <label key={r.code} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${isSelected ? 'bg-brand-primary/10 border-brand-primary/40 text-brand-primary shadow-sm' : 'bg-surface-base border-surface-muted text-brand-gray hover:border-brand-gray/40'}`}>
                                            <input 
                                                type="checkbox" 
                                                className="hidden" 
                                                checked={isSelected} 
                                                onChange={(e) => {
                                                    if (e.target.checked) setAllowedCreateRoleCodes([...allowedCreateRoleCodes, r.code]);
                                                    else setAllowedCreateRoleCodes(allowedCreateRoleCodes.filter(c => c !== r.code));
                                                }} 
                                            />
                                            <div className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center border transition-colors ${isSelected ? 'bg-brand-primary border-brand-primary text-white' : 'border-brand-gray/40 bg-surface-base'}`}>
                                                {isSelected && <CheckCircle2 className="w-3 h-3" />}
                                            </div>
                                            <span className="text-sm font-semibold">{r.name}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-brand-gray uppercase tracking-wider mb-3">Raporları Kimler Görebilir? <span className="text-brand-gray/60 normal-case font-normal">(Boşsa Herkes)</span></label>
                        {rolesLoading ? (
                            <div className="text-sm text-brand-gray">Roller yükleniyor...</div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {roles.filter((r: any) => !['admin', 'administrator'].includes(r.code.toLowerCase())).map((r: any) => {
                                    const isSelected = allowedReportRoleCodes.includes(r.code);
                                    return (
                                        <label key={r.code} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${isSelected ? 'bg-brand-accent/10 border-brand-accent/40 text-brand-accent shadow-sm' : 'bg-surface-base border-surface-muted text-brand-gray hover:border-brand-gray/40'}`}>
                                            <input 
                                                type="checkbox" 
                                                className="hidden" 
                                                checked={isSelected} 
                                                onChange={(e) => {
                                                    if (e.target.checked) setAllowedReportRoleCodes([...allowedReportRoleCodes, r.code]);
                                                    else setAllowedReportRoleCodes(allowedReportRoleCodes.filter(c => c !== r.code));
                                                }} 
                                            />
                                            <div className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center border transition-colors ${isSelected ? 'bg-brand-accent border-brand-accent text-white' : 'border-brand-gray/40 bg-surface-base'}`}>
                                                {isSelected && <CheckCircle2 className="w-3 h-3" />}
                                            </div>
                                            <span className="text-sm font-semibold">{r.name}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                        <p className="text-xs text-brand-gray mt-4 font-medium">Bu formu listeleyen rapor veya dashboardlarda geçerlidir.</p>
                    </div>
                </div>
            </div>

            {/* Sections Header */}
            <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-lg font-black text-brand-dark">
                    <Columns className="h-5 w-5 text-brand-accent" /> Dinamik Bölümler
                </h3>
                <FfButton variant="outline" size="sm" onClick={addSection} leftIcon={<Plus className="h-4 w-4" />}>Bölüm Ekle</FfButton>
            </div>

            {sections.length === 0 ? (
                <div className="text-center py-12 px-4 border-2 border-dashed border-surface-muted rounded-xl bg-surface-hover/30">
                    <Settings className="h-10 w-10 text-brand-gray/40 mx-auto mb-3" />
                    <h4 className="text-brand-dark font-bold text-lg mb-1">Hiç bölüm bulunmuyor</h4>
                    <p className="text-brand-gray text-sm">Form tasarlamaya başlamak için yukarıdaki 'Bölüm Ekle' butonunu kullanın.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {sections.map((section, sIdx) => (
                        <div 
                           key={section.id} 
                           draggable={draggableSectionId === section.id}
                           onDragStart={(e) => handleSectionDragStart(e, sIdx)}
                           onDragOver={handleSectionDragOver}
                           onDrop={(e) => handleSectionDrop(e, sIdx)}
                           onDragEnd={() => setDraggableSectionId(null)}
                           className={`group flex flex-col overflow-hidden rounded-3xl border border-surface-muted bg-white shadow-[0_16px_36px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-0.5 hover:border-brand-primary/40 ${draggedSectionIndex === sIdx ? 'opacity-50 border-brand-primary border-dashed border-2' : ''}`}
                        >
                            
                            {/* Section Header */}
                            <div className="flex items-center justify-between gap-4 border-b border-surface-muted bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_48%,#f8fafc_100%)] px-4 py-3">
                                <div className="flex items-center gap-3 flex-1">
                                    <div 
                                      onMouseDown={() => setDraggableSectionId(section.id)}
                                      onMouseUp={() => setDraggableSectionId(null)}
                                      className="cursor-move p-1 -ml-1 rounded hover:bg-brand-gray/10 transition-colors"
                                      title="Sürükleyip Bırakabilirsiniz"
                                    >
                                        <GripVertical className="h-5 w-5 text-brand-gray opacity-50 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <div className="flex-1 w-full max-w-sm">
                                        <input 
                                          type="text" 
                                          value={section.title} 
                                          onChange={e => updateSectionTitle(section.id, e.target.value)}
                                          className="w-full rounded-xl border border-surface-muted bg-white px-3 py-2 font-black text-brand-dark shadow-sm focus:outline-none focus:ring-4 focus:ring-brand-primary/10"
                                          placeholder="Bölüm Başlığı"
                                        />
                                    </div>
                                    <span className="text-xs font-semibold text-brand-gray/50 bg-surface-base px-2 py-1 rounded border border-surface-muted">Bölüm {sIdx + 1}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => removeSection(section.id)} className="p-1.5 text-brand-gray hover:text-status-danger hover:bg-status-danger/10 rounded-md transition-colors" title="Bölümü Sil">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                    <div className="h-5 w-px bg-surface-muted mx-1"></div>
                                    <FfButton variant="primary" size="sm" onClick={() => addField(section.id)} leftIcon={<Plus className="h-3.5 w-3.5" />}>Alan Ekle</FfButton>
                                </div>
                            </div>

                            {/* Section Fields Wrapper */}
                            <div className="p-0">
                                {section.fields.length === 0 ? (
                                    <div className="text-center py-6 text-sm text-brand-gray">
                                        Bu bölüme henüz alan eklenmedi.
                                    </div>
                                ) : (
                                    <div className="w-full overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="border-b border-surface-muted bg-slate-50/80 text-xs font-black uppercase tracking-wider text-brand-gray">
                                                <tr>
                                                    <th className="px-4 py-3 w-12 text-center">#</th>
                                                    <th className="px-4 py-3 min-w-[140px]">Değişken Key</th>
                                                    <th className="px-4 py-3 min-w-[160px]">Alan Görünümü</th>
                                                    <th className="px-4 py-3 w-40">Veri Tipi</th>
                                                    <th className="px-4 py-3 w-24 text-center">Zorunlu</th>
                                                    <th className="px-4 py-3 min-w-[180px]">Opsiyonlar / Placeholder</th>
                                                    <th className="px-4 py-3 w-16 text-center">İşlem</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-surface-muted">
                                                {section.fields.map((f, fIdx) => (
                                                    <tr 
                                                        key={f.id} 
                                                        draggable={draggableFieldId === f.id}
                                                        onDragStart={(e) => handleFieldDragStart(e, section.id, fIdx)}
                                                        onDragOver={handleFieldDragOver}
                                                        onDrop={(e) => handleFieldDrop(e, section.id, fIdx)}
                                                        onDragEnd={() => setDraggableFieldId(null)}
                                                        className={`group/row transition-colors hover:bg-orange-50/45 ${draggableFieldId === f.id ? 'cursor-move' : ''} ${draggedField?.secId === section.id && draggedField?.index === fIdx ? 'opacity-50 bg-brand-primary/10' : ''}`}
                                                    >
                                                        <td className="px-4 py-2 text-center font-bold text-brand-gray/50 w-16">
                                                            <div 
                                                              onMouseDown={() => setDraggableFieldId(f.id)}
                                                              onMouseUp={() => setDraggableFieldId(null)}
                                                              className="inline-flex items-center justify-center cursor-move p-1 -ml-2 rounded hover:bg-brand-gray/10 transition-colors"
                                                              title="Sürükleyip Bırakabilirsiniz"
                                                            >
                                                                <GripVertical className="h-4 w-4 text-brand-gray/40 mr-1" />
                                                                {fIdx + 1}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            <input type="text" value={f.fieldKey} onChange={e => updateField(section.id, f.id, { fieldKey: e.target.value.toLowerCase().replace(/\s/g, '_') })} className="w-full bg-surface-hover border-none rounded px-2 py-1.5 focus:ring-1 focus:ring-brand-primary text-brand-dark font-mono text-xs" placeholder="my_key" />
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            <input type="text" value={f.label} onChange={e => updateField(section.id, f.id, { label: e.target.value })} className="w-full bg-surface-hover border-none rounded px-2 py-1.5 focus:ring-1 focus:ring-brand-primary text-brand-dark font-medium" placeholder="Örn: Ad Soyad" />
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            <select value={f.fieldType} onChange={e => updateField(section.id, f.id, { fieldType: Number(e.target.value) })} className="w-full bg-surface-hover border-none rounded px-2 py-1.5 focus:ring-1 focus:ring-brand-primary text-brand-dark text-sm">
                                                                <option value={1}>Kısa Metin</option>
                                                                <option value={2}>Uzun Metin</option>
                                                                <option value={3}>Onay Kutusu</option>
                                                                <option value={4}>Açılır Liste</option>
                                                                <option value={5}>Tarih</option>
                                                                <option value={6}>Saat</option>
                                                                <option value={7}>Tarih & Saat</option>
                                                                <option value={8}>Sayı</option>
                                                                <option value={10}>Dosya</option>
                                                                <option value={11}>Tablo (Grid)</option>
                                                                <option value={12}>Hesaplamalı Alan (Formül)</option>
                                                                <option value={13}>Statik Bilgi Metni</option>
                                                            </select>
                                                            <div className="mt-1 flex items-center justify-between text-xs text-brand-gray">
                                                                <span>Genişlik:</span>
                                                                <select value={f.colSpan || 12} onChange={e => updateField(section.id, f.id, { colSpan: Number(e.target.value) })} className="w-16 bg-surface-hover border-none rounded px-1 py-1 focus:ring-1 focus:ring-brand-primary text-brand-dark">
                                                                    {[1, 2, 3, 4, 6, 12].map(col => <option key={col} value={col}>{col}/12</option>)}
                                                                </select>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2 text-center">
                                                            <input type="checkbox" checked={f.isRequired} onChange={e => updateField(section.id, f.id, { isRequired: e.target.checked })} className="rounded border-surface-muted text-brand-primary focus:ring-brand-primary/50 h-4 w-4" />
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            {f.fieldType === 11 ? (
                                                                <FfButton size="sm" variant="outline" onClick={() => openGridManager(section.id, f.id, f.optionsJson)}>
                                                                    Tablo Ayarları
                                                                </FfButton>
                                                            ) : f.fieldType === 10 ? (
                                                                <FfButton size="sm" variant="outline" onClick={() => openFileManager(section.id, f.id, f.optionsJson)}>
                                                                    Dosya Ayarları
                                                                </FfButton>
                                                            ) : f.fieldType === 4 ? (
                                                                <input type="text" value={f.optionsJson || ''} onChange={e => updateField(section.id, f.id, { optionsJson: e.target.value })} className="w-full bg-surface-hover border-none rounded px-2 py-1.5 focus:ring-1 focus:ring-brand-primary text-brand-dark text-xs" placeholder="A,B,C (Virgülle ayırın)" />
                                                            ) : f.fieldType === 12 ? (
                                                                <input type="text" value={f.calculationRuleJson || ''} onChange={e => updateField(section.id, f.id, { calculationRuleJson: e.target.value })} className="w-full bg-surface-hover border-none rounded px-2 py-1.5 focus:ring-1 focus:ring-brand-primary text-brand-dark text-xs font-mono" placeholder="Örn: (not1 + not2)/2" />
                                                            ) : f.fieldType === 13 ? (
                                                                <input type="text" value={f.optionsJson || ''} onChange={e => updateField(section.id, f.id, { optionsJson: e.target.value })} className="w-full bg-surface-hover border-none rounded px-2 py-1.5 focus:ring-1 focus:ring-brand-primary text-brand-dark text-xs" placeholder="Metin veya <p>HTML</p>" />
                                                            ) : (
                                                                <input type="text" value={f.placeholder || ''} onChange={e => updateField(section.id, f.id, { placeholder: e.target.value })} className="w-full bg-surface-hover border-none rounded px-2 py-1.5 focus:ring-1 focus:ring-brand-primary text-brand-dark text-xs" placeholder="Placeholder..." />
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2 text-center">
                                                            <button onClick={() => openAutoFillManager(section.id, f.id, f.autoFillJson)} className={`p-1 rounded transition-colors ${f.autoFillJson ? 'text-brand-primary' : 'text-brand-gray hover:text-brand-primary opacity-0 group-hover/row:opacity-100 focus:opacity-100'}`} title="Dış Veri Kaynağı (Otomatik Doldurma)">
                                                                <Database className="h-4 w-4" />
                                                            </button>
                                                            <button onClick={() => removeField(section.id, f.id)} className="text-brand-gray hover:text-status-danger p-1 rounded transition-colors opacity-0 group-hover/row:opacity-100 focus:opacity-100">
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
          </div>
        )}

        {/* Canlı Önizleme Alanı */}
        {activeTab === 'preview' && (
          <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(255,122,61,0.12),transparent_35%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] p-4 scrollbar-thin md:p-8">
            <div className="mx-auto mb-10 h-max w-full max-w-4xl overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.14)] animate-in zoom-in-95 duration-200">
                <div className="border-b border-orange-100 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_55%,#f8fafc_100%)] px-6 py-5">
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-wider text-brand-primary shadow-sm">
                      <Eye className="h-3.5 w-3.5" />
                      Kullanıcı Görünümü
                    </div>
                    <h2 className="text-2xl font-black tracking-tight text-brand-dark">{name || 'İsimsiz Form'}</h2>
                    <p className="mt-1 text-sm font-medium text-brand-gray">Bu alan form doldurucunun göreceği görsel karşılıktır.</p>
                </div>
                
                <div className="space-y-8 p-6 md:p-8">
                    {sections.length === 0 || sections.every(s => s.fields.length === 0) ? (
                        <div className="text-center py-10 text-brand-gray flex flex-col items-center">
                            <Eye className="h-12 w-12 opacity-20 mb-4" />
                            Görüntülenecek form elemanı yok.
                        </div>
                    ) : (
                        sections.map(sec => (
                            <div key={sec.id} className="relative">
                                {sec.title && <h3 className="text-base flex items-center gap-3 font-bold text-brand-primary mb-5"><span className="w-2 h-2 rounded-full bg-brand-accent"></span>{sec.title}</h3>}
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                                    {sec.fields.map(f => {
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
                                        }[f.colSpan || 12] || 'md:col-span-12';
                                        
                                        return (
                                        <div key={f.id} className={colSpanClass}>
                                            <div className="flex flex-col gap-1.5">
                                                {f.fieldType !== 13 && (
                                                    <label className="text-sm font-semibold text-brand-dark flex items-center justify-between">
                                                        <span>{f.label} {f.isRequired && <span className="text-status-danger">*</span>}</span>
                                                        {f.fieldType === 12 && <span className="text-xs bg-brand-primary/10 text-brand-primary px-2 py-0.5 rounded-full">Hesaplama</span>}
                                                    </label>
                                                )}
                                                
                                                {/* Preview Render Dummies based on type */}
                                                {f.fieldType === 1 && <input type="text" disabled placeholder={f.placeholder} className="w-full bg-surface-hover border border-surface-muted rounded-lg px-3 py-2 text-sm text-brand-gray cursor-not-allowed" />}
                                                {f.fieldType === 2 && <textarea disabled placeholder={f.placeholder} rows={3} className="w-full bg-surface-hover border border-surface-muted rounded-lg px-3 py-2 text-sm text-brand-gray cursor-not-allowed resize-none" />}
                                                {f.fieldType === 3 && (
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <input type="checkbox" disabled className="h-4 w-4 rounded border-gray-300 pointer-events-none" />
                                                        <span className="text-sm text-brand-gray">{f.placeholder || 'Onaylıyorum'}</span>
                                                    </div>
                                                )}
                                                {f.fieldType === 4 && (
                                                    <select disabled className="w-full bg-surface-hover border border-surface-muted rounded-lg px-3 py-2 text-sm text-brand-gray cursor-not-allowed appearance-none">
                                                        {f.optionsJson ? f.optionsJson.split(',').map((o, i) => <option key={i}>{o.trim()}</option>) : <option>Seçim Yapınız</option>}
                                                    </select>
                                                )}
                                                {[5, 6, 7].includes(f.fieldType) && (
                                                    <input type={f.fieldType === 5 ? 'date' : f.fieldType === 6 ? 'time' : 'datetime-local'} disabled className="w-full bg-surface-hover border border-surface-muted rounded-lg px-3 py-2 text-sm text-brand-gray cursor-not-allowed opacity-70" />
                                                )}
                                                {f.fieldType === 8 && <input type="number" disabled placeholder={f.placeholder} className="w-full bg-surface-hover border border-surface-muted rounded-lg px-3 py-2 text-sm text-brand-gray cursor-not-allowed" />}
                                                {f.fieldType === 10 && (
                                                    <div className="border border-dashed border-surface-muted bg-surface-hover rounded-lg px-3 py-4 text-center text-xs text-brand-gray/70">
                                                        Dosya Yükleme Alanı
                                                    </div>
                                                )}
                                                {f.fieldType === 11 && (
                                                    <FormProvider {...methods}>
                                                        <FfDynamicGridField
                                                            name={`preview_${f.id}`}
                                                            label=""
                                                            required={f.isRequired}
                                                            columnsSchema={f.optionsJson ? (function(){
                                                                try {
                                                                    const parsed = JSON.parse(f.optionsJson);
                                                                    return Array.isArray(parsed) ? parsed : (parsed.columns || []);
                                                                } catch { return []; }
                                                            })() : []}
                                                            optionsJson={f.optionsJson}
                                                        />
                                                    </FormProvider>
                                                )}
                                                {f.fieldType === 12 && (
                                                    <div className="w-full bg-surface-muted border border-surface-muted rounded-lg px-3 py-2 text-brand-dark font-medium cursor-not-allowed">
                                                        -
                                                    </div>
                                                )}
                                                {f.fieldType === 13 && (
                                                    <div className="w-full">
                                                        {f.label && <h4 className="text-sm font-semibold text-brand-dark mb-2">{f.label}</h4>}
                                                        <div className="prose prose-sm max-w-none text-brand-gray/80" dangerouslySetInnerHTML={{ __html: f.optionsJson || '<p>Statik içerik buraya gelecek...</p>' }} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Grid Column Manager Modal */}
      <FfModal 
        isOpen={!!gridManager} 
        onClose={() => setGridManager(null)} 
        title="Grid Kolon Yöneticisi"
        size="lg"
        footer={
          <>
            <FfButton variant="ghost" onClick={() => setGridManager(null)}>İptal</FfButton>
            <FfButton variant="primary" onClick={saveGridColumns}>Kolonları Kaydet</FfButton>
          </>
        }
      >
        {gridManager && (
           <div className="space-y-4">
              <div className="flex justify-end mb-2">
                 <FfButton size="sm" onClick={() => {
                    setGridManager({
                       ...gridManager,
                       columns: [...gridManager.columns, { dataField: `col_${Math.floor(Math.random()*1000)}`, label: 'Yeni Kolon', editorType: 'text', isRequired: false }]
                    })
                 }} leftIcon={<Plus className="h-4 w-4" />}>Kolon Ekle</FfButton>
              </div>
              
              {gridManager.columns.length === 0 ? (
                 <div className="text-center py-8 border-2 border-dashed border-surface-muted text-brand-gray rounded-xl">
                    Henüz grid için kolon tanımlamadınız.
                 </div>
              ) : (
                 <div className="space-y-2">
                    {gridManager.columns.map((col, idx) => (
                       <div key={idx} className="flex flex-wrap md:flex-nowrap gap-2 items-center bg-surface-hover p-2 rounded-lg border border-surface-muted">
                          <input type="text" value={col.dataField} onChange={e => {
                             const newCols = [...gridManager.columns];
                             newCols[idx].dataField = e.target.value.toLowerCase().replace(/\s/g, '_');
                             setGridManager({ ...gridManager, columns: newCols });
                          }} placeholder="Değişken Adı (Key)" className="flex-1 w-full min-w-[120px] px-3 py-2 text-sm border border-surface-muted focus:ring-1 focus:ring-brand-primary rounded bg-surface-base text-brand-dark" />
                          
                          <input type="text" value={col.label} onChange={e => {
                             const newCols = [...gridManager.columns];
                             newCols[idx].label = e.target.value;
                             setGridManager({ ...gridManager, columns: newCols });
                          }} placeholder="Kolon Başlığı" className="flex-1 w-full min-w-[120px] px-3 py-2 text-sm border border-surface-muted focus:ring-1 focus:ring-brand-primary rounded bg-surface-base text-brand-dark" />
                          
                          <select value={col.editorType} onChange={e => {
                             const newCols = [...gridManager.columns];
                             newCols[idx].editorType = e.target.value;
                             setGridManager({ ...gridManager, columns: newCols });
                          }} className="w-full md:w-32 px-3 py-2 text-sm border border-surface-muted focus:ring-1 focus:ring-brand-primary rounded bg-surface-base text-brand-dark">
                             <option value="text">Metin</option>
                             <option value="number">Sayı</option>
                             <option value="date">Tarih</option>
                             <option value="select">Açılır Liste</option>
                          </select>
                          
                          <label className="flex items-center gap-2 text-sm text-brand-dark font-medium whitespace-nowrap px-2">
                             <input type="checkbox" checked={col.isRequired} onChange={e => {
                                const newCols = [...gridManager.columns];
                                newCols[idx].isRequired = e.target.checked;
                                setGridManager({ ...gridManager, columns: newCols });
                             }} className="rounded text-brand-primary focus:ring-brand-primary/50" />
                             Zorunlu
                          </label>
                          
                          {col.editorType === 'select' && (
                             <input type="text" value={col.options || ''} onChange={e => {
                                const newCols = [...gridManager.columns];
                                newCols[idx].options = e.target.value;
                                setGridManager({ ...gridManager, columns: newCols });
                             }} placeholder="Seçenek A, Seçenek B" className="w-full md:w-48 px-3 py-2 text-sm border border-surface-muted focus:ring-1 focus:ring-brand-primary rounded bg-surface-base text-brand-dark" title="Seçenekleri virgülle ayırın" />
                          )}
                          
                          <button onClick={() => {
                             const newCols = gridManager.columns.filter((_, i) => i !== idx);
                             setGridManager({ ...gridManager, columns: newCols });
                          }} className="p-2 text-brand-gray hover:text-status-danger hover:bg-status-danger/10 rounded transition-colors" title="Kolonu Sil">
                              <Trash2 className="h-4 w-4"/>
                          </button>
                       </div>
                    ))}
                 </div>
              )}

              <div className="mt-6 border-t border-surface-muted pt-4">
                 <h4 className="text-sm font-semibold text-brand-dark mb-1">Sabit Satırlar (Rubric Modu)</h4>
                 <p className="text-xs text-brand-gray mb-3">Eğer bu tablonun sabit sorulardan oluşmasını istiyorsanız (Örn: Performans Değerlendirmesi), satır isimlerini her satıra bir tane gelecek şekilde alt alta yazın. Sabit satır tanımlandığında form doldurulurken satır ekleme/silme kapatılır ve bu satırlar varsayılan olarak gelir.</p>
                 <textarea 
                    value={gridManager.fixedRows}
                    onChange={e => setGridManager({ ...gridManager, fixedRows: e.target.value })}
                    className="w-full bg-surface-hover border border-surface-muted rounded-lg px-3 py-2 text-sm text-brand-dark min-h-[120px] focus:ring-1 focus:ring-brand-primary"
                    placeholder="İş Bilgisi ve Teknik Yetkinlik&#10;Verimlilik ve İş Çıktısı Kalitesi&#10;İletişim ve Kurumsal Davranış"
                 />
              </div>
           </div>
        )}
      </FfModal>

      <FfModal isOpen={!!fileManager} onClose={saveFileSettings} title="Dosya Yükleme Ayarları" size="sm"
        footer={
            <div className="flex justify-end gap-3 w-full">
               <FfButton variant="primary" onClick={saveFileSettings} leftIcon={<CheckCircle2 className="h-4 w-4" />}>
                 Kaydet ve Kapat
               </FfButton>
            </div>
        }
      >
        {fileManager && (
            <div className="p-4 space-y-5">
               <div>
                  <label className="block text-xs font-bold text-brand-gray uppercase tracking-wider mb-2">Maksimum Dosya Boyutu (MB)</label>
                  <input type="number" min="1" max="500" value={fileManager.settings.maxSizeMB} onChange={e => setFileManager({...fileManager, settings: {...fileManager.settings, maxSizeMB: Number(e.target.value)}})} className="w-full px-3 py-2 bg-surface-hover border border-surface-muted rounded-lg text-brand-dark font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary/20" />
               </div>
               <div>
                  <label className="block text-xs font-bold text-brand-gray uppercase tracking-wider mb-2">İzin Verilen Uzantılar</label>
                  <input type="text" value={fileManager.settings.allowedExtensions} onChange={e => setFileManager({...fileManager, settings: {...fileManager.settings, allowedExtensions: e.target.value}})} className="w-full px-3 py-2 bg-surface-hover border border-surface-muted rounded-lg text-brand-dark font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary/20" placeholder=".pdf, .jpg, .png" />
                  <p className="text-xs text-brand-gray mt-1">Örnek: .pdf, .jpg, .png, .xlsx</p>
               </div>
            </div>
        )}
      </FfModal>

      <FfModal isOpen={!!autoFillManager} onClose={() => setAutoFillManager(null)} title="Dış Veri Kaynağı (Otomatik Doldurma)" size="md"
        footer={
            <div className="flex justify-end gap-3 w-full">
               <FfButton variant="primary" onClick={saveAutoFillSettings} leftIcon={<CheckCircle2 className="h-4 w-4" />}>
                 Kaydet ve Kapat
               </FfButton>
            </div>
        }
      >
        {autoFillManager && (
            <div className="p-4 space-y-5">
               <div className="bg-brand-primary/5 border border-brand-primary/20 p-3 rounded-lg flex gap-3 text-sm text-brand-dark mb-4">
                  <Settings className="h-5 w-5 text-brand-primary shrink-0" />
                  <p>Bu alanın değeri değiştiğinde (onBlur) seçili sorguyu çalıştırıp, dönen sonuçları diğer alanlara otomatik yerleştirebilirsiniz.</p>
               </div>
               
               <div>
                  <label className="block text-xs font-bold text-brand-gray uppercase tracking-wider mb-2">Çalıştırılacak Sorgu</label>
                  {integrationQueriesLoading ? (
                    <div className="text-sm text-brand-gray">Sorgular yükleniyor...</div>
                  ) : (
                    <select
                      value={autoFillManager.settings.queryId || ''}
                      onChange={e => setAutoFillManager({...autoFillManager, settings: {...autoFillManager.settings, queryId: e.target.value}})}
                      className="w-full px-3 py-2 bg-surface-hover border border-surface-muted rounded-lg text-brand-dark font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                    >
                      <option value="">-- Sorgu Seçin --</option>
                      {integrationQueries.map((q: IntegrationQueryLookupDto) => (
                        <option key={q.id} value={q.id}>{q.name}</option>
                      ))}
                    </select>
                  )}
                  <p className="text-xs text-brand-gray mt-1">Dış veri kaynaklarında tanımlı sorgulardan birini seçin.</p>
               </div>
               
               <div className="border-t border-surface-muted pt-4">
                  <AutoFillMappingBuilder 
                     settings={autoFillManager.settings} 
                     onChange={(newSettings) => setAutoFillManager({...autoFillManager, settings: newSettings})}
                     availableFields={sections.flatMap((s: SectionState) => s.fields).map((f: FieldState) => ({ id: f.fieldKey, label: f.label || f.fieldKey }))}
                  />
               </div>
            </div>
        )}
      </FfModal>

      </div>
    </PageContainer>
  );
};
