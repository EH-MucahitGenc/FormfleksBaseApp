import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileClock,
  Mail,
  RefreshCw,
  Search,
  Send,
  UserCheck,
  Users,
  X,
  XCircle
} from 'lucide-react';
import { cn } from '@/components/ui';
import { reportService, type FormTrackingFilters, type FormTrackingListItemDto } from '@/services/report.service';

const INITIAL_FILTERS: FormTrackingFilters = { page: 1, pageSize: 25 };

const formatDate = (value?: string) => value
  ? new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
  : '-';

const statusTone: Record<string, string> = {
  Taslak: 'border-slate-200 bg-slate-50 text-slate-700',
  Gönderildi: 'border-sky-200 bg-sky-50 text-sky-700',
  Onayda: 'border-amber-200 bg-amber-50 text-amber-700',
  Onaylandı: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Reddedildi: 'border-red-200 bg-red-50 text-red-700',
  'İptal edildi': 'border-zinc-200 bg-zinc-50 text-zinc-700',
  Revizyonda: 'border-orange-200 bg-orange-50 text-orange-700'
};

const eventIcon = (category: string, eventType: string) => {
  if (category === 'email') return Mail;
  if (eventType.includes('Approved')) return CheckCircle2;
  if (eventType.includes('Rejected') || eventType.includes('Cancel')) return XCircle;
  if (category === 'assignment') return Users;
  if (eventType.includes('Submitted')) return Send;
  if (eventType.includes('Claimed') || eventType.includes('Reassigned')) return UserCheck;
  return Activity;
};

export const FormTrackingCenter = () => {
  const [draftFilters, setDraftFilters] = useState<FormTrackingFilters>(INITIAL_FILTERS);
  const [filters, setFilters] = useState<FormTrackingFilters>(INITIAL_FILTERS);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['form-tracking', filters],
    queryFn: () => reportService.getFormTracking(filters)
  });

  const detailQuery = useQuery({
    queryKey: ['form-tracking-detail', selectedRequestId],
    queryFn: () => reportService.getFormTrackingDetail(selectedRequestId!),
    enabled: Boolean(selectedRequestId)
  });

  const emailQuery = useQuery({
    queryKey: ['form-tracking-email', selectedRequestId, selectedEmailId],
    queryFn: () => reportService.getFormTrackingEmailDetail(selectedRequestId!, selectedEmailId!),
    enabled: Boolean(selectedRequestId && selectedEmailId)
  });

  const totalPages = Math.max(1, Math.ceil((listQuery.data?.totalCount ?? 0) / (filters.pageSize || 25)));
  const activeFilterCount = useMemo(() => [
    filters.search,
    filters.systemUsageType,
    filters.status,
    filters.ownerSearch,
    filters.startDate,
    filters.endDate,
    filters.minWaitingDays
  ].filter(Boolean).length, [filters]);

  const applyFilters = () => setFilters({ ...draftFilters, page: 1 });
  const clearFilters = () => {
    setDraftFilters(INITIAL_FILTERS);
    setFilters(INITIAL_FILTERS);
  };
  const setPage = (page: number) => setFilters(current => ({ ...current, page }));

  return (
    <div className="space-y-4">
      <section className="border-b border-surface-muted bg-white px-1 pb-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-base font-extrabold text-brand-dark">
              <FileClock className="h-5 w-5 text-brand-primary" /> Form İzleme Merkezi
            </h3>
            <p className="mt-1 text-xs text-brand-gray">Formların kimde ve ne kadar süredir beklediğini, onay ve e-posta hareketleriyle birlikte izleyin.</p>
          </div>
          <button
            type="button"
            onClick={() => listQuery.refetch()}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-muted bg-white text-brand-gray hover:border-brand-primary/40 hover:text-brand-primary"
            title="Yenile"
          >
            <RefreshCw className={cn('h-4 w-4', listQuery.isFetching && 'animate-spin')} />
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="relative xl:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-gray" />
            <input
              value={draftFilters.search ?? ''}
              onChange={event => setDraftFilters(current => ({ ...current, search: event.target.value }))}
              onKeyDown={event => event.key === 'Enter' && applyFilters()}
              placeholder="Personel adı veya talep numarası"
              className="h-10 w-full rounded-lg border border-surface-muted bg-white pl-10 pr-3 text-sm outline-none focus:border-brand-primary/50"
            />
          </label>
          <select
            value={draftFilters.systemUsageType ?? ''}
            onChange={event => setDraftFilters(current => ({ ...current, systemUsageType: event.target.value }))}
            className="h-10 rounded-lg border border-surface-muted bg-white px-3 text-sm outline-none focus:border-brand-primary/50"
          >
            <option value="">Tüm form türleri</option>
            <option value="2_AY_DENEME">2 aylık deneme</option>
            <option value="6_AY_DENEME">6 aylık deneme</option>
          </select>
          <select
            value={draftFilters.status ?? ''}
            onChange={event => setDraftFilters(current => ({ ...current, status: event.target.value }))}
            className="h-10 rounded-lg border border-surface-muted bg-white px-3 text-sm outline-none focus:border-brand-primary/50"
          >
            <option value="">Tüm durumlar</option>
            <option value="1">Taslak</option>
            <option value="3">Onayda</option>
            <option value="4">Onaylandı</option>
            <option value="5">Reddedildi</option>
            <option value="7">Revizyonda</option>
          </select>
          <input
            value={draftFilters.ownerSearch ?? ''}
            onChange={event => setDraftFilters(current => ({ ...current, ownerSearch: event.target.value }))}
            placeholder="Sahip/onaycı ara"
            className="h-10 rounded-lg border border-surface-muted bg-white px-3 text-sm outline-none focus:border-brand-primary/50"
          />
          <input
            type="number"
            min="1"
            value={draftFilters.minWaitingDays ?? ''}
            onChange={event => setDraftFilters(current => ({ ...current, minWaitingDays: event.target.value }))}
            placeholder="En az bekleme günü"
            className="h-10 rounded-lg border border-surface-muted bg-white px-3 text-sm outline-none focus:border-brand-primary/50"
          />
          <input
            type="date"
            value={draftFilters.startDate ?? ''}
            onChange={event => setDraftFilters(current => ({ ...current, startDate: event.target.value }))}
            className="h-10 rounded-lg border border-surface-muted bg-white px-3 text-sm outline-none focus:border-brand-primary/50"
          />
          <input
            type="date"
            value={draftFilters.endDate ?? ''}
            onChange={event => setDraftFilters(current => ({ ...current, endDate: event.target.value }))}
            className="h-10 rounded-lg border border-surface-muted bg-white px-3 text-sm outline-none focus:border-brand-primary/50"
          />
        </div>
        <div className="mt-3 flex justify-end gap-2">
          {activeFilterCount > 0 && (
            <button type="button" onClick={clearFilters} className="h-9 px-3 text-xs font-semibold text-brand-gray hover:text-brand-dark">Temizle</button>
          )}
          <button type="button" onClick={applyFilters} className="h-9 rounded-lg bg-brand-dark px-4 text-xs font-bold text-white hover:bg-brand-primary">Filtrele</button>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-surface-muted bg-white">
        <div className="flex items-center justify-between border-b border-surface-muted px-4 py-3">
          <span className="text-xs font-bold text-brand-dark">{listQuery.data?.totalCount ?? 0} form</span>
          <span className="text-xs text-brand-gray">Sayfa {filters.page} / {totalPages}</span>
        </div>

        {listQuery.isLoading ? (
          <div className="flex min-h-72 items-center justify-center text-sm text-brand-gray">Form hareketleri yükleniyor...</div>
        ) : listQuery.isError ? (
          <div className="flex min-h-72 items-center justify-center text-sm text-red-600">Form hareketleri alınamadı.</div>
        ) : !listQuery.data?.items.length ? (
          <div className="flex min-h-72 flex-col items-center justify-center text-center">
            <FileClock className="mb-3 h-9 w-9 text-brand-gray/30" />
            <p className="text-sm font-semibold text-brand-dark">Kayıt bulunamadı</p>
            <p className="mt-1 text-xs text-brand-gray">Filtreleri değiştirerek tekrar deneyin.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] border-collapse text-left">
              <thead className="bg-surface-ground/70 text-[11px] font-bold uppercase text-brand-gray">
                <tr>
                  <th className="px-4 py-3">Talep</th>
                  <th className="px-4 py-3">Değerlendirilen kişi</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">Güncel sahip / onaycı</th>
                  <th className="px-4 py-3">Bekleme</th>
                  <th className="px-4 py-3">Son hareket</th>
                  <th className="w-12 px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-muted">
                {listQuery.data.items.map(item => (
                  <TrackingRow key={item.requestId} item={item} onOpen={() => setSelectedRequestId(item.requestId)} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-surface-muted px-4 py-3">
          <button
            type="button"
            onClick={() => setPage(Math.max(1, filters.page - 1))}
            disabled={filters.page <= 1}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-surface-muted text-brand-gray disabled:opacity-35"
            title="Önceki sayfa"
          ><ChevronLeft className="h-4 w-4" /></button>
          <button
            type="button"
            onClick={() => setPage(Math.min(totalPages, filters.page + 1))}
            disabled={filters.page >= totalPages}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-surface-muted text-brand-gray disabled:opacity-35"
            title="Sonraki sayfa"
          ><ChevronRight className="h-4 w-4" /></button>
        </div>
      </section>

      {selectedRequestId && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/35" role="dialog" aria-modal="true">
          <button className="absolute inset-0 cursor-default" onClick={() => { setSelectedRequestId(null); setSelectedEmailId(null); }} aria-label="Kapat" />
          <aside className="relative z-10 flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-surface-muted px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase text-brand-primary">Form hareketleri</p>
                <h3 className="mt-1 text-lg font-extrabold text-brand-dark">{detailQuery.data?.summary.requestNo ?? 'Yükleniyor...'}</h3>
                <p className="mt-1 text-sm text-brand-gray">{detailQuery.data?.summary.subjectPersonName}</p>
              </div>
              <button
                type="button"
                onClick={() => { setSelectedRequestId(null); setSelectedEmailId(null); }}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-muted text-brand-gray hover:text-brand-dark"
                title="Kapat"
              ><X className="h-4 w-4" /></button>
            </div>

            {detailQuery.isLoading ? (
              <div className="flex flex-1 items-center justify-center text-sm text-brand-gray">Zaman çizelgesi yükleniyor...</div>
            ) : detailQuery.data ? (
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-2 gap-px border-b border-surface-muted bg-surface-muted md:grid-cols-4">
                  {[
                    ['Durum', detailQuery.data.summary.status],
                    ['Mevcut sahip', detailQuery.data.summary.ownerName],
                    ['Bekleme', `${detailQuery.data.summary.waitingDays} gün`],
                    ['Son hareket', formatDate(detailQuery.data.summary.lastActivityAt)]
                  ].map(([label, value]) => (
                    <div key={label} className="bg-white px-4 py-3">
                      <p className="text-[10px] font-bold uppercase text-brand-gray">{label}</p>
                      <p className="mt-1 truncate text-xs font-bold text-brand-dark" title={value}>{value}</p>
                    </div>
                  ))}
                </div>

                <div className="px-6 py-5">
                  {detailQuery.data.events.map((event, index) => {
                    const Icon = eventIcon(event.category, event.eventType);
                    return (
                      <div key={event.id} className="relative flex gap-4 pb-6">
                        {index < detailQuery.data!.events.length - 1 && <span className="absolute left-[17px] top-9 h-[calc(100%-20px)] w-px bg-surface-muted" />}
                        <div className={cn(
                          'relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-white',
                          event.category === 'email' ? 'border-sky-200 text-sky-600' :
                          event.eventType.includes('Approved') ? 'border-emerald-200 text-emerald-600' :
                          event.eventType.includes('Rejected') ? 'border-red-200 text-red-600' :
                          'border-orange-200 text-brand-primary'
                        )}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <h4 className="text-sm font-bold text-brand-dark">{event.title}</h4>
                              <p className="mt-0.5 text-xs text-brand-gray">{formatDate(event.occurredAt)}{event.actorName ? ` · ${event.actorName}` : ''}</p>
                            </div>
                            {event.deliveryStatus && (
                              <span className={cn('rounded-full border px-2 py-1 text-[10px] font-bold', event.deliveryStatus === 'Gönderildi' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700')}>
                                {event.deliveryStatus}
                              </span>
                            )}
                          </div>
                          {event.description && <p className="mt-2 text-xs leading-5 text-brand-gray">{event.description}</p>}
                          {event.recipients.length > 0 && <p className="mt-1 text-xs text-brand-gray"><strong>Alıcı:</strong> {event.recipients.join(', ')}</p>}
                          {event.emailLogId && (
                            <button type="button" onClick={() => setSelectedEmailId(event.emailLogId!)} className="mt-2 text-xs font-bold text-brand-primary hover:underline">
                              E-posta ayrıntısını aç
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-red-600">Form hareketleri alınamadı.</div>
            )}
          </aside>
        </div>
      )}

      {selectedEmailId && selectedRequestId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <button className="absolute inset-0 cursor-default" onClick={() => setSelectedEmailId(null)} aria-label="Kapat" />
          <section className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-surface-muted px-5 py-4">
              <div className="min-w-0 pr-4">
                <p className="text-xs font-bold uppercase text-brand-primary">E-posta ayrıntısı</p>
                <h3 className="mt-1 truncate text-sm font-extrabold text-brand-dark">{emailQuery.data?.email.subject ?? 'Yükleniyor...'}</h3>
              </div>
              <button type="button" onClick={() => setSelectedEmailId(null)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-surface-muted text-brand-gray" title="Kapat"><X className="h-4 w-4" /></button>
            </div>
            {emailQuery.isLoading ? (
              <div className="flex min-h-80 items-center justify-center text-sm text-brand-gray">E-posta yükleniyor...</div>
            ) : emailQuery.data ? (
              <div className="overflow-y-auto p-5">
                <dl className="grid gap-3 border-b border-surface-muted pb-4 text-xs md:grid-cols-2">
                  <div><dt className="font-bold text-brand-gray">Alıcılar</dt><dd className="mt-1 text-brand-dark">{emailQuery.data.email.toAddresses.join(', ')}</dd></div>
                  <div><dt className="font-bold text-brand-gray">Durum</dt><dd className="mt-1 text-brand-dark">{emailQuery.data.email.status} · {emailQuery.data.email.attemptCount} deneme</dd></div>
                  <div><dt className="font-bold text-brand-gray">Kuyruk zamanı</dt><dd className="mt-1 text-brand-dark">{formatDate(emailQuery.data.email.queuedAt)}</dd></div>
                  <div><dt className="font-bold text-brand-gray">Gönderim zamanı</dt><dd className="mt-1 text-brand-dark">{formatDate(emailQuery.data.email.sentAt)}</dd></div>
                </dl>
                {emailQuery.data.email.lastError && <div className="my-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{emailQuery.data.email.lastError}</div>}
                <iframe
                  title="E-posta gövdesi"
                  sandbox=""
                  srcDoc={emailQuery.data.email.bodyHtml}
                  className="mt-4 min-h-[460px] w-full rounded-lg border border-surface-muted bg-white"
                />
                <details className="mt-4 border-t border-surface-muted pt-3">
                  <summary className="cursor-pointer text-xs font-bold text-brand-dark">Header ve ek manifesti</summary>
                  <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-zinc-950 p-4 text-[11px] text-zinc-100">{emailQuery.data.email.headersJson}{'\n\n'}{emailQuery.data.email.attachmentManifestJson}</pre>
                </details>
              </div>
            ) : <div className="flex min-h-80 items-center justify-center text-sm text-red-600">E-posta ayrıntısı alınamadı.</div>}
          </section>
        </div>
      )}
    </div>
  );
};

const TrackingRow = ({ item, onOpen }: { item: FormTrackingListItemDto; onOpen: () => void }) => {
  const assignees = item.status === 'Taslak'
    ? (item.isPooledDraft ? item.draftCandidates : [item.ownerName])
    : (item.currentAssignees.length ? item.currentAssignees : [item.ownerName]);

  return (
    <tr onClick={onOpen} className="cursor-pointer text-xs transition-colors hover:bg-orange-50/40">
      <td className="px-4 py-3.5">
        <p className="font-bold text-brand-dark">{item.requestNo}</p>
        <p className="mt-1 max-w-[230px] truncate text-[11px] text-brand-gray" title={item.formTypeName}>{item.formTypeName}</p>
      </td>
      <td className="px-4 py-3.5">
        <p className="font-bold text-brand-dark">{item.subjectPersonName}</p>
        <p className="mt-1 text-[11px] text-brand-gray">{item.department || '-'}</p>
      </td>
      <td className="px-4 py-3.5">
        <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold', statusTone[item.status] ?? 'border-zinc-200 bg-zinc-50 text-zinc-700')}>{item.status}</span>
        {item.currentStepName && <p className="mt-1.5 max-w-[180px] truncate text-[11px] text-brand-gray" title={item.currentStepName}>{item.currentStepName}</p>}
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2">
          {item.isPooledDraft ? <Users className="h-4 w-4 shrink-0 text-sky-600" /> : <UserCheck className="h-4 w-4 shrink-0 text-brand-primary" />}
          <span className="max-w-[260px] truncate font-semibold text-brand-dark" title={assignees.join(', ')}>{assignees.join(', ')}</span>
        </div>
        {item.isPooledDraft && <p className="mt-1 pl-6 text-[10px] font-bold text-sky-700">Havuzda, henüz üstlenilmedi</p>}
      </td>
      <td className="px-4 py-3.5">
        <span className={cn('inline-flex items-center gap-1 font-bold', item.waitingDays >= 7 ? 'text-red-600' : item.waitingDays >= 3 ? 'text-amber-600' : 'text-brand-dark')}>
          <Clock3 className="h-3.5 w-3.5" /> {item.waitingDays} gün
        </span>
        <p className="mt-1 text-[10px] text-brand-gray">{formatDate(item.waitingSince)}</p>
      </td>
      <td className="px-4 py-3.5 text-brand-gray">{formatDate(item.lastActivityAt)}</td>
      <td className="px-3 py-3.5"><ArrowRight className="h-4 w-4 text-brand-gray" /></td>
    </tr>
  );
};
