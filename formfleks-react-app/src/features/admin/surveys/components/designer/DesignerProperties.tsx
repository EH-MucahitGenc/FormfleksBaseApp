import { useSurveyDesignerStore } from '../../hooks/useSurveyDesignerStore';
import { Trash2, GripVertical, Plus } from 'lucide-react';

export const DesignerProperties = () => {
    const { 
        sections,
        activeSectionId,
        activeQuestionId,
        updateSection,
        deleteSection,
        updateQuestion,
        deleteQuestion,
        addOption,
        updateOption,
        deleteOption
    } = useSurveyDesignerStore();

    if (!activeSectionId && !activeQuestionId) {
        return (
            <div className="p-6 text-center text-brand-gray text-sm">
                Düzenlemek için bir bölüm veya soru seçin.
            </div>
        );
    }

    if (activeQuestionId) {
        // Question Properties
        const section = sections.find(s => s.questions.some(q => q.id === activeQuestionId));
        const question = section?.questions.find(q => q.id === activeQuestionId);

        if (!question) return null;

        return (
            <div className="p-4 space-y-6">
                <div>
                    <label className="block text-xs font-semibold text-brand-dark mb-1">Soru Başlığı</label>
                    <textarea 
                        value={question.title}
                        onChange={(e) => updateQuestion(question.id, { title: e.target.value })}
                        className="w-full text-sm rounded-md border border-surface-muted px-3 py-2 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all resize-none min-h-[80px]"
                    />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-brand-dark mb-1">Açıklama (İsteğe bağlı)</label>
                    <input 
                        type="text"
                        value={question.description || ''}
                        onChange={(e) => updateQuestion(question.id, { description: e.target.value })}
                        className="w-full text-sm rounded-md border border-surface-muted px-3 py-2 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <input 
                        type="checkbox" 
                        id="req" 
                        checked={question.isRequired}
                        onChange={(e) => updateQuestion(question.id, { isRequired: e.target.checked })}
                        className="rounded border-surface-muted text-brand-primary focus:ring-brand-primary"
                    />
                    <label htmlFor="req" className="text-sm text-brand-dark cursor-pointer">Bu soru zorunlu olsun</label>
                </div>

                {['SingleChoice', 'MultipleChoice'].includes(question.type) && (
                    <div className="space-y-3 pt-4 border-t border-surface-muted">
                        <label className="block text-xs font-semibold text-brand-dark">Seçenekler</label>
                        
                        <div className="space-y-2">
                            {question.options.map((opt) => (
                                <div key={opt.id} className="flex items-center gap-2 group">
                                    <GripVertical className="h-4 w-4 text-brand-gray cursor-grab" />
                                    <input 
                                        type="text"
                                        value={opt.label}
                                        onChange={(e) => updateOption(question.id, opt.id, { label: e.target.value, value: e.target.value })}
                                        className="flex-1 text-sm rounded-md border border-surface-muted px-2 py-1.5 focus:border-brand-primary outline-none"
                                    />
                                    <button 
                                        onClick={() => deleteOption(question.id, opt.id)}
                                        className="p-1.5 text-brand-gray hover:text-red-500 rounded-md transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button 
                            onClick={() => addOption(question.id)}
                            className="flex items-center gap-1 text-xs font-medium text-brand-primary hover:text-brand-primary/80 transition-colors"
                        >
                            <Plus className="h-3 w-3" /> Seçenek Ekle
                        </button>
                    </div>
                )}

                {question.type === 'Rating' && (
                    <div className="pt-4 border-t border-surface-muted">
                        <label className="block text-xs font-semibold text-brand-dark mb-2">Yıldız Sayısı</label>
                        <select
                            className="w-full text-sm rounded border border-surface-muted p-2 outline-none focus:border-brand-primary"
                            value={
                                (function() {
                                    try {
                                        return JSON.parse(question.settingsJson || '{}').maxStars || 5;
                                    } catch { return 5; }
                                })()
                            }
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                let current = {};
                                try { current = JSON.parse(question.settingsJson || '{}'); } catch {}
                                updateQuestion(question.id, { settingsJson: JSON.stringify({ ...current, maxStars: val }) });
                            }}
                        >
                            <option value="3">3 Yıldız</option>
                            <option value="5">5 Yıldız</option>
                            <option value="7">7 Yıldız</option>
                            <option value="10">10 Yıldız</option>
                        </select>
                    </div>
                )}

                {question.type === 'Matrix' && (
                    <div className="pt-4 border-t border-surface-muted space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-brand-dark mb-2">Satırlar (Virgülle ayırın)</label>
                            <textarea
                                className="w-full text-sm rounded border border-surface-muted p-2 outline-none focus:border-brand-primary"
                                placeholder="Örn: Hız, Kalite, Fiyat"
                                rows={3}
                                value={
                                    (function() {
                                        try { return JSON.parse(question.settingsJson || '{}').rows?.join(', ') || ''; } catch { return ''; }
                                    })()
                                }
                                onChange={(e) => {
                                    const rows = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                    let current = {};
                                    try { current = JSON.parse(question.settingsJson || '{}'); } catch {}
                                    updateQuestion(question.id, { settingsJson: JSON.stringify({ ...current, rows }) });
                                }}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-brand-dark mb-2">Sütunlar (Virgülle ayırın)</label>
                            <textarea
                                className="w-full text-sm rounded border border-surface-muted p-2 outline-none focus:border-brand-primary"
                                placeholder="Örn: Kötü, Orta, İyi"
                                rows={3}
                                value={
                                    (function() {
                                        try { return JSON.parse(question.settingsJson || '{}').cols?.join(', ') || ''; } catch { return ''; }
                                    })()
                                }
                                onChange={(e) => {
                                    const cols = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                    let current = {};
                                    try { current = JSON.parse(question.settingsJson || '{}'); } catch {}
                                    updateQuestion(question.id, { settingsJson: JSON.stringify({ ...current, cols }) });
                                }}
                            />
                        </div>
                    </div>
                )}

                <div className="pt-6 border-t border-surface-muted">
                    <label className="block text-xs font-semibold text-brand-dark mb-3">Görünürlük Kuralları (Koşullu Mantık)</label>
                    <p className="text-xs text-brand-gray mb-3">Bu sorunun görünmesi için gereken koşulu belirleyin.</p>
                    
                    {(() => {
                        let rule: any = null;
                        try { if (question.visibilityRuleJson) rule = JSON.parse(question.visibilityRuleJson); } catch {}
                        
                        const availableQuestions = sections.flatMap(s => s.questions).filter(q => q.id !== question.id);
                        
                        const handleRuleChange = (key: string, val: string) => {
                            const newRule = { ...rule, [key]: val };
                            if (!newRule.dependsOnQuestionId) {
                                updateQuestion(question.id, { visibilityRuleJson: '' });
                                return;
                            }
                            updateQuestion(question.id, { visibilityRuleJson: JSON.stringify(newRule) });
                        };

                        return (
                            <div className="space-y-3 bg-surface-ground p-3 rounded border border-surface-muted">
                                <div>
                                    <label className="text-[11px] uppercase tracking-wider font-semibold text-brand-gray mb-1 block">Hangi Soruya Bağlı?</label>
                                    <select 
                                        className="w-full text-sm rounded border border-surface-muted p-2 outline-none focus:border-brand-primary"
                                        value={rule?.dependsOnQuestionId || ''}
                                        onChange={e => handleRuleChange('dependsOnQuestionId', e.target.value)}
                                    >
                                        <option value="">-- Kural Yok (Her Zaman Görünür) --</option>
                                        {availableQuestions.map(q => (
                                            <option key={q.id} value={q.id}>{q.title}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                {rule?.dependsOnQuestionId && (
                                    <>
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <label className="text-[11px] uppercase tracking-wider font-semibold text-brand-gray mb-1 block">Koşul</label>
                                                <select 
                                                    className="w-full text-sm rounded border border-surface-muted p-2 outline-none focus:border-brand-primary"
                                                    value={rule?.operator || 'equals'}
                                                    onChange={e => handleRuleChange('operator', e.target.value)}
                                                >
                                                    <option value="equals">Eşittir</option>
                                                    <option value="notEquals">Eşit Değildir</option>
                                                    <option value="contains">İçerir</option>
                                                </select>
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-[11px] uppercase tracking-wider font-semibold text-brand-gray mb-1 block">Değer</label>
                                                <input 
                                                    type="text" 
                                                    className="w-full text-sm rounded border border-surface-muted p-2 outline-none focus:border-brand-primary"
                                                    value={rule?.value || ''}
                                                    onChange={e => handleRuleChange('value', e.target.value)}
                                                    placeholder="Örn: Evet"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })()}
                </div>

                <div className="pt-6 border-t border-surface-muted">
                    <button 
                        onClick={() => deleteQuestion(question.id)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-md text-sm font-medium transition-colors"
                    >
                        <Trash2 className="h-4 w-4" /> Soruyu Sil
                    </button>
                </div>
            </div>
        );
    }

    if (activeSectionId) {
        // Section Properties
        const section = sections.find(s => s.id === activeSectionId);
        if (!section) return null;

        return (
            <div className="p-4 space-y-6">
                <div>
                    <label className="block text-xs font-semibold text-brand-dark mb-1">Bölüm Adı</label>
                    <input 
                        type="text"
                        value={section.title}
                        onChange={(e) => updateSection(section.id, { title: e.target.value })}
                        className="w-full text-sm rounded-md border border-surface-muted px-3 py-2 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all"
                    />
                </div>

                <div className="pt-6 border-t border-surface-muted">
                    <button 
                        onClick={() => deleteSection(section.id)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-md text-sm font-medium transition-colors"
                    >
                        <Trash2 className="h-4 w-4" /> Bölümü Sil
                    </button>
                </div>
            </div>
        );
    }

    return null;
};
