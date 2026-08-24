import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Save, Eye, Settings, Layout, CheckCircle2 } from 'lucide-react';
import { useSurveyDesignerStore } from '../hooks/useSurveyDesignerStore';
import { DesignerSidebar } from '../components/designer/DesignerSidebar';
import { DesignerCanvas } from '../components/designer/DesignerCanvas';
import { DesignerProperties } from '../components/designer/DesignerProperties';
import { surveyDesignerService } from '../services/surveyDesigner.service';
import toast from 'react-hot-toast';

export const SurveyStudioPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    const { 
        templateId,
        versionId,
        title, 
        description,
        defaultIsAnonymous,
        sections,
        isSaving, 
        hasUnsavedChanges,
        lastSavedAt,
        initialize,
        setDefaultIsAnonymous,
        setSaveStatus
    } = useSurveyDesignerStore();

    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        if (id) {
            surveyDesignerService.getTemplateDetails(id).then(data => {
                const mapTypeToString = (t: number) => {
                    const m: Record<number, string> = { 1:'ShortText', 2:'LongText', 3:'SingleChoice', 4:'MultipleChoice', 5:'YesNo', 6:'Rating', 7:'NPS', 8:'Number', 9:'Date', 10:'Matrix', 11:'File', 12:'Info' };
                    return (m[t] || 'ShortText') as any;
                };
                
                initialize(
                    data.id,
                    data.versionId,
                    data.title,
                    data.description || '',
                    data.defaultIsAnonymous || false,
                    data.sections.map((s: any) => ({
                        id: s.id,
                        title: s.title,
                        description: s.description,
                        sortOrder: s.sortOrder,
                        questions: s.questions.map((q: any) => ({
                            id: q.id,
                            type: mapTypeToString(q.type),
                            title: q.title,
                            description: q.description,
                            isRequired: q.isRequired,
                            sortOrder: q.sortOrder,
                            settingsJson: q.settingsJson,
                            visibilityRuleJson: q.visibilityRuleJson,
                            options: q.options?.map((o: any) => ({
                                id: o.id,
                                label: o.label,
                                sortOrder: o.sortOrder
                            })) || []
                        }))
                    }))
                );
                setTimeout(() => setIsInitialLoad(false), 500); // Give time for state to settle
            }).catch(() => {
                toast.error('Şablon yüklenemedi.');
                setIsInitialLoad(false);
            });
        }
    }, [id, initialize]);

    const getPayload = () => {
        const mapType = (t: string) => {
            const m: Record<string, number> = { 'ShortText':1, 'LongText':2, 'SingleChoice':3, 'MultipleChoice':4, 'YesNo':5, 'Rating':6, 'NPS':7, 'Number':8, 'Date':9, 'Matrix':10, 'File':11, 'Info':12 };
            return m[t] || 1;
        };

        return {
            id: templateId!,
            title,
            description,
            defaultIsAnonymous,
            sections: sections.map(s => ({
                id: s.id,
                title: s.title,
                description: s.description,
                sortOrder: s.sortOrder,
                questions: s.questions.map(q => ({
                    id: q.id,
                    type: mapType(q.type),
                    title: q.title,
                    description: q.description,
                    isRequired: q.isRequired,
                    sortOrder: q.sortOrder,
                    settingsJson: q.settingsJson,
                    visibilityRuleJson: q.visibilityRuleJson,
                    options: q.options?.map(o => ({
                        id: o.id,
                        label: o.label,
                        sortOrder: o.sortOrder
                    }))
                }))
            }))
        };
    };
    const saveCounterRef = useRef(0);

    // Auto-save logic
    useEffect(() => {
        if (!hasUnsavedChanges || !templateId || isInitialLoad) return;

        const timer = setTimeout(async () => {
            const currentReqId = ++saveCounterRef.current;
            const payload = getPayload();
            const snapshotStr = JSON.stringify(payload);
            setSaveStatus(true);
            try {
                const updatedTemplate = await surveyDesignerService.updateTemplate(payload);
                
                // If a newer save request was initiated while this one was in flight, discard this response
                if (currentReqId !== saveCounterRef.current) {
                    return;
                }
                
                const currentPayloadStr = JSON.stringify(getPayload());
                if (currentPayloadStr === snapshotStr) {
                    setSaveStatus(false, true);
                    
                    if (updatedTemplate && updatedTemplate.versionId && updatedTemplate.versionId !== versionId) {
                        useSurveyDesignerStore.getState().initialize(
                            updatedTemplate.id,
                            updatedTemplate.versionId,
                            updatedTemplate.title,
                            updatedTemplate.description,
                            updatedTemplate.defaultIsAnonymous,
                            updatedTemplate.sections as any
                        );
                    }
                } else {
                    // Still has newer unsaved changes, do not overwrite UI state
                    setSaveStatus(false);
                }
            } catch (err) {
                if (currentReqId === saveCounterRef.current) {
                    console.error('Auto-save failed', err);
                    setSaveStatus(false, false);
                    toast.error('Otomatik kaydetme başarısız oldu.');
                }
            }
        }, 1500);

        return () => clearTimeout(timer);
    }, [hasUnsavedChanges, templateId, title, description, sections, setSaveStatus, isInitialLoad, versionId]);

    const handleManualSave = async () => {
        if (!templateId) return;
        
        const currentReqId = ++saveCounterRef.current;
        const payload = getPayload();
        const snapshotStr = JSON.stringify(payload);
        setSaveStatus(true);
        
        try {
            const updatedTemplate = await surveyDesignerService.updateTemplate(payload);
            
            if (currentReqId !== saveCounterRef.current) {
                return;
            }

            const currentPayloadStr = JSON.stringify(getPayload());
            if (currentPayloadStr === snapshotStr) {
                setSaveStatus(false, true);
                
                if (updatedTemplate && updatedTemplate.versionId && updatedTemplate.versionId !== versionId) {
                    useSurveyDesignerStore.getState().initialize(
                        updatedTemplate.id,
                        updatedTemplate.versionId,
                        updatedTemplate.title,
                        updatedTemplate.description,
                        updatedTemplate.defaultIsAnonymous,
                        updatedTemplate.sections as any
                    );
                }
            } else {
                setSaveStatus(false);
            }
            
            toast.success('Başarıyla kaydedildi.');
        } catch {
            if (currentReqId === saveCounterRef.current) {
                setSaveStatus(false, false);
                toast.error('Kaydetme başarısız oldu.');
            }
        }
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-surface-ground">
            {/* Topbar */}
            <header className="h-14 border-b border-surface-muted bg-surface-base flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/admin/surveys/templates')}
                        className="p-2 -ml-2 rounded-md hover:bg-surface-muted/50 text-brand-gray transition-colors"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <h1 className="text-sm font-semibold text-brand-dark flex items-center gap-2">
                            {title || 'İsimsiz Anket'}
                            {hasUnsavedChanges ? (
                                <span className="w-2 h-2 rounded-full bg-amber-500" title="Kaydedilmemiş değişiklikler var"></span>
                            ) : (
                                <span title="Kaydedildi"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /></span>
                            )}
                        </h1>
                        <p className="text-[11px] text-brand-gray">
                            Taslak (V1) {lastSavedAt && `• Son kayıt: ${lastSavedAt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-brand-gray hover:text-brand-dark hover:bg-surface-muted/50 rounded-md transition-colors">
                        <Eye className="h-4 w-4" />
                        Önizleme
                    </button>
                    <button 
                        onClick={() => setShowSettings(true)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-brand-gray hover:text-brand-dark hover:bg-surface-muted/50 rounded-md transition-colors"
                    >
                        <Settings className="h-4 w-4" />
                        Ayarlar
                    </button>
                    <div className="w-px h-5 bg-surface-muted mx-1"></div>
                    <button 
                        onClick={handleManualSave}
                        className="flex items-center gap-2 px-4 py-1.5 text-xs font-medium bg-brand-primary text-white hover:bg-brand-primary/90 rounded-md shadow-sm transition-colors disabled:opacity-50"
                        disabled={isSaving || !hasUnsavedChanges}
                    >
                        {isSaving ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                    <button 
                        onClick={() => navigate(`/admin/surveys/campaigns/new?templateId=${templateId}`)}
                        className="flex items-center gap-2 px-4 py-1.5 text-xs font-medium border border-brand-primary text-brand-primary hover:bg-brand-primary/5 rounded-md shadow-sm transition-colors disabled:opacity-50 ml-1"
                        disabled={isSaving || hasUnsavedChanges}
                    >
                        Kampanya Oluştur
                    </button>
                </div>
            </header>

            {/* 3-Panel Layout */}
            <main className="flex-1 flex overflow-hidden">
                {/* Left Panel: Outline/Structure */}
                <aside className="w-64 border-r border-surface-muted bg-surface-base flex flex-col shrink-0">
                    <div className="p-3 border-b border-surface-muted">
                        <h2 className="text-xs font-semibold text-brand-gray uppercase tracking-wider flex items-center gap-2">
                            <Layout className="h-4 w-4" />
                            Anket Yapısı
                        </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
                        <DesignerSidebar />
                    </div>
                </aside>

                {/* Center Panel: Canvas */}
                <section className="flex-1 overflow-y-auto scrollbar-thin p-8 bg-surface-ground relative">
                    <div className="max-w-3xl mx-auto">
                        <DesignerCanvas />
                    </div>
                </section>

                {/* Right Panel: Properties */}
                <aside className="w-80 border-l border-surface-muted bg-surface-base flex flex-col shrink-0 shadow-[-4px_0_24px_rgba(0,0,0,0.02)] z-10">
                    <div className="p-3 border-b border-surface-muted">
                        <h2 className="text-xs font-semibold text-brand-gray uppercase tracking-wider flex items-center gap-2">
                            <Settings className="h-4 w-4" />
                            Özellikler
                        </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto scrollbar-thin">
                        <DesignerProperties />
                    </div>
                </aside>
            </main>

            {showSettings && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
                        <div className="px-6 py-4 border-b border-surface-muted flex items-center justify-between">
                            <h3 className="text-lg font-bold text-brand-dark">Şablon Ayarları</h3>
                            <button onClick={() => setShowSettings(false)} className="text-brand-gray hover:text-brand-dark">
                                <ChevronLeft className="h-5 w-5 rotate-180" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={defaultIsAnonymous} 
                                    onChange={(e) => setDefaultIsAnonymous(e.target.checked)}
                                    className="w-4 h-4 text-brand-primary border-surface-muted rounded focus:ring-brand-primary"
                                />
                                <span className="text-sm font-medium text-brand-dark">
                                    Varsayılan Olarak Anonim
                                </span>
                            </label>
                            <p className="text-xs text-brand-gray pl-7">
                                Bu şablondan oluşturulan kampanyalar varsayılan olarak kimliksiz (anonim) olacaktır.
                            </p>
                        </div>
                        <div className="px-6 py-4 border-t border-surface-muted flex justify-end">
                            <button 
                                onClick={() => setShowSettings(false)}
                                className="px-4 py-2 bg-brand-primary text-white text-sm font-medium rounded-md hover:bg-brand-primary/90 transition-colors"
                            >
                                Kapat
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
