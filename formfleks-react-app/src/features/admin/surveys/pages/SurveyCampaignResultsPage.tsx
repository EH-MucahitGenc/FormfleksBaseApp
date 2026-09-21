import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    AlertTriangle, BarChart3, ChevronLeft, ChevronRight, Clock3, Download, EyeOff,
    FileText, Filter, Info, LockKeyhole, MessageSquareText, ShieldCheck, TrendingUp, Users
} from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/axios';
import { campaignService, type CampaignSegments, type PagedTextAnswers } from '../services/campaign.service';

interface OptionStat { optionId: string; label: string; count: number; percentage: number; selectionPercentage?: number; }
interface NumericSummary { count: number; average?: number; median?: number; mode?: number; standardDeviation?: number; minimum?: number; maximum?: number; lowerQuartile?: number; upperQuartile?: number; topBoxPercentage?: number; bottomBoxPercentage?: number; }
interface QuestionStats { questionId: string; title: string; type: number; isRequired: boolean; eligibleResponses: number; totalAnswers: number; missingAnswers: number; answerRate: number; percentageDenominator: string; totalSelections: number; averageSelectionsPerRespondent?: number; optionStats: OptionStat[]; numericSummary?: NumericSummary; npsSummary?: { promoters: number; passives: number; detractors: number; score: number }; textAnswerCount: number; }
interface CampaignResults {
    campaignId: string; title: string; description?: string; isAnonymous: boolean; status: string; startDate?: string; endDate?: string;
    totalParticipants: number; totalResponses: number; responseRate: number; 
    canViewTextAnswers: boolean; canViewIdentifiedResponses: boolean; canViewResponseFiles: boolean;
    canExportAggregate: boolean; canExportIdentified: boolean;
    funnel: { targeted: number; assigned: number; emailQueued: number; emailDelivered: number; emailFailed: number; started: number; completed: number; abandoned: number; expired: number; startToCompletionRate: number };
    timing: { firstResponseAt?: string; lastResponseAt?: string; averageCompletionSeconds?: number; medianCompletionSeconds?: number };
    dataQuality: { responsesEvaluated: number; speedingResponses: number; highMissingResponses: number; flaggedResponses: number; speedingThresholdSeconds: number };
    responseTrend: Array<{ date: string; count: number; cumulativeCount: number }>;
    questions: QuestionStats[];
    methodology: { responseRateFormula: string; questionRateFormula: string; multipleChoiceNote: string; representationNote: string; anonymousMinimumGroupSize: number };
}

type Tab = 'overview' | 'questions' | 'segments' | 'methodology';

const formatDuration = (seconds?: number) => {
    if (seconds == null) return '-';
    if (seconds < 60) return `${Math.round(seconds)} saniye`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes} dk ${Math.round(seconds % 60)} sn`;
};

const TextAnswersPanel = ({ campaignId, question, isAnonymous, canViewIdentifiedResponses }: { campaignId: string; question: QuestionStats; isAnonymous: boolean; canViewIdentifiedResponses: boolean }) => {
    const [data, setData] = useState<PagedTextAnswers | null>(null);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);

    const load = async (targetPage: number) => {
        setLoading(true);
        try {
            setData(await campaignService.getQuestionTextAnswers(campaignId, question.questionId, targetPage, 10));
            setPage(targetPage);
        } catch (error) {
            console.error(error);
            toast.error('Metin yanıtları yüklenemedi.');
        } finally { setLoading(false); }
    };

    if (!data) return <button onClick={() => load(1)} disabled={loading || question.textAnswerCount === 0} className="inline-flex items-center gap-2 rounded-xl bg-brand-dark px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"><MessageSquareText className="h-4 w-4" />{loading ? 'Yükleniyor...' : `${question.textAnswerCount} metin yanıtını incele`}</button>;
    if (data.isSuppressed) return <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><EyeOff className="mt-0.5 h-4 w-4 flex-none" /><div><strong>Yanıtlar gizlendi</strong><p className="mt-1">{data.suppressionReason}</p></div></div>;

    const showPrivacyWarning = isAnonymous || !canViewIdentifiedResponses;

    return <div className="space-y-3">{showPrivacyWarning && <p className="flex items-center gap-2 text-xs text-brand-gray"><ShieldCheck className="h-3.5 w-3.5" />Kişisel veri örüntüleri maskelenir ve kesin saat bilgisi gösterilmez.</p>}{data.items.map(item => <article key={item.answerId} className="rounded-xl border border-surface-muted bg-surface-ground/40 p-4"><div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-brand-gray">{item.participantName && <strong className="text-brand-dark">{item.participantName}</strong>}{item.department && <span>{item.department}</span>}<span>{new Date(item.submittedAt).toLocaleDateString('tr-TR')}</span></div><p className="whitespace-pre-wrap text-sm leading-6 text-brand-dark">{item.text}</p></article>)}<div className="flex items-center justify-between"><span className="text-xs text-brand-gray">{data.totalCount} yanıt · Sayfa {page}</span><div className="flex gap-2"><button onClick={() => load(page - 1)} disabled={loading || page <= 1} className="grid h-8 w-8 place-items-center rounded-lg border border-surface-muted disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><button onClick={() => load(page + 1)} disabled={loading || page * data.pageSize >= data.totalCount} className="grid h-8 w-8 place-items-center rounded-lg border border-surface-muted disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div></div></div>;
};

export const SurveyCampaignResultsPage = () => {
    const { id } = useParams<{ id: string }>();
    const [results, setResults] = useState<CampaignResults | null>(null);
    const [segments, setSegments] = useState<CampaignSegments | null>(null);
    const [dimension, setDimension] = useState('department');
    const [tab, setTab] = useState<Tab>('overview');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const canExport = results ? results.canExportAggregate || results.canExportIdentified : false;

    useEffect(() => {
        if (!id) return;
        apiClient.get<CampaignResults>(`/admin/surveys/campaigns/${id}/analytics/overview`).then(response => setResults(response.data)).catch(requestError => {
            console.error(requestError); setError('Rapor yüklenemedi veya bu kampanyaya erişim yetkiniz bulunmuyor.');
        }).finally(() => setLoading(false));
    }, [id]);

    useEffect(() => {
        if (!id || tab !== 'segments') return;
        campaignService.getCampaignSegments(id, dimension).then(setSegments).catch(error => {
            console.error(error); toast.error('Segment analizi yüklenemedi.');
        });
    }, [id, tab, dimension]);

    const exportCsv = async () => {
        if (!id) return;
        try {
            const response = await apiClient.get(`/admin/surveys/campaigns/${id}/export`, { responseType: 'blob' });
            const url = URL.createObjectURL(response.data); const anchor = document.createElement('a');
            anchor.href = url; anchor.download = `anket-sonuclari-${id}.csv`; anchor.click(); URL.revokeObjectURL(url);
        } catch (exportError) { console.error(exportError); toast.error('Rapor dışa aktarılamadı.'); }
    };

    if (loading) return <div className="grid min-h-[70vh] place-items-center bg-surface-ground"><div className="text-center"><div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-brand-primary/20 border-t-brand-primary" /><p className="mt-4 text-sm font-medium text-brand-gray">Analiz çalışma alanı hazırlanıyor...</p></div></div>;
    if (error || !results) return <div className="grid min-h-[70vh] place-items-center bg-surface-ground"><div className="max-w-md text-center"><AlertTriangle className="mx-auto h-10 w-10 text-red-500" /><h2 className="mt-3 text-xl font-bold">Rapor açılamadı</h2><p className="mt-2 text-sm text-brand-gray">{error}</p></div></div>;

    const funnel = [
        ['Atandı', results.funnel.assigned], ['Teslim edildi', results.funnel.emailDelivered],
        ['Başladı', results.funnel.started], ['Tamamladı', results.funnel.completed]
    ] as const;
    const maxSegmentRate = Math.max(1, ...(segments?.items.map(item => item.responseRate ?? 0) ?? []));

    const showYanitGezgini = results.canViewIdentifiedResponses;

    return <div className="min-h-full bg-surface-ground">
        <header className="sticky top-0 z-20 border-b border-surface-muted bg-white/95 backdrop-blur">
            <div className="mx-auto flex max-w-[1500px] items-center gap-4 px-5 py-4 lg:px-8"><Link to="/admin/surveys/campaigns" className="grid h-10 w-10 place-items-center rounded-xl bg-surface-ground text-brand-gray hover:text-brand-dark"><ChevronLeft className="h-5 w-5" /></Link><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="truncate text-xl font-bold text-brand-dark">{results.title}</h1><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${results.isAnonymous ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>{results.isAnonymous ? <ShieldCheck className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}{results.isAnonymous ? 'Anonim rapor' : 'Kimlikli rapor'}</span></div><p className="mt-1 text-xs text-brand-gray">{results.status} · {results.totalResponses.toLocaleString('tr-TR')} tamamlanmış yanıt</p></div><div className="ml-auto flex gap-2">{showYanitGezgini && <Link to={`/admin/surveys/campaigns/${id}/participants`} className="hidden items-center gap-2 rounded-xl border border-surface-muted px-4 py-2.5 text-sm font-semibold text-brand-dark sm:inline-flex"><Users className="h-4 w-4" />Yanıt gezgini</Link>}{canExport && <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-xl bg-brand-dark px-4 py-2.5 text-sm font-semibold text-white"><Download className="h-4 w-4" /><span className="hidden sm:inline">Dışa aktar</span></button>}</div></div>
            <nav className="mx-auto flex max-w-[1500px] gap-1 overflow-x-auto px-5 lg:px-8">{([['overview', 'Genel bakış'], ['questions', 'Soru analizleri'], ['segments', 'Segmentler'], ['methodology', 'Metodoloji']] as Array<[Tab, string]>).map(([value, label]) => <button key={value} onClick={() => setTab(value)} className={`border-b-2 px-4 py-3 text-sm font-semibold whitespace-nowrap ${tab === value ? 'border-brand-primary text-brand-primary' : 'border-transparent text-brand-gray'}`}>{label}</button>)}</nav>
        </header>

        <main className="mx-auto max-w-[1500px] space-y-6 px-5 py-7 lg:px-8">
            {results.isAnonymous && <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><LockKeyhole className="mt-0.5 h-5 w-5 flex-none" /><div><strong>Anonimlik koruması etkin</strong><p className="mt-1">Tekil katılımcılar gösterilmez; 10 yanıtın altındaki segmentler ve metin grupları backend tarafından gizlenir.</p></div></div>}

            {tab === 'overview' && <>
                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
                    ['Hedef kitle', results.totalParticipants, 'atanan aktif kullanıcı', <Users className="h-5 w-5" />],
                    ['Tamamlanan', results.totalResponses, 'geçerli yanıt', <FileText className="h-5 w-5" />],
                    ['Katılım oranı', `%${results.responseRate}`, `${results.totalResponses} / ${results.totalParticipants}`, <TrendingUp className="h-5 w-5" />],
                    ['Medyan süre', formatDuration(results.timing.medianCompletionSeconds), `Ortalama ${formatDuration(results.timing.averageCompletionSeconds)}`, <Clock3 className="h-5 w-5" />]
                ].map(([label, value, note, icon]) => <article key={String(label)} className="rounded-2xl border border-surface-muted bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-gray">{label}</p><span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-50 text-brand-primary">{icon}</span></div><p className="mt-3 text-3xl font-bold text-brand-dark">{value}</p><p className="mt-1 text-xs text-brand-gray">{note}</p></article>)}</section>
                <section className="grid gap-5 xl:grid-cols-[1.1fr_1.9fr]"><article className="rounded-2xl border border-surface-muted bg-white p-5 shadow-sm"><h2 className="font-bold text-brand-dark">Katılım hunisi</h2><p className="mt-1 text-xs text-brand-gray">Davetin yanıta dönüşümünü aşama aşama gösterir.</p><div className="mt-5 space-y-4">{funnel.map(([label, value], index) => <div key={label}><div className="mb-1.5 flex justify-between text-sm"><span className="font-medium text-brand-dark">{label}</span><strong>{value.toLocaleString('tr-TR')}</strong></div><div className="h-3 overflow-hidden rounded-full bg-surface-ground"><div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400" style={{ width: `${results.funnel.assigned ? Math.max(3, value / results.funnel.assigned * 100) : 0}%`, opacity: 1 - index * .12 }} /></div></div>)}</div><div className="mt-5 grid grid-cols-3 gap-2 border-t border-surface-muted pt-4 text-center"><div><strong className="block text-lg text-red-600">{results.funnel.emailFailed}</strong><span className="text-xs text-brand-gray">Teslim hatası</span></div><div><strong className="block text-lg text-amber-600">{results.funnel.abandoned}</strong><span className="text-xs text-brand-gray">Yarım bırakan</span></div><div><strong className="block text-lg text-brand-dark">%{results.funnel.startToCompletionRate}</strong><span className="text-xs text-brand-gray">Başla-tamamla</span></div></div></article>
                    <article className="rounded-2xl border border-surface-muted bg-white p-5 shadow-sm"><h2 className="font-bold text-brand-dark">Yanıt hareketi</h2><p className="mt-1 text-xs text-brand-gray">Günlük tamamlanan yanıt ve kümülatif büyüme.</p><div className="mt-5 h-72">{results.responseTrend.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={results.responseTrend}><CartesianGrid strokeDasharray="3 3" stroke="#ece8e4" /><XAxis dataKey="date" tickFormatter={value => new Date(value).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })} fontSize={11} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip labelFormatter={value => new Date(value).toLocaleDateString('tr-TR')} /><Line type="monotone" dataKey="count" name="Günlük" stroke="#ff6b35" strokeWidth={3} dot={{ r: 3 }} /><Line type="monotone" dataKey="cumulativeCount" name="Kümülatif" stroke="#24303f" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer> : <div className="grid h-full place-items-center text-sm text-brand-gray">Henüz zaman serisi oluşturacak yanıt yok.</div>}</div></article></section>
                <section className="grid gap-5 lg:grid-cols-2"><article className="rounded-2xl border border-surface-muted bg-white p-5"><h2 className="flex items-center gap-2 font-bold"><ShieldCheck className="h-5 w-5 text-emerald-600" />Veri kalitesi</h2><div className="mt-4 grid grid-cols-3 gap-3 text-center"><div className="rounded-xl bg-surface-ground p-3"><strong className="text-xl">{results.dataQuality.responsesEvaluated}</strong><span className="block text-xs text-brand-gray">İncelenen</span></div><div className="rounded-xl bg-amber-50 p-3"><strong className="text-xl text-amber-700">{results.dataQuality.speedingResponses}</strong><span className="block text-xs text-brand-gray">Hızlı yanıt</span></div><div className="rounded-xl bg-red-50 p-3"><strong className="text-xl text-red-700">{results.dataQuality.flaggedResponses}</strong><span className="block text-xs text-brand-gray">İşaretli</span></div></div><p className="mt-3 text-xs text-brand-gray">Kalite işaretleri yanıtları silmez; analiz için inceleme sinyali üretir. Hız eşiği: {results.dataQuality.speedingThresholdSeconds} saniye.</p></article><article className="rounded-2xl border border-surface-muted bg-brand-dark p-5 text-white"><h2 className="font-bold">Temsil uyarısı</h2><p className="mt-3 text-sm leading-6 text-white/75">{results.methodology.representationNote}</p><button onClick={() => setTab('segments')} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-dark"><Filter className="h-4 w-4" />Segmentleri kontrol et</button></article></section>
            </>}

            {tab === 'questions' && <section className="space-y-5">{results.questions.map((question, index) => <article key={question.questionId} className="overflow-hidden rounded-2xl border border-surface-muted bg-white shadow-sm"><header className="flex flex-wrap items-start justify-between gap-4 border-b border-surface-muted bg-gradient-to-r from-orange-50/70 to-white px-5 py-4"><div className="flex gap-3"><span className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-brand-primary text-sm font-bold text-white">{index + 1}</span><div><h2 className="font-bold text-brand-dark">{question.title}</h2><p className="mt-1 text-xs text-brand-gray">{question.isRequired ? 'Zorunlu' : 'Opsiyonel'} · Payda: {question.percentageDenominator}</p></div></div><div className="flex gap-5 text-right"><div><span className="block text-xs text-brand-gray">Geçerli</span><strong>{question.totalAnswers}</strong></div><div><span className="block text-xs text-brand-gray">Eksik</span><strong className={question.missingAnswers ? 'text-amber-600' : ''}>{question.missingAnswers}</strong></div><div><span className="block text-xs text-brand-gray">Yanıtlama</span><strong>%{question.answerRate}</strong></div></div></header><div className="p-5">{question.numericSummary && question.numericSummary.count > 0 && <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{[['Ortalama', question.numericSummary.average], ['Medyan', question.numericSummary.median], ['Std. sapma', question.numericSummary.standardDeviation], ['Minimum', question.numericSummary.minimum], ['Maksimum', question.numericSummary.maximum], ['N', question.numericSummary.count]].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-surface-ground p-3"><span className="block text-xs text-brand-gray">{label}</span><strong className="mt-1 block text-lg text-brand-dark">{value ?? '-'}</strong></div>)}</div>}{question.npsSummary && <div className="mb-5 flex flex-wrap gap-3 rounded-xl border border-surface-muted p-4"><div className="mr-4"><span className="block text-xs text-brand-gray">NPS</span><strong className="text-3xl text-brand-primary">{question.npsSummary.score > 0 ? '+' : ''}{question.npsSummary.score}</strong></div><div><span className="block text-xs text-brand-gray">Destekçi</span><strong>{question.npsSummary.promoters}</strong></div><div><span className="block text-xs text-brand-gray">Pasif</span><strong>{question.npsSummary.passives}</strong></div><div><span className="block text-xs text-brand-gray">Eleştiren</span><strong>{question.npsSummary.detractors}</strong></div></div>}{question.optionStats.length > 0 && <div className="space-y-4">{question.optionStats.map(option => <div key={`${question.questionId}-${option.optionId}-${option.label}`}><div className="mb-1.5 flex justify-between gap-3 text-sm"><span className="font-medium text-brand-dark">{option.label}</span><span className="text-brand-gray"><strong className="text-brand-dark">{option.count}</strong> · %{option.percentage}{question.type === 4 && option.selectionPercentage != null ? ` · seçimlerin %${option.selectionPercentage}` : ''}</span></div><div className="h-2.5 overflow-hidden rounded-full bg-surface-ground"><div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400" style={{ width: `${option.percentage}%` }} /></div></div>)}{question.type === 4 && <p className="text-xs text-brand-gray">Toplam {question.totalSelections} seçim · kişi başına ortalama {question.averageSelectionsPerRespondent ?? 0} seçim</p>}</div>}{results.canViewTextAnswers && [1, 2].includes(question.type) && <TextAnswersPanel campaignId={results.campaignId} question={question} isAnonymous={results.isAnonymous} canViewIdentifiedResponses={results.canViewIdentifiedResponses} />}{question.totalAnswers === 0 && question.type !== 12 && <p className="text-sm text-brand-gray">Bu soru için henüz geçerli yanıt yok.</p>}{question.type === 12 && <p className="flex items-center gap-2 text-sm text-brand-gray"><Info className="h-4 w-4" />Bilgilendirme alanı, yanıt beklenmez.</p>}</div></article>)}</section>}

            {tab === 'segments' && <section className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold text-brand-dark">Organizasyon segmentleri</h2><p className="mt-1 text-sm text-brand-gray">Katılım kapsamını kampanya anındaki snapshot boyutlarıyla karşılaştırın.</p></div><div className="flex flex-wrap gap-2">{[['company', 'Şirket'], ['location', 'Lokasyon'], ['department', 'Departman'], ['title', 'Unvan'], ['personnelgroup', 'Personel grubu']].map(([value, label]) => <button key={value} onClick={() => setDimension(value)} className={`rounded-xl px-3 py-2 text-xs font-semibold ${dimension === value ? 'bg-brand-dark text-white' : 'border border-surface-muted bg-white text-brand-gray'}`}>{label}</button>)}</div></div><article className="rounded-2xl border border-surface-muted bg-white p-5 shadow-sm">{!segments ? <p className="py-12 text-center text-sm text-brand-gray">Segmentler yükleniyor...</p> : <div className="space-y-4">{segments.items.map(item => <div key={item.label} className="grid items-center gap-3 md:grid-cols-[minmax(160px,1fr)_3fr_120px]"><div><p className="truncate text-sm font-semibold text-brand-dark" title={item.label}>{item.label}</p>{item.isSuppressed && <p className="text-xs text-amber-700">Yetersiz örneklem</p>}</div>{item.isSuppressed ? <div className="h-10 rounded-xl bg-[repeating-linear-gradient(135deg,#f6f2ee,#f6f2ee_8px,#ebe5df_8px,#ebe5df_16px)]" /> : <div className="h-3 overflow-hidden rounded-full bg-surface-ground"><div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400" style={{ width: `${(item.responseRate ?? 0) / maxSegmentRate * 100}%` }} /></div>}<div className="text-right">{item.isSuppressed ? <EyeOff className="ml-auto h-4 w-4 text-brand-gray" /> : <><strong className="text-lg text-brand-dark">%{item.responseRate}</strong><span className="block text-xs text-brand-gray">{item.responses}/{item.participants} yanıt</span></>}</div></div>)}</div>}</article>{segments?.isAnonymous && <p className="flex items-center gap-2 text-xs text-brand-gray"><ShieldCheck className="h-4 w-4" />{segments.minimumGroupSize} yanıtın altındaki segment hücreleri API seviyesinde gizlenir.</p>}</section>}

            {tab === 'methodology' && <section className="grid gap-5 lg:grid-cols-2"><article className="rounded-2xl border border-surface-muted bg-white p-6"><BarChart3 className="h-7 w-7 text-brand-primary" /><h2 className="mt-4 text-lg font-bold">Metrik sözlüğü</h2><dl className="mt-5 space-y-4 text-sm"><div><dt className="font-semibold">Katılım oranı</dt><dd className="mt-1 text-brand-gray">{results.methodology.responseRateFormula}</dd></div><div><dt className="font-semibold">Soru yanıtlama oranı</dt><dd className="mt-1 text-brand-gray">{results.methodology.questionRateFormula}</dd></div><div><dt className="font-semibold">Çoklu seçim</dt><dd className="mt-1 text-brand-gray">{results.methodology.multipleChoiceNote}</dd></div></dl></article><article className="rounded-2xl border border-surface-muted bg-white p-6"><ShieldCheck className="h-7 w-7 text-emerald-600" /><h2 className="mt-4 text-lg font-bold">Gizlilik ve yorumlama</h2><p className="mt-4 text-sm leading-6 text-brand-gray">{results.methodology.representationNote}</p><p className="mt-4 rounded-xl bg-surface-ground p-4 text-sm text-brand-dark">Anonim minimum görünür grup: <strong>{results.methodology.anonymousMinimumGroupSize} yanıt</strong>. Bu eşik segmentlerde ve açık metin listelerinde backend tarafından uygulanır.</p></article></section>}
        </main>
    </div>;
};
