import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, Search, X, Rocket, Calendar, Users, Settings } from 'lucide-react';
import { campaignService } from '../services/campaign.service';
import type { SurveyAudienceUser, AudienceFilter } from '../services/campaign.service';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { surveyDesignerService } from '../services/surveyDesigner.service';
import { SurveyAudienceSelector } from '../components/audience/SurveyAudienceSelector';

const STEPS = [
    { id: 1, title: 'Kampanya Detayları', icon: Calendar },
    { id: 2, title: 'Hedef Kitle', icon: Users },
    { id: 3, title: 'Ayarlar ve Yayın', icon: Settings }
];

export const SurveyCampaignWizardPage = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const templateId = searchParams.get('templateId');

    const { data: templates, isLoading: isLoadingTemplates } = useQuery({
        queryKey: ['activeTemplates'],
        queryFn: () => surveyDesignerService.getTemplates(undefined, true)
    });

    const [currentStep, setCurrentStep] = useState(1);
    
    // Step 1 State
    const [campaignName, setCampaignName] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Step 2 State
    const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>({});
    const [totalAudienceCount, setTotalAudienceCount] = useState<number>(0);

    // Step 3 State
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [viewerSearchTerm, setViewerSearchTerm] = useState('');
    const [selectedViewers, setSelectedViewers] = useState<{ user: SurveyAudienceUser, accessLevel: number }[]>([]);

    // Search Query (Result Viewers)
    const { data: viewerSearchData, isLoading: isSearchingViewers } = useQuery({
        queryKey: ['viewersSearch', viewerSearchTerm],
        queryFn: () => campaignService.searchAudience({ searchTerm: viewerSearchTerm }, 1, 10),
        enabled: viewerSearchTerm.length >= 2,
    });
    
    const viewerSearchResults = viewerSearchData?.items || [];

    const handleNext = () => {
        if (currentStep === 1) {
            if (!campaignName || !startDate || !endDate) {
                toast.error('Lütfen zorunlu alanları doldurun.');
                return;
            }
            if (new Date(endDate) <= new Date(startDate)) {
                toast.error('Bitiş tarihi, başlangıç tarihinden sonra olmalıdır.');
                return;
            }
        }
        if (currentStep === 2) {
            if (totalAudienceCount === 0) {
                toast.error('Lütfen en az bir katılımcı içeren bir hedef kitle belirleyin.');
                return;
            }
        }
        setCurrentStep(prev => Math.min(prev + 1, 3));
    };

    const handlePrev = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    const handleToggleViewer = (p: SurveyAudienceUser) => {
        setSelectedViewers(prev => {
            const exists = prev.find(x => x.user.userId === p.userId);
            if (exists) return prev.filter(x => x.user.userId !== p.userId);
            return [...prev, { user: p, accessLevel: 1 }]; // Default to AggregateOnly (1)
        });
    };

    const handleUpdateViewerAccessLevel = (userId: string, accessLevel: number) => {
        setSelectedViewers(prev => prev.map(v => v.user.userId === userId ? { ...v, accessLevel } : v));
    };

    const handlePublish = async (saveAsDraft: boolean) => {
        if (!templateId) {
            toast.error('Şablon ID bulunamadı.');
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await campaignService.createCampaign({
                templateId,
                campaignName,
                description,
                startDate: new Date(startDate).toISOString(),
                endDate: new Date(endDate).toISOString(),
                isAnonymous,
                audienceDefinition: audienceFilter,
                viewers: selectedViewers.map(p => ({ userId: p.user.userId as string, accessLevel: p.accessLevel })),
                saveAsDraft
            });
            toast.success(saveAsDraft ? 'Kampanya taslak olarak kaydedildi.' : 'Kampanya başarıyla yayınlandı!');
            navigate(`/admin/surveys/campaigns/${result.id}`);
        } catch (error) {
            console.error(error);
            toast.error('Kampanya yayınlanırken bir hata oluştu.');
            setIsSubmitting(false);
        }
    };

    if (!templateId) {
        return (
            <div className="min-h-screen bg-surface-ground pb-20">
                <header className="bg-white border-b border-surface-muted px-6 py-4 sticky top-0 z-20">
                    <div className="max-w-4xl mx-auto flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-brand-dark">Şablon Seçimi</h1>
                            <p className="text-sm text-brand-gray">Kampanya oluşturmak için bir şablon seçin.</p>
                        </div>
                        <button onClick={() => navigate('/admin/surveys/campaigns')} className="p-2 hover:bg-surface-muted rounded-full">
                            <X className="h-5 w-5 text-brand-gray" />
                        </button>
                    </div>
                </header>
                <main className="max-w-4xl mx-auto mt-8 px-6">
                    {isLoadingTemplates ? (
                        <div className="text-center text-brand-gray py-12">Şablonlar yükleniyor...</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {templates?.map(t => (
                                <div key={t.id} className="bg-white p-6 rounded-xl border border-surface-muted hover:border-brand-primary/50 transition-colors cursor-pointer" onClick={() => setSearchParams({ templateId: t.id })}>
                                    <h3 className="font-bold text-brand-dark text-lg mb-2">{t.title}</h3>
                                    {t.description && <p className="text-sm text-brand-gray mb-4 line-clamp-2">{t.description}</p>}
                                    <div className="text-xs text-brand-gray mb-4">Sürüm: V{t.versionCount} • {t.defaultIsAnonymous ? 'Anonim (Varsayılan)' : 'Kimlikli (Varsayılan)'}</div>
                                    <button className="w-full py-2 bg-brand-primary/10 text-brand-primary rounded-md font-medium hover:bg-brand-primary hover:text-white transition-colors">
                                        Bu Şablonu Kullan
                                    </button>
                                </div>
                            ))}
                            {(!templates || templates.length === 0) && (
                                <div className="col-span-2 text-center text-brand-gray py-12 bg-white rounded-xl border border-surface-muted">
                                    Aktif şablon bulunamadı. Lütfen önce bir şablon oluşturun.
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface-ground pb-20">
            {/* Header */}
            <header className="bg-white border-b border-surface-muted px-6 py-4 sticky top-0 z-20">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-brand-dark">Yeni Kampanya Başlat</h1>
                        <p className="text-sm text-brand-gray">Anketinizi hedef kitlenizle paylaşın.</p>
                    </div>
                    <button onClick={() => navigate('/admin/surveys/campaigns')} className="p-2 hover:bg-surface-muted rounded-full">
                        <X className="h-5 w-5 text-brand-gray" />
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto mt-8 px-6">
                {/* Stepper */}
                <div className="flex items-center justify-between mb-12 relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-surface-muted -z-10"></div>
                    <div 
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-brand-primary -z-10 transition-all duration-300"
                        style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
                    ></div>
                    
                    {STEPS.map((step) => {
                        const Icon = step.icon;
                        const isActive = step.id === currentStep;
                        const isCompleted = step.id < currentStep;

                        return (
                            <div key={step.id} className="flex flex-col items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 bg-white transition-colors duration-300 ${isActive ? 'border-brand-primary text-brand-primary' : isCompleted ? 'border-brand-primary bg-brand-primary text-white' : 'border-surface-muted text-brand-gray'}`}>
                                    <Icon className="h-5 w-5" />
                                </div>
                                <span className={`mt-2 text-xs font-semibold ${isActive || isCompleted ? 'text-brand-dark' : 'text-brand-gray'}`}>
                                    {step.title}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Step Content */}
                <div className="bg-white rounded-xl shadow-sm border border-surface-muted p-8 min-h-[400px]">
                    {currentStep === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-lg font-bold text-brand-dark mb-4">Kampanya Detayları</h2>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-brand-dark mb-1">Kampanya Adı *</label>
                                    <input 
                                        type="text" 
                                        value={campaignName}
                                        onChange={e => setCampaignName(e.target.value)}
                                        className="w-full border border-surface-muted rounded-md px-4 py-2 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none"
                                        placeholder="Örn: 2026 Q3 Çalışan Memnuniyeti"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-brand-dark mb-1">Açıklama</label>
                                    <textarea 
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        className="w-full border border-surface-muted rounded-md px-4 py-2 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none min-h-[100px] resize-none"
                                        placeholder="Katılımcılara gösterilecek veya yönetime not olarak kalacak açıklama..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-brand-dark mb-1">Başlangıç Tarihi *</label>
                                        <input 
                                            type="datetime-local" 
                                            value={startDate}
                                            onChange={e => setStartDate(e.target.value)}
                                            className="w-full border border-surface-muted rounded-md px-4 py-2 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-brand-dark mb-1">Bitiş Tarihi *</label>
                                        <input 
                                            type="datetime-local" 
                                            value={endDate}
                                            onChange={e => setEndDate(e.target.value)}
                                            className="w-full border border-surface-muted rounded-md px-4 py-2 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-lg font-bold text-brand-dark mb-1">Hedef Kitle (Katılımcılar)</h2>
                            <p className="text-sm text-brand-gray mb-6">Anketi kimlerin dolduracağını filtreler aracılığıyla belirleyin. Filtrelere uyan tüm aktif çalışanlar kampanyaya dahil edilecektir.</p>
                            
                            <div className="flex-1 min-h-[450px]">
                                <SurveyAudienceSelector 
                                    filter={audienceFilter} 
                                    onChange={setAudienceFilter} 
                                    onTotalCountChange={setTotalAudienceCount} 
                                />
                            </div>
                        </div>
                    )}

                    {currentStep === 3 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-lg font-bold text-brand-dark mb-1">Ayarlar ve Yayın Özeti</h2>
                            <p className="text-sm text-brand-gray mb-6">Kampanyayı başlatmadan önce son ayarlarınızı gözden geçirin.</p>

                            <div className="bg-surface-base border border-surface-muted rounded-lg p-6 space-y-4">
                                <div className="flex items-start gap-3">
                                    <input 
                                        type="checkbox" 
                                        id="anon"
                                        checked={isAnonymous}
                                        onChange={e => setIsAnonymous(e.target.checked)}
                                        className="mt-1 w-4 h-4 text-brand-primary border-surface-muted rounded focus:ring-brand-primary"
                                    />
                                    <div>
                                        <label htmlFor="anon" className="text-sm font-semibold text-brand-dark cursor-pointer block">Anonim Kampanya</label>
                                        <p className="text-xs text-brand-gray mt-1">Eğer işaretlenirse, sistem anket yanıtlarını kimin verdiğini kaydetmez. Katılımcılar "Kimliksiz" olarak değerlendirilir.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Result Viewers Block */}
                            <div className="bg-surface-base border border-surface-muted rounded-lg p-6 space-y-4">
                                <div>
                                    <h3 className="text-sm font-semibold text-brand-dark">Sonuç İzleyicileri (Opsiyonel)</h3>
                                    <p className="text-xs text-brand-gray mt-1">Bu kampanyanın sonuçlarını Admin yetkisi olmayan ancak raporları görmesi gereken yöneticileri seçin.</p>
                                </div>
                                
                                <div className="flex h-64 gap-4 mt-4">
                                    <div className="w-2/3 flex flex-col border border-surface-muted rounded-lg overflow-hidden bg-white">
                                        <div className="p-3 border-b border-surface-muted bg-surface-base">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-gray" />
                                                <input 
                                                    type="text" 
                                                    placeholder="İsim, departman veya e-posta ile ara..." 
                                                    value={viewerSearchTerm}
                                                    onChange={e => setViewerSearchTerm(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-surface-muted rounded-md focus:outline-none focus:ring-1 focus:ring-brand-primary"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
                                            {isSearchingViewers ? (
                                                <div className="p-4 text-center text-sm text-brand-gray">Aranıyor...</div>
                                            ) : viewerSearchResults?.length === 0 && viewerSearchTerm.length >= 2 ? (
                                                <div className="p-4 text-center text-sm text-brand-gray">Kullanıcı bulunamadı.</div>
                                            ) : (
                                                viewerSearchResults?.map((p: SurveyAudienceUser) => {
                                                    const isSelected = selectedViewers.some(x => x.user.userId === p.userId);
                                                    return (
                                                        <div 
                                                            key={p.userId} 
                                                            onClick={() => handleToggleViewer(p)}
                                                            className={`p-2 rounded-md border flex items-center justify-between cursor-pointer transition-colors ${isSelected ? 'border-brand-primary bg-brand-primary/5' : 'border-transparent hover:bg-surface-muted'}`}
                                                        >
                                                            <div>
                                                                <div className="text-sm font-semibold text-brand-dark">{p.displayName}</div>
                                                                <div className="text-xs text-brand-gray">{p.email}</div>
                                                            </div>
                                                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'border-brand-primary bg-brand-primary text-white' : 'border-surface-muted'}`}>
                                                                {isSelected && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3"><path d="M20 6L9 17l-5-5"/></svg>}
                                                            </div>
                                                        </div>
                                                    )
                                                })
                                            )}
                                        </div>
                                    </div>

                                    <div className="w-1/3 flex flex-col border border-surface-muted rounded-lg overflow-hidden bg-surface-base">
                                        <div className="p-3 border-b border-surface-muted flex items-center justify-between">
                                            <h3 className="text-sm font-semibold text-brand-dark">Seçilenler</h3>
                                            <span className="bg-brand-primary text-white text-xs px-2 py-0.5 rounded-full">{selectedViewers.length}</span>
                                        </div>
                                        <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
                                            {selectedViewers.length === 0 ? (
                                                <div className="p-4 text-center text-xs text-brand-gray">Seçim yapılmadı.</div>
                                            ) : (
                                                selectedViewers.map(v => (
                                                    <div key={v.user.userId} className="p-2 bg-white border border-surface-muted rounded-md group">
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="truncate pr-2 font-semibold text-brand-dark">{v.user.displayName}</span>
                                                            <button onClick={() => handleToggleViewer(v.user)} className="text-brand-gray hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                        <select
                                                            value={v.accessLevel}
                                                            onChange={e => handleUpdateViewerAccessLevel(v.user.userId as string, parseInt(e.target.value))}
                                                            className="mt-1.5 w-full text-xs border border-surface-muted rounded px-1.5 py-1 focus:ring-1 focus:ring-brand-primary outline-none"
                                                        >
                                                            <option value={1}>Özet Veri (AggregateOnly)</option>
                                                            <option value={2}>Detaylı Veri (Detailed)</option>
                                                        </select>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-surface-muted pt-6">
                                <h3 className="text-sm font-bold text-brand-dark uppercase tracking-wider mb-4">Özet</h3>
                                <div className="grid grid-cols-2 gap-y-4 text-sm">
                                    <div className="text-brand-gray">Seçilen Şablon</div>
                                    <div className="font-semibold text-brand-dark">
                                        {(() => {
                                            const t = templates?.find(x => x.id === templateId);
                                            return t ? `${t.title} (Sürüm V${t.versionCount})` : templateId;
                                        })()}
                                    </div>

                                    <div className="text-brand-gray">Kampanya Adı</div>
                                    <div className="font-semibold text-brand-dark">{campaignName}</div>
                                    
                                    <div className="text-brand-gray">Katılımcı Sayısı</div>
                                    <div className="font-semibold text-brand-dark">{totalAudienceCount} Kişi</div>
                                    
                                    <div className="text-brand-gray">Zaman Çizelgesi</div>
                                    <div className="font-semibold text-brand-dark">
                                        {startDate ? new Date(startDate).toLocaleDateString() : '-'} - {endDate ? new Date(endDate).toLocaleDateString() : '-'}
                                    </div>
                                    
                                    <div className="text-brand-gray">Anonimlik</div>
                                    <div className="font-semibold text-brand-dark">{isAnonymous ? 'Açık (Veriler anonim)' : 'Kapalı (Kimlikli)'}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="mt-6 flex items-center justify-between">
                    <button 
                        onClick={handlePrev}
                        disabled={currentStep === 1 || isSubmitting}
                        className="px-6 py-2.5 border border-surface-muted rounded-lg text-sm font-medium text-brand-dark hover:bg-surface-muted transition-colors disabled:opacity-50"
                    >
                        Geri
                    </button>

                    {currentStep < 3 ? (
                        <button 
                            onClick={handleNext}
                            className="flex items-center gap-2 px-6 py-2.5 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-primary/90 transition-colors shadow-sm"
                        >
                            İleri <ChevronRight className="h-4 w-4" />
                        </button>
                    ) : (
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => handlePublish(true)}
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-6 py-2.5 border border-surface-muted bg-white text-brand-dark rounded-lg text-sm font-medium hover:bg-surface-muted transition-colors disabled:opacity-50"
                            >
                                Taslak Olarak Kaydet
                            </button>
                            <button 
                                onClick={() => handlePublish(false)}
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-6 py-2.5 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-primary/90 transition-colors shadow-sm disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <Rocket className="h-4 w-4" />
                                )}
                                Kampanyayı Başlat
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};
