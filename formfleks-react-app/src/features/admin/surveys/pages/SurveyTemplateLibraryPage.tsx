import { useDeferredValue, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
    ArrowRight,
    CalendarDays,
    Copy,
    Edit3,
    FileStack,
    LayoutTemplate,
    LoaderCircle,
    LockKeyhole,
    Plus,
    Search,
    ShieldCheck,
    Sparkles,
    Trash2,
    Users,
    X,
} from "lucide-react";
import toast from "react-hot-toast";
import { PageContainer } from "@/components/ui/PageContainer";
import { surveyDesignerService, type SurveyTemplateListDto } from "../services/surveyDesigner.service";

function getErrorMessage(error: unknown, fallback: string) {
    if (!axios.isAxiosError(error)) return fallback;
    const data = error.response?.data as { detail?: string; message?: string } | undefined;
    return data?.detail || data?.message || fallback;
}

function TemplateSkeleton() {
    return (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map(item => (
                <div key={item} className="rounded-[22px] border border-surface-muted bg-white p-6 dark:bg-surface-base">
                    <div className="h-7 w-24 skeleton-shimmer" />
                    <div className="mt-6 h-6 w-2/3 skeleton-shimmer" />
                    <div className="mt-3 h-4 w-full skeleton-shimmer" />
                    <div className="mt-2 h-4 w-3/4 skeleton-shimmer" />
                    <div className="mt-7 h-20 skeleton-shimmer" />
                </div>
            ))}
        </div>
    );
}

export const SurveyTemplateLibraryPage = () => {
    const navigate = useNavigate();
    const [templates, setTemplates] = useState<SurveyTemplateListDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<SurveyTemplateListDto | null>(null);
    const [search, setSearch] = useState("");
    const deferredSearch = useDeferredValue(search.trim().toLocaleLowerCase("tr-TR"));

    const loadTemplates = async () => {
        try {
            setLoading(true);
            setTemplates(await surveyDesignerService.getTemplates());
        } catch (error) {
            console.error(error);
            toast.error("Şablonlar yüklenemedi.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadTemplates();
    }, []);

    const handleCreateTemplate = async () => {
        try {
            setIsCreating(true);
            const id = await surveyDesignerService.createTemplate("Yeni Şablon", "");
            navigate(`/admin/surveys/templates/${id}/edit`);
        } catch (error) {
            console.error(error);
            toast.error(getErrorMessage(error, "Şablon oluşturulamadı."));
        } finally {
            setIsCreating(false);
        }
    };

    const handleDuplicate = async (template: SurveyTemplateListDto) => {
        try {
            setProcessingId(template.id);
            await surveyDesignerService.duplicateTemplate(template.id);
            toast.success(`“${template.title}” kopyalandı.`);
            await loadTemplates();
        } catch (error) {
            console.error(error);
            toast.error(getErrorMessage(error, "Şablon kopyalanamadı."));
        } finally {
            setProcessingId(null);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            setProcessingId(deleteTarget.id);
            await surveyDesignerService.deleteTemplate(deleteTarget.id);
            setTemplates(current => current.filter(template => template.id !== deleteTarget.id));
            toast.success("Şablon silindi.");
            setDeleteTarget(null);
        } catch (error) {
            console.error(error);
            toast.error(getErrorMessage(error, "Şablon silinemedi."));
        } finally {
            setProcessingId(null);
        }
    };

    const visibleTemplates = templates.filter(template => !deferredSearch
        || template.title.toLocaleLowerCase("tr-TR").includes(deferredSearch)
        || template.description?.toLocaleLowerCase("tr-TR").includes(deferredSearch));
    const totalVersions = templates.reduce((sum, template) => sum + template.versionCount, 0);
    const anonymousTemplates = templates.filter(template => template.defaultIsAnonymous).length;

    return (
        <PageContainer maxWidth="7xl" className="pb-14">
            <section className="relative overflow-hidden rounded-[28px] border border-[#eadfd8] bg-gradient-to-br from-[#fffaf6] via-white to-[#f6f2ee] px-6 py-7 shadow-[0_25px_70px_-55px_rgba(48,31,22,.65)] dark:border-surface-muted dark:from-[#2b211c] dark:via-surface-base dark:to-[#171310] sm:px-8 lg:px-10 lg:py-9">
                <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-brand-primary/12 blur-3xl" />
                <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <span className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-white/80 px-3 py-1.5 text-[11px] font-bold tracking-[0.14em] text-brand-primary uppercase dark:border-orange-900 dark:bg-orange-950/25">
                            <Sparkles className="h-3.5 w-3.5" /> Tasarım Stüdyosu
                        </span>
                        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-brand-dark sm:text-4xl">Anket Şablon Kütüphanesi</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-gray">Tekrar kullanılabilir soru setlerinizi tasarlayın, güvenle çoğaltın ve kampanyaya dönüştürün.</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => void handleCreateTemplate()}
                        disabled={isCreating}
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[14px] bg-brand-primary px-5 text-sm font-bold text-white shadow-[0_14px_28px_-14px_rgba(255,122,61,.8)] transition hover:-translate-y-0.5 hover:bg-[#f0682d] disabled:cursor-wait disabled:opacity-60"
                    >
                        {isCreating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        {isCreating ? "Oluşturuluyor..." : "Yeni şablon oluştur"}
                    </button>
                </div>

                <div className="relative mt-8 grid gap-3 sm:grid-cols-3">
                    {[
                        { label: "Toplam şablon", value: templates.length, icon: <LayoutTemplate className="h-5 w-5" /> },
                        { label: "Toplam sürüm", value: totalVersions, icon: <FileStack className="h-5 w-5" /> },
                        { label: "Anonim varsayılan", value: anonymousTemplates, icon: <ShieldCheck className="h-5 w-5" /> },
                    ].map(metric => (
                        <div key={metric.label} className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/75 p-4 backdrop-blur-sm dark:border-white/5 dark:bg-white/5">
                            <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-50 text-brand-primary dark:bg-orange-950/35">{metric.icon}</span>
                            <div><strong className="block text-xl text-brand-dark">{metric.value.toLocaleString("tr-TR")}</strong><span className="text-xs font-medium text-brand-gray">{metric.label}</span></div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="flex flex-col gap-3 rounded-[20px] border border-surface-muted bg-white p-3 dark:bg-surface-base sm:flex-row sm:items-center sm:justify-between">
                <label className="focus-ring-brand flex min-h-11 w-full items-center gap-3 rounded-[13px] bg-surface-ground px-4 sm:max-w-md">
                    <Search className="h-4 w-4 text-brand-gray" />
                    <span className="sr-only">Şablonlarda ara</span>
                    <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Şablon adı veya açıklama ara..." className="w-full bg-transparent text-sm outline-none placeholder:text-brand-gray/60" />
                </label>
                <span className="px-2 text-xs font-medium text-brand-gray">{visibleTemplates.length} şablon gösteriliyor</span>
            </section>

            {loading ? <TemplateSkeleton /> : visibleTemplates.length === 0 ? (
                <section className="grid min-h-72 place-items-center rounded-[24px] border border-dashed border-surface-muted bg-white/70 p-8 text-center dark:bg-surface-base/70">
                    <div>
                        <div className="mx-auto grid h-16 w-16 place-items-center rounded-[20px] bg-orange-50 text-brand-primary dark:bg-orange-950/30"><LayoutTemplate className="h-7 w-7" /></div>
                        <h2 className="mt-5 text-lg font-bold text-brand-dark">{templates.length ? "Eşleşen şablon bulunamadı" : "İlk şablonunuzu oluşturun"}</h2>
                        <p className="mt-2 text-sm text-brand-gray">{templates.length ? "Arama ifadenizi değiştirerek tekrar deneyin." : "Kurumsal anketlerinizi standartlaştırmak için bir soru seti hazırlayın."}</p>
                    </div>
                </section>
            ) : (
                <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="Anket şablonları">
                    {visibleTemplates.map((template, index) => {
                        const isProcessing = processingId === template.id;
                        return (
                            <article key={template.id} className="group relative flex min-h-[350px] flex-col overflow-hidden rounded-[22px] border border-[#e8e1dc] bg-white shadow-[0_18px_50px_-44px_rgba(42,29,22,.9)] transition duration-300 hover:-translate-y-1 hover:border-[#dcd0c8] hover:shadow-[0_28px_65px_-44px_rgba(42,29,22,.75)] dark:border-surface-muted dark:bg-surface-base" style={{ animationDelay: `${Math.min(index, 5) * 60}ms` }}>
                                <div className="h-1 bg-gradient-to-r from-brand-primary via-amber-400 to-transparent" />
                                <div className="flex flex-1 flex-col p-6">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="grid h-11 w-11 place-items-center rounded-[14px] bg-[#f7f2ed] text-brand-primary transition group-hover:bg-orange-50 dark:bg-[#302720]"><LayoutTemplate className="h-5 w-5" /></span>
                                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-bold ${template.defaultIsAnonymous ? "border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300" : "border-orange-100 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-300"}`}>
                                            {template.defaultIsAnonymous ? <LockKeyhole className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
                                            {template.defaultIsAnonymous ? "Anonim varsayılan" : "Kimlikli varsayılan"}
                                        </span>
                                    </div>
                                    <h2 className="mt-6 line-clamp-2 text-xl font-bold tracking-[-0.025em] text-brand-dark">{template.title}</h2>
                                    <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-brand-gray">{template.description || "Bu şablon için henüz açıklama eklenmemiş."}</p>
                                    <div className="mt-6 grid grid-cols-2 gap-3">
                                        <div className="rounded-xl bg-surface-ground p-3"><FileStack className="h-4 w-4 text-brand-primary" /><strong className="mt-2 block text-sm text-brand-dark">{template.versionCount} sürüm</strong><span className="text-[11px] text-brand-gray">Sürüm geçmişi</span></div>
                                        <div className="rounded-xl bg-surface-ground p-3"><CalendarDays className="h-4 w-4 text-brand-primary" /><strong className="mt-2 block text-sm text-brand-dark">{new Date(template.createdAt).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" })}</strong><span className="text-[11px] text-brand-gray">Oluşturulma</span></div>
                                    </div>
                                </div>

                                <div className="border-t border-[#eee8e3] bg-[#fffdfb] p-4 dark:border-surface-muted dark:bg-[#251f1b]">
                                    <button onClick={() => navigate(`/admin/surveys/campaigns/new?templateId=${template.id}`)} className="flex min-h-11 w-full items-center justify-between rounded-[13px] bg-[#211a17] px-4 text-sm font-bold text-white transition hover:bg-brand-primary">
                                        <span>Kampanya başlat</span><ArrowRight className="h-4 w-4" />
                                    </button>
                                    <div className="mt-3 grid grid-cols-3 gap-2">
                                        <button onClick={() => navigate(`/admin/surveys/templates/${template.id}/edit`)} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl text-xs font-bold text-brand-dark transition hover:bg-surface-ground hover:text-brand-primary"><Edit3 className="h-4 w-4" /> Düzenle</button>
                                        <button disabled={isProcessing} onClick={() => void handleDuplicate(template)} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl text-xs font-bold text-brand-gray transition hover:bg-surface-ground hover:text-brand-dark disabled:opacity-50">{isProcessing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />} Kopyala</button>
                                        <button disabled={isProcessing} onClick={() => setDeleteTarget(template)} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl text-xs font-bold text-brand-gray transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/25 disabled:opacity-50"><Trash2 className="h-4 w-4" /> Sil</button>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </section>
            )}

            {deleteTarget && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 backdrop-blur-[3px]" role="dialog" aria-modal="true" aria-labelledby="delete-template-title">
                    <div className="w-full max-w-md overflow-hidden rounded-[24px] border border-white/20 bg-white shadow-2xl dark:border-surface-muted dark:bg-surface-base">
                        <div className="flex items-start justify-between p-6 pb-0">
                            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/30"><Trash2 className="h-5 w-5" /></span>
                            <button onClick={() => setDeleteTarget(null)} disabled={processingId === deleteTarget.id} className="grid h-9 w-9 place-items-center rounded-xl text-brand-gray hover:bg-surface-ground" aria-label="Pencereyi kapat"><X className="h-4 w-4" /></button>
                        </div>
                        <div className="p-6 pt-4">
                            <h2 id="delete-template-title" className="text-xl font-bold text-brand-dark">Şablon silinsin mi?</h2>
                            <p className="mt-2 text-sm leading-6 text-brand-gray"><strong className="text-brand-dark">{deleteTarget.title}</strong> ve içindeki soru seti kalıcı olarak silinecek. Kampanyada kullanılan şablonların silinmesine sistem izin vermez.</p>
                        </div>
                        <div className="flex gap-3 border-t border-surface-muted bg-surface-ground/60 p-4">
                            <button onClick={() => setDeleteTarget(null)} disabled={processingId === deleteTarget.id} className="min-h-11 flex-1 rounded-xl border border-surface-muted bg-white text-sm font-bold text-brand-dark dark:bg-surface-base">Vazgeç</button>
                            <button onClick={() => void handleDelete()} disabled={processingId === deleteTarget.id} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60">{processingId === deleteTarget.id && <LoaderCircle className="h-4 w-4 animate-spin" />} Kalıcı olarak sil</button>
                        </div>
                    </div>
                </div>
            )}
        </PageContainer>
    );
};
