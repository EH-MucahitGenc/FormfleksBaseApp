import { useDeferredValue, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    ArrowUpRight,
    BarChart3,
    CalendarDays,
    CheckCircle2,
    FileBarChart,
    FolderOpen,
    LockKeyhole,
    RefreshCw,
    Search,
    ShieldCheck,
    Sparkles,
    TrendingUp,
    Users,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { PageContainer } from "@/components/ui/PageContainer";
import { campaignService } from "../services/campaign.service";
import type { CampaignListDto } from "../services/campaign.service";
import { useAuthStore } from '@/store/useAuthStore';

type CampaignFilter = "all" | "active" | "completed";

const statusMeta: Record<string, { label: string; className: string; dot: string }> = {
    Draft: { label: "Taslak", className: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300", dot: "bg-stone-500" },
    Scheduled: { label: "Planlandı", className: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300", dot: "bg-sky-500" },
    Publishing: { label: "Yayına hazırlanıyor", className: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300", dot: "bg-amber-500" },
    Published: { label: "Yayında", className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300", dot: "bg-emerald-500" },
    Closed: { label: "Tamamlandı", className: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300", dot: "bg-blue-500" },
    Cancelled: { label: "İptal edildi", className: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300", dot: "bg-red-500" },
    Archived: { label: "Arşivlendi", className: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300", dot: "bg-stone-400" },
};

const activeStatusValues = new Set([2, 3, 4]);
const completedStatusValues = new Set([5, 6, 7]);

function getStatusMeta(status: string) {
    return statusMeta[status] ?? { label: status, className: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300", dot: "bg-stone-500" };
}

function formatDate(value?: string) {
    if (!value) return null;
    return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function getDateRange(campaign: CampaignListDto) {
    const start = formatDate(campaign.startDate);
    const end = formatDate(campaign.endDate);
    if (start && end) return `${start} - ${end}`;
    if (start) return `${start} tarihinde başladı`;
    if (end) return `${end} tarihine kadar`;
    return "Tarih aralığı belirtilmedi";
}

function getParticipationRate(campaign: CampaignListDto) {
    if (!campaign.totalParticipants) return 0;
    return Math.min(100, Math.round((campaign.totalResponses / campaign.totalParticipants) * 100));
}

function ResultsSkeleton() {
    return (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="Kampanyalar yükleniyor">
            {[0, 1, 2, 3, 4, 5].map(item => (
                <div key={item} className="overflow-hidden rounded-[22px] border border-surface-muted bg-white p-5 dark:bg-surface-base">
                    <div className="flex justify-between gap-4">
                        <div className="h-6 w-24 skeleton-shimmer" />
                        <div className="h-6 w-20 skeleton-shimmer" />
                    </div>
                    <div className="mt-7 h-6 w-3/4 skeleton-shimmer" />
                    <div className="mt-3 h-4 w-full skeleton-shimmer" />
                    <div className="mt-2 h-4 w-2/3 skeleton-shimmer" />
                    <div className="mt-8 h-20 rounded-2xl skeleton-shimmer" />
                    <div className="mt-5 h-11 rounded-xl skeleton-shimmer" />
                </div>
            ))}
        </div>
    );
}

export function SurveyViewableResultsPage() {
    const canManageAccess = useAuthStore(state => state.user?.permissions?.includes('Surveys.Manage'));
    const [campaigns, setCampaigns] = useState<CampaignListDto[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<CampaignFilter>("all");
    const deferredSearch = useDeferredValue(search.trim().toLocaleLowerCase("tr-TR"));

    const loadCampaigns = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await campaignService.getMyViewableCampaigns();
            setCampaigns(data);
        } catch (loadError) {
            console.error("Failed to load viewable campaigns", loadError);
            setError("Rapor kütüphanesi şu anda yüklenemedi. Bağlantınızı kontrol edip yeniden deneyin.");
            toast.error("Kampanyalar yüklenirken bir hata oluştu.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void loadCampaigns();
    }, []);

    const totalResponses = campaigns.reduce((sum, campaign) => sum + campaign.totalResponses, 0);
    const totalParticipants = campaigns.reduce((sum, campaign) => sum + campaign.totalParticipants, 0);
    const overallRate = totalParticipants ? Math.round((totalResponses / totalParticipants) * 100) : 0;
    const activeCampaigns = campaigns.filter(campaign => activeStatusValues.has(campaign.statusValue)).length;
    const filteredCampaigns = campaigns.filter(campaign => {
        const matchesSearch = !deferredSearch
            || campaign.title.toLocaleLowerCase("tr-TR").includes(deferredSearch)
            || campaign.description?.toLocaleLowerCase("tr-TR").includes(deferredSearch);
        const matchesFilter = filter === "all"
            || (filter === "active" && activeStatusValues.has(campaign.statusValue))
            || (filter === "completed" && completedStatusValues.has(campaign.statusValue));
        return matchesSearch && matchesFilter;
    });

    return (
        <PageContainer maxWidth="7xl" className="pb-14">
            <section className="relative isolate overflow-hidden rounded-[28px] bg-[#1e1916] px-6 py-7 text-white shadow-[0_24px_70px_-42px_rgba(30,25,22,0.85)] sm:px-8 sm:py-9 lg:px-10">
                <div className="pointer-events-none absolute -right-20 -top-32 h-80 w-80 rounded-full bg-brand-primary/20 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />
                <div className="pointer-events-none absolute inset-0 opacity-[0.055] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:34px_34px]" />

                <div className="relative grid items-end gap-8 xl:grid-cols-[1.15fr_.85fr]">
                    <div>
                        <div className="mb-5 flex items-center gap-3">
                            <div className="rounded-xl bg-white px-3 py-2 shadow-lg shadow-black/15">
                                <img src="/logo.svg" alt="Formfleks" className="h-5 w-auto" />
                            </div>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/7 px-3 py-1.5 text-[11px] font-semibold tracking-[0.16em] text-white/70 uppercase">
                                <Sparkles className="h-3.5 w-3.5 text-brand-primary" /> Rapor Kütüphanesi
                            </span>
                        </div>
                        <h1 className="max-w-2xl text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">İzlenebilir Sonuçlarım</h1>
                        <p className="mt-3 max-w-xl text-sm leading-6 text-white/62 sm:text-[15px]">
                            Yetkilendirildiğiniz kampanyaların katılımını izleyin, sonuçları karşılaştırın ve detaylı analiz çalışma alanına geçin.
                        </p>
                        <div className="mt-5 inline-flex items-center gap-2 text-xs font-medium text-emerald-200/90">
                            <ShieldCheck className="h-4 w-4" /> Yalnızca erişim yetkiniz bulunan sonuçlar gösterilir
                        </div>
                        {canManageAccess && <div className="mt-4"><Link to="/admin/surveys/campaigns" className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"><ShieldCheck className="h-4 w-4" />Kampanya izleyicilerini yönet</Link></div>}
                    </div>

                    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-4 xl:grid-cols-2">
                        {[
                            { label: "Erişilebilir rapor", value: campaigns.length, icon: <FolderOpen className="h-4 w-4" /> },
                            { label: "Aktif kampanya", value: activeCampaigns, icon: <TrendingUp className="h-4 w-4" /> },
                            { label: "Toplam yanıt", value: totalResponses, icon: <FileBarChart className="h-4 w-4" /> },
                            { label: "Genel katılım", value: `%${overallRate}`, icon: <Users className="h-4 w-4" /> },
                        ].map(metric => (
                            <div key={metric.label} className="bg-[#28211d]/85 p-4 backdrop-blur-sm">
                                <div className="flex items-center gap-2 text-white/45">{metric.icon}<span className="text-[11px] font-medium">{metric.label}</span></div>
                                <strong className="mt-2 block text-2xl font-semibold tracking-tight">{typeof metric.value === "number" ? metric.value.toLocaleString("tr-TR") : metric.value}</strong>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section aria-label="Rapor filtreleri" className="rounded-[22px] border border-surface-muted bg-white p-3 shadow-[0_14px_40px_-34px_rgba(31,25,22,.5)] dark:bg-surface-base sm:flex sm:items-center sm:justify-between sm:gap-4">
                <label className="focus-ring-brand flex min-h-11 flex-1 items-center gap-3 rounded-[14px] border border-transparent bg-surface-ground px-4 sm:max-w-md">
                    <Search className="h-4 w-4 flex-none text-brand-gray" />
                    <span className="sr-only">Kampanyalarda ara</span>
                    <input
                        value={search}
                        onChange={event => setSearch(event.target.value)}
                        placeholder="Kampanya adı veya açıklama ara..."
                        className="w-full bg-transparent text-sm text-brand-dark outline-none placeholder:text-brand-gray/65"
                    />
                </label>

                <div className="mt-3 flex items-center justify-between gap-3 sm:mt-0">
                    <div className="flex rounded-[13px] bg-surface-ground p-1" role="group" aria-label="Kampanya durumu filtresi">
                        {([
                            ["all", "Tümü"],
                            ["active", "Aktif"],
                            ["completed", "Tamamlanan"],
                        ] as const).map(([value, label]) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setFilter(value)}
                                aria-pressed={filter === value}
                                className={`rounded-[10px] px-3 py-2 text-xs font-semibold transition-all sm:px-4 ${filter === value ? "bg-white text-brand-dark shadow-sm dark:bg-surface-hover" : "text-brand-gray hover:text-brand-dark"}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <span className="hidden whitespace-nowrap text-xs font-medium text-brand-gray lg:block">{filteredCampaigns.length} rapor gösteriliyor</span>
                </div>
            </section>

            {isLoading ? (
                <ResultsSkeleton />
            ) : error ? (
                <section className="grid min-h-72 place-items-center rounded-[24px] border border-red-100 bg-white p-8 text-center dark:border-red-950 dark:bg-surface-base">
                    <div>
                        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-red-600"><RefreshCw className="h-6 w-6" /></div>
                        <h2 className="mt-5 text-lg font-bold text-brand-dark">Raporlar getirilemedi</h2>
                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-brand-gray">{error}</p>
                        <button type="button" onClick={() => void loadCampaigns()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-black">
                            <RefreshCw className="h-4 w-4" /> Yeniden dene
                        </button>
                    </div>
                </section>
            ) : filteredCampaigns.length === 0 ? (
                <section className="grid min-h-72 place-items-center rounded-[24px] border border-dashed border-surface-muted bg-white/70 p-8 text-center dark:bg-surface-base/70">
                    <div>
                        <div className="mx-auto grid h-16 w-16 place-items-center rounded-[20px] bg-orange-50 text-brand-primary"><BarChart3 className="h-7 w-7" /></div>
                        <h2 className="mt-5 text-lg font-bold text-brand-dark">{campaigns.length ? "Aramanızla eşleşen rapor yok" : "Henüz erişilebilir rapor yok"}</h2>
                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-brand-gray">
                            {campaigns.length ? "Arama ifadenizi değiştirin veya durum filtresini temizleyin." : "Oluşturduğunuz veya sonuç izleyicisi olarak yetkilendirildiğiniz kampanyalar burada görünür. Erişimi kaldırılmış kampanyalar listelenmez."}
                        </p>
                        {campaigns.length > 0 && <button type="button" onClick={() => { setSearch(""); setFilter("all"); }} className="mt-4 text-sm font-semibold text-brand-primary hover:underline">Filtreleri temizle</button>}
                    </div>
                </section>
            ) : (
                <section aria-label="Erişilebilir anket raporları" className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {filteredCampaigns.map((campaign, index) => {
                        const status = getStatusMeta(campaign.status);
                        const rate = getParticipationRate(campaign);
                        return (
                            <article
                                key={campaign.id}
                                className="group relative flex min-h-[360px] flex-col overflow-hidden rounded-[22px] border border-[#e8e2dd] bg-white shadow-[0_18px_50px_-42px_rgba(35,27,22,.9)] transition duration-300 hover:-translate-y-1 hover:border-[#ddd3cc] hover:shadow-[0_28px_65px_-42px_rgba(35,27,22,.75)] dark:border-surface-muted dark:bg-surface-base dark:hover:border-stone-600 animate-fade-in-up"
                                style={{ animationDelay: `${Math.min(index, 5) * 70}ms` }}
                            >
                                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-primary via-amber-400 to-transparent opacity-80" />
                                <div className="pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full bg-orange-50 transition-transform duration-500 group-hover:scale-125 dark:bg-orange-950/20" />

                                <div className="relative flex flex-1 flex-col p-5 sm:p-6">
                                    <div className="flex items-start justify-between gap-3">
                                        <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1.5 text-[11px] font-bold ${status.className}`}>
                                            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />{status.label}
                                        </span>
                                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold ${campaign.isAnonymous ? "border-emerald-100 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300" : "border-orange-100 bg-orange-50/70 text-orange-700 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-300"}`}>
                                            {campaign.isAnonymous ? <LockKeyhole className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
                                            {campaign.isAnonymous ? "Anonim" : "Kimlikli"}
                                        </span>
                                    </div>

                                    <div className="mt-6">
                                        <h2 className="line-clamp-2 text-xl font-bold leading-7 tracking-[-0.025em] text-brand-dark">{campaign.title}</h2>
                                        <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-brand-gray">
                                            {campaign.description || "Bu kampanya için açıklama eklenmemiş."}
                                        </p>
                                    </div>

                                    <div className="mt-5 flex items-center gap-2 text-xs font-medium text-brand-gray">
                                        <CalendarDays className="h-4 w-4 text-brand-primary" /> {getDateRange(campaign)}
                                    </div>

                                    <div className="mt-6 rounded-2xl border border-[#eee9e5] bg-[#faf9f7] p-4 dark:border-surface-muted dark:bg-[#2a231f]">
                                        <div className="flex items-end justify-between gap-4">
                                            <div>
                                                <span className="text-[11px] font-semibold tracking-wide text-brand-gray uppercase">Katılım</span>
                                                <div className="mt-1 flex items-baseline gap-1.5">
                                                    <strong className="text-2xl font-bold tracking-tight text-brand-dark">%{rate}</strong>
                                                    <span className="text-xs text-brand-gray">tamamlandı</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <strong className="block text-sm text-brand-dark">{campaign.totalResponses.toLocaleString("tr-TR")} yanıt</strong>
                                                <span className="text-xs text-brand-gray">{campaign.totalParticipants.toLocaleString("tr-TR")} katılımcıdan</span>
                                            </div>
                                        </div>
                                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e9e4df] dark:bg-stone-700" aria-label={`Katılım yüzde ${rate}`}>
                                            <div className="h-full rounded-full bg-gradient-to-r from-brand-primary to-amber-400 transition-[width] duration-700" style={{ width: `${rate}%` }} />
                                        </div>
                                    </div>
                                </div>

                                <div className="relative border-t border-[#eee9e5] bg-[#fffdfb] px-5 py-4 dark:border-surface-muted dark:bg-[#251f1b] sm:px-6">
                                    <Link
                                        to={`/admin/surveys/campaigns/${campaign.id}/results`}
                                        className="flex min-h-11 w-full items-center justify-between rounded-[13px] bg-[#211a17] px-4 text-sm font-semibold text-white transition-all hover:bg-brand-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200"
                                        aria-label={`${campaign.title} sonuçlarını incele`}
                                    >
                                        <span className="inline-flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Analiz çalışma alanını aç</span>
                                        <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                    </Link>
                                </div>
                            </article>
                        );
                    })}
                </section>
            )}

            {!isLoading && !error && campaigns.length > 0 && (
                <footer className="flex flex-col gap-3 rounded-2xl border border-surface-muted bg-white/65 px-5 py-4 text-xs text-brand-gray dark:bg-surface-base/65 sm:flex-row sm:items-center sm:justify-between">
                    <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Veriler güncel kampanya sonuçlarından güvenli biçimde hazırlanır.</span>
                    <span>Sonuç oranı: tamamlanan yanıt / hedeflenen katılımcı</span>
                </footer>
            )}
        </PageContainer>
    );
}
