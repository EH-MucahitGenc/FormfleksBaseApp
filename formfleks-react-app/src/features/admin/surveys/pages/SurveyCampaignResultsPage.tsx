import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Users, FileText, CheckCircle2, Download, BarChart3, MessageSquare, Hash, Calendar, Star, ThumbsUp, Grid3X3, Paperclip, Info, User, TrendingUp } from 'lucide-react';
import { apiClient } from '@/lib/axios';
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuthStore } from '@/store/useAuthStore';

interface OptionStat {
    optionId: string;
    label: string;
    count: number;
    percentage: number;
}

interface QuestionStats {
    questionId: string;
    title: string;
    type: number;
    totalAnswers: number;
    optionStats: OptionStat[];
    textAnswers: string[];
}

interface CampaignResults {
    campaignId: string;
    title: string;
    totalParticipants: number;
    totalResponses: number;
    responseRate: number;
    questions: QuestionStats[];
}

const CHART_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899',
    '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6', '#e11d48'
];

const QUESTION_TYPE_MAP: Record<number, { label: string; icon: React.ReactNode; color: string }> = {
    1: { label: 'Kısa Metin', icon: <MessageSquare className="h-3.5 w-3.5" />, color: 'bg-blue-100 text-blue-700' },
    2: { label: 'Uzun Metin', icon: <MessageSquare className="h-3.5 w-3.5" />, color: 'bg-blue-100 text-blue-700' },
    3: { label: 'Tek Seçim', icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: 'bg-emerald-100 text-emerald-700' },
    4: { label: 'Çoklu Seçim', icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: 'bg-teal-100 text-teal-700' },
    5: { label: 'Evet / Hayır', icon: <ThumbsUp className="h-3.5 w-3.5" />, color: 'bg-amber-100 text-amber-700' },
    6: { label: 'Derecelendirme', icon: <Star className="h-3.5 w-3.5" />, color: 'bg-yellow-100 text-yellow-700' },
    7: { label: 'NPS', icon: <TrendingUp className="h-3.5 w-3.5" />, color: 'bg-purple-100 text-purple-700' },
    8: { label: 'Sayı', icon: <Hash className="h-3.5 w-3.5" />, color: 'bg-indigo-100 text-indigo-700' },
    9: { label: 'Tarih', icon: <Calendar className="h-3.5 w-3.5" />, color: 'bg-pink-100 text-pink-700' },
    10: { label: 'Matris', icon: <Grid3X3 className="h-3.5 w-3.5" />, color: 'bg-orange-100 text-orange-700' },
    11: { label: 'Dosya', icon: <Paperclip className="h-3.5 w-3.5" />, color: 'bg-slate-100 text-slate-700' },
    12: { label: 'Bilgi', icon: <Info className="h-3.5 w-3.5" />, color: 'bg-gray-100 text-gray-600' },
};

/* ───── Circular Progress Ring ───── */
const ProgressRing = ({ value, size = 56, strokeWidth = 5, color = '#3b82f6' }: { value: number; size?: number; strokeWidth?: number; color?: string }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (Math.min(value, 100) / 100) * circumference;
    return (
        <svg width={size} height={size} className="transform -rotate-90">
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
                strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
                className="transition-all duration-700 ease-out" />
        </svg>
    );
};

/* ───── Horizontal Bar for option stats ───── */
const HorizontalBar = ({ label, count, percentage, color, maxPercentage }: { label: string; count: number; percentage: number; color: string; maxPercentage: number }) => {
    const barWidth = maxPercentage > 0 ? (percentage / maxPercentage) * 100 : 0;
    return (
        <div className="group">
            <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-sm font-medium text-brand-dark truncate">{label}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    <span className="text-xs font-semibold text-brand-gray tabular-nums">{count} yanıt</span>
                    <span className="text-sm font-bold text-brand-dark tabular-nums w-14 text-right">%{percentage % 1 === 0 ? percentage.toFixed(0) : percentage.toFixed(1)}</span>
                </div>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${barWidth}%`, backgroundColor: color }} />
            </div>
        </div>
    );
};

/* ───── Text Answer Card ───── */
const TextAnswerCard = ({ answer, index, questionType }: { answer: string; index: number; questionType: number }) => {
    const colonIdx = answer.indexOf(': ');
    const hasUser = colonIdx > 0 && colonIdx < 50;
    const userName = hasUser ? answer.substring(0, colonIdx) : null;
    const answerText = hasUser ? answer.substring(colonIdx + 2) : answer;

    if (questionType === 11 && answerText.startsWith('http')) {
        return (
            <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-lg border border-surface-muted hover:border-brand-primary/30 transition-colors">
                {userName && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        <div className="w-7 h-7 rounded-full bg-brand-primary/10 flex items-center justify-center">
                            <User className="h-3.5 w-3.5 text-brand-primary" />
                        </div>
                        <span className="text-xs font-semibold text-brand-dark">{userName}</span>
                        <span className="text-gray-300 mx-1">|</span>
                    </div>
                )}
                <Paperclip className="h-4 w-4 text-brand-gray flex-shrink-0" />
                <a href={answerText} target="_blank" rel="noreferrer" className="text-sm text-brand-primary hover:underline truncate">{answerText}</a>
            </div>
        );
    }

    return (
        <div className="flex items-start gap-3 px-4 py-3 bg-white rounded-lg border border-surface-muted hover:border-brand-primary/30 transition-colors">
            {userName ? (
                <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
                    <div className="w-7 h-7 rounded-full bg-brand-primary/10 flex items-center justify-center">
                        <User className="h-3.5 w-3.5 text-brand-primary" />
                    </div>
                </div>
            ) : (
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-brand-gray mt-0.5">{index + 1}</span>
            )}
            <div className="min-w-0 flex-1">
                {userName && <p className="text-xs font-semibold text-brand-dark mb-0.5">{userName}</p>}
                <p className="text-sm text-brand-dark/80 leading-relaxed break-words">{answerText}</p>
            </div>
        </div>
    );
};

/* ───── Custom Donut Chart Label ───── */
const renderCustomLabel = ({ cx, cy, midAngle, outerRadius, percent }: any) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 24;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
        <text x={x} y={y} fill="#374151" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12} fontWeight={600}>
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

/* ───── Rating / NPS special summary ───── */
const RatingNpsSummary = ({ optionStats, type }: { optionStats: OptionStat[]; type: number }) => {
    const totalVotes = optionStats.reduce((s, o) => s + o.count, 0);
    if (totalVotes === 0) return null;
    const weightedSum = optionStats.reduce((s, o) => s + (parseFloat(o.label) || 0) * o.count, 0);
    const average = weightedSum / totalVotes;

    if (type === 7) {
        const promoters = optionStats.filter(o => parseFloat(o.label) >= 9).reduce((s, o) => s + o.count, 0);
        const detractors = optionStats.filter(o => parseFloat(o.label) <= 6).reduce((s, o) => s + o.count, 0);
        const npsScore = Math.round(((promoters - detractors) / totalVotes) * 100);
        const npsColor = npsScore >= 50 ? '#10b981' : npsScore >= 0 ? '#f59e0b' : '#ef4444';

        return (
            <div className="flex items-center gap-6 mb-6 p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-surface-muted">
                <div className="text-center">
                    <p className="text-xs font-medium text-brand-gray uppercase tracking-wide mb-1">NPS Skoru</p>
                    <p className="text-3xl font-bold" style={{ color: npsColor }}>{npsScore > 0 ? '+' : ''}{npsScore}</p>
                </div>
                <div className="h-12 w-px bg-surface-muted" />
                <div className="flex gap-4 text-xs">
                    <div className="text-center">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 mx-auto mb-1" />
                        <p className="font-semibold text-brand-dark">{promoters}</p>
                        <p className="text-brand-gray">Destekçi</p>
                    </div>
                    <div className="text-center">
                        <div className="w-3 h-3 rounded-full bg-amber-400 mx-auto mb-1" />
                        <p className="font-semibold text-brand-dark">{totalVotes - promoters - detractors}</p>
                        <p className="text-brand-gray">Pasif</p>
                    </div>
                    <div className="text-center">
                        <div className="w-3 h-3 rounded-full bg-red-500 mx-auto mb-1" />
                        <p className="font-semibold text-brand-dark">{detractors}</p>
                        <p className="text-brand-gray">Eleştiren</p>
                    </div>
                </div>
                <div className="h-12 w-px bg-surface-muted" />
                <div className="text-center">
                    <p className="text-xs font-medium text-brand-gray uppercase tracking-wide mb-1">Ortalama</p>
                    <p className="text-xl font-bold text-brand-dark">{average.toFixed(1)}</p>
                </div>
            </div>
        );
    }

    // Rating
    return (
        <div className="flex items-center gap-6 mb-6 p-4 bg-gradient-to-r from-yellow-50/50 to-white rounded-xl border border-surface-muted">
            <div className="text-center">
                <p className="text-xs font-medium text-brand-gray uppercase tracking-wide mb-1">Ortalama Puan</p>
                <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                    <p className="text-3xl font-bold text-brand-dark">{average.toFixed(1)}</p>
                </div>
            </div>
            <div className="h-12 w-px bg-surface-muted" />
            <div className="text-center">
                <p className="text-xs font-medium text-brand-gray uppercase tracking-wide mb-1">Toplam Oy</p>
                <p className="text-xl font-bold text-brand-dark">{totalVotes}</p>
            </div>
        </div>
    );
};

/* ═════════════════════════════════════════════════════
   MAIN COMPONENT
   ═════════════════════════════════════════════════════ */
export const SurveyCampaignResultsPage = () => {
    const { id } = useParams<{ id: string }>();
    const [results, setResults] = useState<CampaignResults | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
    const { user } = useAuthStore();

    const hasPermission = (perm: string) => user?.permissions?.includes(perm);
    const isAdminRole = user?.roles?.includes('Global Admin');
    const canExport = hasPermission('Surveys.Manage') || hasPermission('Surveys.Results.Export') || isAdminRole;

    useEffect(() => {
        if (!id) return;
        apiClient.get<CampaignResults>(`/admin/surveys/campaigns/${id}/results`)
            .then(res => {
                setResults(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                const msg = err?.response?.data?.message || err?.response?.data || 'Sonuçlar yüklenirken bir hata oluştu.';
                setError(typeof msg === 'string' ? msg : 'Sonuçlar yüklenirken bir hata oluştu.');
                setLoading(false);
            });
    }, [id]);

    const handleExport = async () => {
        try {
            const response = await apiClient.get(`/admin/surveys/campaigns/${id}/export`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Anket_Sonuclari_${results?.title || 'export'}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error("Export failed", err);
        }
    };

    const toggleExpand = (qId: string) => {
        setExpandedQuestions(prev => {
            const next = new Set(prev);
            if (next.has(qId)) next.delete(qId);
            else next.add(qId);
            return next;
        });
    };

    /* ── Loading State ── */
    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-surface-ground">
                <div className="text-center">
                    <div className="w-12 h-12 rounded-full border-4 border-brand-primary/20 border-t-brand-primary animate-spin mx-auto mb-4" />
                    <p className="text-brand-gray font-medium">Analiz verileri yükleniyor...</p>
                </div>
            </div>
        );
    }

    /* ── Error State ── */
    if (error || !results) {
        return (
            <div className="flex-1 flex items-center justify-center bg-surface-ground">
                <div className="text-center max-w-md mx-auto p-8">
                    <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                        <BarChart3 className="h-8 w-8 text-red-400" />
                    </div>
                    <h2 className="text-lg font-semibold text-brand-dark mb-2">Sonuçlar Yüklenemedi</h2>
                    <p className="text-sm text-brand-gray mb-6">{error || 'Sonuçlar bulunamadı.'}</p>
                    <Link to="/admin/surveys/campaigns"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-primary/90 transition-colors">
                        <ChevronLeft className="h-4 w-4" /> Kampanyalara Dön
                    </Link>
                </div>
            </div>
        );
    }

    const isChoiceType = (type: number) => [3, 4, 5, 6, 7].includes(type);
    const isTextType = (type: number) => [1, 2, 8, 9, 10, 11].includes(type);

    return (
        <div className="flex-1 bg-surface-ground overflow-y-auto">
            {/* ── Sticky Header ── */}
            <div className="bg-white border-b border-surface-muted sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/admin/surveys/campaigns"
                            className="w-9 h-9 rounded-lg bg-surface-ground flex items-center justify-center text-brand-gray hover:text-brand-dark hover:bg-surface-muted transition-all">
                            <ChevronLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-lg font-bold text-brand-dark">{results.title}</h1>
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-md">Analiz Raporu</span>
                            </div>
                            <p className="text-xs text-brand-gray mt-0.5">Gerçek zamanlı anket sonuçları ve istatistikler</p>
                        </div>
                    </div>
                    {canExport && (
                        <button onClick={handleExport}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-dark text-white rounded-lg text-sm font-medium hover:bg-brand-dark/90 transition-colors shadow-sm">
                            <Download className="h-4 w-4" />
                            <span className="hidden sm:inline">Raporu İndir</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 space-y-8">
                {/* ── Summary Cards ── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div className="bg-white rounded-xl border border-surface-muted p-5 flex items-center gap-4 shadow-sm">
                        <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <Users className="h-7 w-7 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-brand-gray uppercase tracking-wide">Hedef Kitle</p>
                            <p className="text-3xl font-bold text-brand-dark leading-tight">{results.totalParticipants}</p>
                            <p className="text-xs text-brand-gray">davet edilen kişi</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-surface-muted p-5 flex items-center gap-4 shadow-sm">
                        <div className="w-14 h-14 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                            <FileText className="h-7 w-7 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-brand-gray uppercase tracking-wide">Tamamlayan</p>
                            <p className="text-3xl font-bold text-brand-dark leading-tight">{results.totalResponses}</p>
                            <p className="text-xs text-brand-gray">yanıt alındı</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-surface-muted p-5 flex items-center gap-4 shadow-sm">
                        <div className="relative flex-shrink-0">
                            <ProgressRing value={results.responseRate} size={56} strokeWidth={5}
                                color={results.responseRate >= 70 ? '#10b981' : results.responseRate >= 40 ? '#f59e0b' : '#ef4444'} />
                            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-brand-dark">
                                %{results.responseRate % 1 === 0 ? results.responseRate.toFixed(0) : results.responseRate.toFixed(1)}
                            </span>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-brand-gray uppercase tracking-wide">Katılım Oranı</p>
                            <p className="text-xl font-bold text-brand-dark leading-tight">
                                {results.responseRate >= 70 ? 'Yüksek' : results.responseRate >= 40 ? 'Orta' : 'Düşük'}
                            </p>
                            <p className="text-xs text-brand-gray">{results.totalResponses} / {results.totalParticipants} kişi</p>
                        </div>
                    </div>
                </div>

                {/* ── Question Cards ── */}
                <div className="space-y-6">
                    {results.questions.map((q, idx) => {
                        const qType = QUESTION_TYPE_MAP[q.type] || { label: 'Diğer', icon: <MessageSquare className="h-3.5 w-3.5" />, color: 'bg-gray-100 text-gray-600' };
                        const maxPct = q.optionStats.length > 0 ? Math.max(...q.optionStats.map(o => o.percentage)) : 0;
                        const isExpanded = expandedQuestions.has(q.questionId);
                        const TEXT_PREVIEW_LIMIT = 5;
                        const hasMoreText = q.textAnswers && q.textAnswers.length > TEXT_PREVIEW_LIMIT;
                        const visibleAnswers = isExpanded ? q.textAnswers : (q.textAnswers?.slice(0, TEXT_PREVIEW_LIMIT) || []);

                        return (
                            <div key={q.questionId} className="bg-white rounded-xl border border-surface-muted overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                {/* Question Header */}
                                <div className="px-6 py-4 border-b border-surface-muted bg-gradient-to-r from-surface-base to-white">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-3 min-w-0">
                                            <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center text-sm font-bold text-brand-primary mt-0.5">
                                                {idx + 1}
                                            </span>
                                            <div className="min-w-0">
                                                <h3 className="text-base font-semibold text-brand-dark leading-snug">{q.title}</h3>
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${qType.color}`}>
                                                        {qType.icon}
                                                        {qType.label}
                                                    </span>
                                                    <span className="text-xs text-brand-gray">
                                                        {q.totalAnswers} yanıt
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        {q.totalAnswers > 0 && results.totalResponses > 0 && (
                                            <div className="flex-shrink-0 text-right">
                                                <p className="text-xs text-brand-gray">Yanıtlama</p>
                                                <p className="text-sm font-bold text-brand-dark">
                                                    %{Math.round((q.totalAnswers / results.totalResponses) * 100)}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Question Body */}
                                <div className="p-6">
                                    {q.totalAnswers === 0 ? (
                                        <div className="flex items-center justify-center py-8">
                                            <div className="text-center">
                                                <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-2">
                                                    <BarChart3 className="h-5 w-5 text-gray-300" />
                                                </div>
                                                <p className="text-sm text-brand-gray">Henüz yanıt verilmemiş</p>
                                            </div>
                                        </div>
                                    ) : isChoiceType(q.type) && q.optionStats.length > 0 ? (
                                        <>
                                            {(q.type === 6 || q.type === 7) && (
                                                <RatingNpsSummary optionStats={q.optionStats} type={q.type} />
                                            )}

                                            <div className="flex flex-col lg:flex-row gap-8">
                                                {/* Donut Chart */}
                                                <div className="w-full lg:w-2/5 flex items-center justify-center">
                                                    <div className="w-[280px] h-[280px]">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <PieChart>
                                                                <Pie data={q.optionStats.filter(o => o.count > 0)}
                                                                    dataKey="count" nameKey="label"
                                                                    cx="50%" cy="50%" innerRadius={65} outerRadius={100}
                                                                    paddingAngle={q.optionStats.filter(o => o.count > 0).length > 1 ? 3 : 0}
                                                                    label={renderCustomLabel}
                                                                    labelLine={false}
                                                                    strokeWidth={0}>
                                                                    {q.optionStats.filter(o => o.count > 0).map((_, index) => (
                                                                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                                                    ))}
                                                                </Pie>
                                                                <Tooltip content={({ active, payload }) => {
                                                                    if (!active || !payload?.[0]) return null;
                                                                    const d = payload[0].payload;
                                                                    return (
                                                                        <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-surface-muted text-xs">
                                                                            <p className="font-semibold text-brand-dark">{d.label}</p>
                                                                            <p className="text-brand-gray">{d.count} kişi · %{d.percentage % 1 === 0 ? d.percentage.toFixed(0) : d.percentage.toFixed(1)}</p>
                                                                        </div>
                                                                    );
                                                                }} />
                                                            </PieChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                </div>

                                                {/* Horizontal Bars */}
                                                <div className="w-full lg:w-3/5 space-y-4">
                                                    {q.optionStats.map((opt, i) => (
                                                        <HorizontalBar key={opt.optionId} label={opt.label} count={opt.count}
                                                            percentage={opt.percentage} color={CHART_COLORS[i % CHART_COLORS.length]}
                                                            maxPercentage={maxPct} />
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    ) : isTextType(q.type) ? (
                                        <div className="space-y-2.5">
                                            {visibleAnswers.length > 0 ? (
                                                <>
                                                    {visibleAnswers.map((ans, i) => (
                                                        <TextAnswerCard key={i} answer={ans} index={i} questionType={q.type} />
                                                    ))}
                                                    {hasMoreText && (
                                                        <button onClick={() => toggleExpand(q.questionId)}
                                                            className="w-full py-2.5 text-sm font-medium text-brand-primary hover:text-brand-primary/80 bg-brand-primary/5 hover:bg-brand-primary/10 rounded-lg transition-colors">
                                                            {isExpanded
                                                                ? 'Daralt'
                                                                : `Tüm yanıtları göster (${q.textAnswers.length})`
                                                            }
                                                        </button>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="flex items-center justify-center py-8">
                                                    <p className="text-sm text-brand-gray italic">Henüz metin yanıtı yok.</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : q.type === 12 ? (
                                        <div className="flex items-center gap-2 text-sm text-brand-gray py-4">
                                            <Info className="h-4 w-4" />
                                            <span>Bu bir bilgilendirme sorusudur, yanıt beklenmez.</span>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-brand-gray italic py-4">Bu soru tipi için analiz henüz desteklenmiyor.</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ── Footer ── */}
                <div className="text-center py-4">
                    <p className="text-xs text-brand-gray">
                        Toplam {results.questions.length} soru · {results.totalResponses} yanıt analiz edildi
                    </p>
                </div>
            </div>
        </div>
    );
};
