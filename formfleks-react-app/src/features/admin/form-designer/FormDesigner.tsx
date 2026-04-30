import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Columns, Save, FileType, CheckCircle2, RotateCcw, AlertTriangle, Eye, Plus, Trash2, GripVertical, Settings, List } from 'lucide-react';

import { systemAdminService, type FormTemplateUpsertDto } from '@/services/system-admin.service';
import { PageHeader, FfButton, PageContainer, GlassCard, FfModal } from '@/components/ui/index';

// Form Builder Types (Local State overrides)
interface FieldState {
  id: string; // React key
  fieldKey: string;
  label: string;
  fieldType: number;
  isRequired: boolean;
  optionsJson?: string;
  placeholder?: string;
}

interface SectionState {
  id: string; // React key
  title: string;
  fields: FieldState[];
}

export const FormDesigner: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'list' | 'designer' | 'preview'>('list');
  
  // Builder State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [sections, setSections] = useState<SectionState[]>([]);
  
  // UI State
  const [saveMessage, setSaveMessage] = useState<{ type: 'success'|'error', text: string } | null>(null);

  /**
   * Grid (Tablo) kolon yöneticisi state'i.
   * Modalın açık/kapalı durumu ve aktif kolonların bilgisini tutar.
   */
  const [gridManager, setGridManager] = useState<{ secId: string, fieldId: string, columns: any[] } | null>(null);

  const openGridManager = (secId: string, fieldId: string, optionsJson?: string) => {
    let cols = [];
    if (optionsJson) {
      try { cols = JSON.parse(optionsJson); } catch {}
    }
    setGridManager({ secId, fieldId, columns: cols });
  };

  const saveGridColumns = () => {
    if (gridManager) {
      updateField(gridManager.secId, gridManager.fieldId, { optionsJson: JSON.stringify(gridManager.columns) });
      setGridManager(null);
    }
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

  // Load Existing Templates for reference listing
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['adminFormTemplates'],
    queryFn: systemAdminService.getTemplates
  });

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

  // Actions
  const handleReset = () => {
    setCode('');
    setName('');
    setIsActive(true);
    setSections([{ id: crypto.randomUUID(), title: 'Genel Bilgiler', fields: [] }]);
  };

  const loadPreset = () => {
    setCode('LEAVE_REQ');
    setName('Yıllık İzin Formu');
    setIsActive(true);
    setSections([
      {
        id: crypto.randomUUID(),
        title: 'Temel İzin Bilgileri',
        fields: [
          { id: crypto.randomUUID(), fieldKey: 'leave_type', label: 'İzin Türü', fieldType: 4, isRequired: true, optionsJson: 'Yıllık İzin,Mazeret İzni,Hastalık İzni' },
          { id: crypto.randomUUID(), fieldKey: 'start_date', label: 'Başlangıç Tarihi', fieldType: 5, isRequired: true }
        ]
      },
      {
        id: crypto.randomUUID(),
        title: 'Ek Detaylar',
        fields: [
          { id: crypto.randomUUID(), fieldKey: 'reason', label: 'Açıklama / Mazeret', fieldType: 2, isRequired: false, placeholder: 'Eklemek istedikleriniz...' }
        ]
      }
    ]);
  };

  const addSection = () => {
    setSections([...sections, { id: crypto.randomUUID(), title: `Yeni Bölüm ${sections.length + 1}`, fields: [] }]);
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
            id: crypto.randomUUID(), 
            fieldKey: `field_${Math.floor(Math.random() * 1000)}`, 
            label: `Yeni Alan`, 
            fieldType: 1, 
            isRequired: false 
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
          optionsJson: f.fieldType === 4 && f.optionsJson ? JSON.stringify(f.optionsJson.split(',').map(x => ({ Value: x.trim(), Text: x.trim() }))) : (f.fieldType === 11 || f.fieldType === 10 ? f.optionsJson : undefined),
          placeholder: f.placeholder
        }))
      )
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
        className="shrink-0 mb-4"
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

      {saveMessage && (
        <div className={`mb-4 mx-2 p-3 rounded-lg flex items-center gap-2 border shadow-sm animate-in fade-in slide-in-from-top-2 ${saveMessage.type === 'success' ? 'bg-status-success/10 text-status-success border-status-success/20' : 'bg-status-danger/10 text-status-danger border-status-danger/20'}`}>
           {saveMessage.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
           <span className="font-medium">{saveMessage.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 px-2">
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

      {/* Main Content Area */}
      <GlassCard noPadding className="flex-1 min-h-0 flex flex-col overflow-hidden">
        
        {activeTab === 'list' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-surface-base scrollbar-thin">
            <div className="flex items-center justify-between mb-4">
               <div>
                  <h3 className="text-lg font-bold text-brand-dark">Sistemdeki Tasarlanmış Formlar</h3>
                  <p className="text-sm text-brand-gray">Sistemde varolan şablonları buradan yönetebilir, durdurup başlatabilirsiniz.</p>
               </div>
               <FfButton variant="primary" leftIcon={<Plus className="h-4 w-4"/>} onClick={() => setActiveTab('designer')}>Yeni Tasarım</FfButton>
            </div>
            <div className="bg-surface-base rounded-xl border border-surface-muted overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-surface-hover text-xs font-bold uppercase text-brand-gray border-b border-surface-muted">
                        <tr>
                            <th className="px-4 py-3">Form Adı</th>
                            <th className="px-4 py-3">Kod</th>
                            <th className="px-4 py-3 text-center">Alan Sayısı</th>
                            <th className="px-4 py-3 text-center">İşlem Onay Adımı</th>
                            <th className="px-4 py-3 text-center">Kullanıma Açık Mı?</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-muted">
                        {templatesLoading && (
                            <tr>
                                <td colSpan={5} className="text-center py-8 text-brand-gray">Yükleniyor...</td>
                            </tr>
                        )}
                        {!templatesLoading && templates.length === 0 && (
                            <tr>
                                <td colSpan={5} className="text-center py-8 text-brand-gray">Kayıtlı hiçbir form şablonu bulunmuyor.</td>
                            </tr>
                        )}
                        {templates?.map((t: any) => (
                            <tr key={t.formTypeId} className="hover:bg-brand-primary/5 transition-colors">
                                <td className="px-4 py-3 font-medium text-brand-dark">{t.name}</td>
                                <td className="px-4 py-3 font-mono text-xs">{t.code}</td>
                                <td className="px-4 py-3 text-center font-bold text-brand-primary">{t.fieldCount}</td>
                                <td className="px-4 py-3 text-center text-brand-gray">{t.workflowStepCount} Adım</td>
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
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
        )}

        {activeTab === 'designer' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-surface-base scrollbar-thin">
            
            {/* Form Meta */}
            <div className="bg-surface-hover/50 p-4 md:p-5 rounded-xl border border-surface-muted mb-8 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
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
            </div>

            {/* Sections Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-brand-primary flex items-center gap-2">
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
                           className={`bg-surface-base rounded-xl border border-surface-muted shadow-sm overflow-hidden flex flex-col transition-all hover:border-brand-primary/40 group ${draggedSectionIndex === sIdx ? 'opacity-50 border-brand-primary border-dashed border-2' : ''}`}
                        >
                            
                            {/* Section Header */}
                            <div className="bg-surface-hover px-4 py-3 border-b border-surface-muted flex items-center justify-between gap-4">
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
                                          className="w-full bg-surface-base px-3 py-1.5 border border-surface-muted rounded text-brand-dark font-bold focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
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
                                    <div className="overflow-x-auto w-full">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-surface-base text-xs font-bold uppercase text-brand-gray border-b border-surface-muted">
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
                                                        className={`hover:bg-brand-primary/5 transition-colors group/row ${draggableFieldId === f.id ? 'cursor-move' : ''} ${draggedField?.secId === section.id && draggedField?.index === fIdx ? 'opacity-50 bg-brand-primary/10' : ''}`}
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
                                                                <option value={10}>Dosya</option>
                                                                <option value={11}>Tablo (Grid)</option>
                                                            </select>
                                                        </td>
                                                        <td className="px-4 py-2 text-center">
                                                            <input type="checkbox" checked={f.isRequired} onChange={e => updateField(section.id, f.id, { isRequired: e.target.checked })} className="rounded border-surface-muted text-brand-primary focus:ring-brand-primary/50 h-4 w-4" />
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            {f.fieldType === 11 ? (
                                                                <FfButton size="sm" variant="outline" onClick={() => openGridManager(section.id, f.id, f.optionsJson)}>
                                                                    Kolonları Yönet ({f.optionsJson ? (function(){ try { return JSON.parse(f.optionsJson).length; } catch { return 0; }})() : 0})
                                                                </FfButton>
                                                            ) : f.fieldType === 10 ? (
                                                                <FfButton size="sm" variant="outline" onClick={() => openFileManager(section.id, f.id, f.optionsJson)}>
                                                                    Dosya Ayarları
                                                                </FfButton>
                                                            ) : f.fieldType === 4 ? (
                                                                <input type="text" value={f.optionsJson || ''} onChange={e => updateField(section.id, f.id, { optionsJson: e.target.value })} className="w-full bg-surface-hover border-none rounded px-2 py-1.5 focus:ring-1 focus:ring-brand-primary text-brand-dark text-xs" placeholder="A,B,C (Virgülle ayırın)" />
                                                            ) : (
                                                                <input type="text" value={f.placeholder || ''} onChange={e => updateField(section.id, f.id, { placeholder: e.target.value })} className="w-full bg-surface-hover border-none rounded px-2 py-1.5 focus:ring-1 focus:ring-brand-primary text-brand-dark text-xs" placeholder="Placeholder..." />
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2 text-center">
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
          <div className="flex-1 overflow-y-auto bg-surface-muted p-4 md:p-8 flex justify-center scrollbar-thin">
            <div className="w-full max-w-3xl bg-surface-base rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-brand-primary/5 border-b border-brand-primary/10 px-6 py-4">
                    <h2 className="text-xl font-bold text-brand-dark">{name || 'İsimsiz Form'}</h2>
                    <p className="text-sm font-medium text-brand-gray mt-1">Bu alan form doldurucunun göreceği görsel karşılıktır.</p>
                </div>
                
                <div className="p-6 md:p-8 space-y-8">
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
                                    {sec.fields.map(f => (
                                        <div key={f.id} className={[2, 11].includes(f.fieldType) ? 'md:col-span-12' : 'md:col-span-6'}>
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-sm font-semibold text-brand-dark flex items-center justify-between">
                                                    <span>{f.label} {f.isRequired && <span className="text-status-danger">*</span>}</span>
                                                </label>
                                                
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
                                                {f.fieldType === 10 && (
                                                    <div className="border border-dashed border-surface-muted bg-surface-hover rounded-lg px-3 py-4 text-center text-xs text-brand-gray/70">
                                                        Dosya Yükleme Alanı
                                                    </div>
                                                )}
                                                {f.fieldType === 11 && (
                                                    <div className="border border-surface-muted bg-surface-hover rounded-lg px-3 py-10 text-center flex flex-col items-center justify-center gap-2">
                                                        <Columns className="h-6 w-6 text-brand-gray/40" />
                                                        <span className="text-sm font-medium text-brand-gray">Grid (Tablo) Alanı</span>
                                                        <span className="text-xs text-brand-gray/50">Form doldururken burada satır/kolon tabanlı bir grid gösterilecektir.</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
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
           </div>
        )}
      </FfModal>

      <FfModal isOpen={!!fileManager} onClose={saveFileSettings} title="Dosya Yükleme Ayarları" size="sm"
        actions={
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

      </div>
    </PageContainer>
  );
};
