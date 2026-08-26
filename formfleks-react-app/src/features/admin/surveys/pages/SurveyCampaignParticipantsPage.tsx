import { useDeferredValue, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Eye, Mail,
    MapPin, RefreshCw, Search, UsersRound, X, XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
    campaignService, type CampaignParticipantDto, type IdentifiedParticipantResponse,
    type PaginatedCampaignParticipants
} from '../services/campaign.service';

const EMPTY_PAGE: PaginatedCampaignParticipants = { items: [], totalCount: 0, page: 1, pageSize: 25, totalPages: 0 };

const formatDuration = (seconds?: number) => {
    if (seconds == null) return '-';
    if (seconds < 60) return `${Math.round(seconds)} sn`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes} dk ${Math.round(seconds % 60)} sn`;
};

const statusLabel = (status: string) => ({
    Completed: 'Tamamlandı', Started: 'Başladı', Sent: 'Gönderildi', Pending: 'Bekliyor',
    Failed: 'Başarısız', Expired: 'Süresi doldu', Revoked: 'İptal edildi'
}[status] ?? status);

export const SurveyCampaignParticipantsPage = () => {
    const { id } = useParams<{ id: string }>();
    const [data, setData] = useState(EMPTY_PAGE);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [search, setSearch] = useState('');
    const deferredSearch = useDeferredValue(search);
    const [status, setStatus] = useState('');
    const [department, setDepartment] = useState('');
    const [location, setLocation] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [resendingId, setResendingId] = useState<string | null>(null);
    const [selected, setSelected] = useState<IdentifiedParticipantResponse | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    useEffect(() => {
        if (!id) return;
        let active = true;
        setLoading(true);
        campaignService.getCampaignParticipants(id, {
            page, pageSize, search: deferredSearch || undefined, status: status || undefined,
            department: department || undefined, location: location || undefined
        }).then(result => {
            if (active) setData(result);
        }).catch(error => {
            console.error(error);
            toast.error('Katılımcılar yüklenirken bir hata oluştu. Anonim kampanyalarda bu liste kullanılamaz.');
        }).finally(() => {
            if (active) setLoading(false);
        });
        return () => { active = false; };
    }, [id, page, pageSize, deferredSearch, status, department, location, refreshKey]);

    useEffect(() => setPage(1), [deferredSearch, status, department, location, pageSize]);

    const handleResend = async (assignmentId: string) => {
        setResendingId(assignmentId);
        try {
            await campaignService.resendEmail(assignmentId);
            toast.success('Yeniden gönderim kuyruğa alındı.');
            setRefreshKey(value => value + 1);
        } catch (error) {
            console.error(error);
            toast.error('Yeniden gönderim başarısız oldu.');
        } finally {
            setResendingId(null);
        }
    };

    const openResponse = async (participant: CampaignParticipantDto) => {
        if (!id || !participant.responseId) return;
        setDetailLoading(true);
        try {
            setSelected(await campaignService.getParticipantResponse(id, participant.id));
        } catch (error) {
            console.error(error);
            toast.error('Yanıt detayı alınamadı veya kimlikli yanıt yetkiniz bulunmuyor.');
        } finally {
            setDetailLoading(false);
        }
    };

    return (
        <div className="min-h-full bg-surface-ground">
            <header className="border-b border-surface-muted bg-white">
                <div className="mx-auto flex max-w-[1500px] items-center gap-4 px-5 py-5 lg:px-8">
                    <Link to="/admin/surveys/campaigns" className="grid h-10 w-10 place-items-center rounded-xl bg-surface-ground text-brand-gray hover:text-brand-dark">
                        <ChevronLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <UsersRound className="h-5 w-5 text-brand-primary" />
                            <h1 className="text-xl font-bold text-brand-dark">Katılımcı ve Yanıt Gezgini</h1>
                        </div>
                        <p className="mt-1 text-sm text-brand-gray">Kimlikli anketlerde teslimat durumunu izleyin ve yetkiniz dâhilinde tekil yanıta inin.</p>
                    </div>
                    <button onClick={() => setRefreshKey(value => value + 1)} className="ml-auto grid h-10 w-10 place-items-center rounded-xl border border-surface-muted bg-white text-brand-gray hover:text-brand-dark" aria-label="Listeyi yenile">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </header>

            <main className="mx-auto max-w-[1500px] space-y-5 px-5 py-6 lg:px-8">
                <section className="grid gap-3 rounded-2xl border border-surface-muted bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-5">
                    <label className="relative xl:col-span-2">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-brand-gray" />
                        <input value={search} onChange={event => setSearch(event.target.value)} placeholder="İsim veya e-posta ara..." className="h-10 w-full rounded-xl border border-surface-muted pl-10 pr-3 text-sm outline-none focus:border-brand-primary" />
                    </label>
                    <select value={status} onChange={event => setStatus(event.target.value)} className="h-10 rounded-xl border border-surface-muted px-3 text-sm text-brand-dark outline-none focus:border-brand-primary">
                        <option value="">Tüm durumlar</option><option value="Completed">Tamamlandı</option><option value="Started">Başladı</option><option value="Sent">Gönderildi</option><option value="Pending">Bekliyor</option><option value="Failed">Başarısız</option><option value="Expired">Süresi doldu</option>
                    </select>
                    <input value={department} onChange={event => setDepartment(event.target.value)} placeholder="Departman (tam eşleşme)" className="h-10 rounded-xl border border-surface-muted px-3 text-sm outline-none focus:border-brand-primary" />
                    <input value={location} onChange={event => setLocation(event.target.value)} placeholder="Lokasyon (tam eşleşme)" className="h-10 rounded-xl border border-surface-muted px-3 text-sm outline-none focus:border-brand-primary" />
                </section>

                <section className="overflow-hidden rounded-2xl border border-surface-muted bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-surface-muted px-5 py-4">
                        <div><p className="text-sm font-semibold text-brand-dark">{data.totalCount.toLocaleString('tr-TR')} katılımcı</p><p className="text-xs text-brand-gray">Veriler kampanya anındaki organizasyon snapshot’ından gösterilir.</p></div>
                        <select value={pageSize} onChange={event => setPageSize(Number(event.target.value))} className="rounded-lg border border-surface-muted px-2 py-1.5 text-xs"><option value={25}>25 satır</option><option value={50}>50 satır</option><option value={100}>100 satır</option></select>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1100px] text-left text-sm">
                            <thead className="bg-surface-ground text-xs uppercase tracking-wide text-brand-gray"><tr><th className="px-5 py-3">Katılımcı</th><th className="px-5 py-3">Organizasyon</th><th className="px-5 py-3">Durum</th><th className="px-5 py-3">Teslimat</th><th className="px-5 py-3">Süre</th><th className="px-5 py-3 text-right">İşlem</th></tr></thead>
                            <tbody className="divide-y divide-surface-muted">
                                {loading && data.items.length === 0 && <tr><td colSpan={6} className="p-12 text-center text-brand-gray">Katılımcılar yükleniyor...</td></tr>}
                                {!loading && data.items.length === 0 && <tr><td colSpan={6} className="p-12 text-center text-brand-gray">Filtrelerle eşleşen katılımcı bulunamadı.</td></tr>}
                                {data.items.map(participant => (
                                    <tr key={participant.id} className="hover:bg-orange-50/30">
                                        <td className="px-5 py-4"><p className="font-semibold text-brand-dark">{participant.fullName}</p><p className="mt-1 flex items-center gap-1 text-xs text-brand-gray"><Mail className="h-3 w-3" />{participant.email}</p></td>
                                        <td className="px-5 py-4"><p className="font-medium text-brand-dark">{participant.department || 'Departman belirtilmemiş'}</p><p className="mt-1 flex items-center gap-1 text-xs text-brand-gray"><MapPin className="h-3 w-3" />{participant.location || participant.company || '-'}</p></td>
                                        <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${participant.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : participant.status === 'Started' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>{statusLabel(participant.status)}</span></td>
                                        <td className="px-5 py-4">{participant.emailDeliveryStatus === 'Delivered' ? <span className="flex items-center gap-1.5 text-emerald-700"><CheckCircle2 className="h-4 w-4" />İletildi</span> : participant.emailDeliveryStatus === 'Failed' ? <span className="flex items-center gap-1.5 text-red-700"><XCircle className="h-4 w-4" />Başarısız</span> : <span className="flex items-center gap-1.5 text-amber-700"><AlertCircle className="h-4 w-4" />{participant.emailDeliveryStatus}</span>}</td>
                                        <td className="px-5 py-4"><p className="flex items-center gap-1.5 font-medium text-brand-dark"><Clock3 className="h-4 w-4 text-brand-gray" />{formatDuration(participant.completionSeconds)}</p><p className="mt-1 text-xs text-brand-gray">{participant.completedAt ? new Date(participant.completedAt).toLocaleString('tr-TR') : '-'}</p></td>
                                        <td className="px-5 py-4"><div className="flex justify-end gap-2">{participant.responseId && <button onClick={() => openResponse(participant)} disabled={detailLoading} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-dark px-3 py-2 text-xs font-semibold text-white"><Eye className="h-3.5 w-3.5" />Yanıtı aç</button>}<button onClick={() => handleResend(participant.id)} disabled={participant.status === 'Completed' || resendingId === participant.id} className="inline-flex items-center gap-1.5 rounded-lg border border-surface-muted px-3 py-2 text-xs font-semibold text-brand-dark disabled:opacity-40"><RefreshCw className={`h-3.5 w-3.5 ${resendingId === participant.id ? 'animate-spin' : ''}`} />Tekrar gönder</button></div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <footer className="flex items-center justify-between border-t border-surface-muted px-5 py-4"><p className="text-xs text-brand-gray">Sayfa {data.page} / {Math.max(1, data.totalPages)}</p><div className="flex gap-2"><button onClick={() => setPage(value => Math.max(1, value - 1))} disabled={page <= 1} className="grid h-9 w-9 place-items-center rounded-lg border border-surface-muted disabled:opacity-40" aria-label="Önceki sayfa"><ChevronLeft className="h-4 w-4" /></button><button onClick={() => setPage(value => Math.min(data.totalPages, value + 1))} disabled={page >= data.totalPages} className="grid h-9 w-9 place-items-center rounded-lg border border-surface-muted disabled:opacity-40" aria-label="Sonraki sayfa"><ChevronRight className="h-4 w-4" /></button></div></footer>
                </section>
            </main>

            {selected && <div className="fixed inset-0 z-50 flex justify-end bg-black/25" onMouseDown={() => setSelected(null)}><aside className="h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}><div className="sticky top-0 z-10 flex items-start justify-between border-b border-surface-muted bg-white px-6 py-5"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-primary">Kimlikli yanıt</p><h2 className="mt-1 text-xl font-bold text-brand-dark">{selected.participantName}</h2><p className="text-sm text-brand-gray">{selected.participantEmail}</p></div><button onClick={() => setSelected(null)} className="grid h-9 w-9 place-items-center rounded-lg bg-surface-ground"><X className="h-4 w-4" /></button></div><div className="space-y-5 p-6"><div className="grid gap-3 rounded-2xl bg-surface-ground p-4 sm:grid-cols-2"><p className="text-sm"><span className="block text-xs text-brand-gray">Organizasyon</span><strong>{selected.department || '-'} · {selected.location || '-'}</strong></p><p className="text-sm"><span className="block text-xs text-brand-gray">Tamamlama süresi</span><strong>{formatDuration(selected.completionSeconds)}</strong></p><p className="text-sm"><span className="block text-xs text-brand-gray">Başlangıç</span><strong>{new Date(selected.startedAt).toLocaleString('tr-TR')}</strong></p><p className="text-sm"><span className="block text-xs text-brand-gray">Snapshot kaynağı</span><strong>{selected.snapshotSource}</strong></p></div>{selected.answers.map((answer, index) => <article key={answer.questionId} className="rounded-2xl border border-surface-muted p-4"><div className="flex gap-3"><span className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-orange-50 text-xs font-bold text-brand-primary">{index + 1}</span><div><h3 className="font-semibold text-brand-dark">{answer.questionTitle}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-brand-gray">{answer.textValue ?? answer.numericValue ?? answer.dateValue ?? answer.files?.join(', ') ?? answer.jsonValue ?? 'Yanıt verilmedi'}</p></div></div></article>)}</div></aside></div>}
        </div>
    );
};
