import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { ShieldCheck, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { campaignService } from '../services/campaign.service';

function localDateInput(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function SurveyAccessDialog({ campaignId, onClose }: { campaignId: string; onClose: () => void }) {
  const cache = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [target, setTarget] = useState<{ userId: string; displayName: string } | null>(null);
  const [level, setLevel] = useState(1);
  const [reason, setReason] = useState('');
  const [until, setUntil] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const access = useQuery({ queryKey: ['surveyAccess', campaignId], queryFn: () => campaignService.getAccess(campaignId) });
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const candidates = useQuery({
    queryKey: ['surveyAccessCandidates', campaignId, debouncedSearch],
    queryFn: () => campaignService.getAccessCandidates(campaignId, debouncedSearch),
    enabled: debouncedSearch.length >= 2
  });
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [onClose, busy]);
  const save = async (userId: string, revoke: boolean, accessLevel = level) => {
    if (!reason.trim()) { setError('Değişiklik gerekçesini yazın.'); return; }
    if (revoke && !window.confirm('Bu kişinin sonuç izleme yetkisi kaldırılsın mı?')) return;
    setBusy(true); setError(null);
    try {
      await campaignService.setAccess(campaignId, userId, {
        accessLevel, revoke, reason: reason.trim(), validUntil: !revoke && until ? new Date(until).toISOString() : undefined
      });
      await cache.invalidateQueries({ queryKey: ['surveyAccess', campaignId] });
      await cache.invalidateQueries({ queryKey: ['surveyNavigation'] });
      setTarget(null); setSearch(''); setReason(''); setUntil('');
      toast.success(revoke ? 'Sonuç izleme yetkisi kaldırıldı.' : 'Sonuç izleme yetkisi kaydedildi.');
    } catch (err) {
      const problem = isAxiosError<{ detail?: string }>(err) ? err.response?.data : undefined;
      setError(problem?.detail || 'Yetki değişikliği kaydedilemedi.');
    } finally { setBusy(false); }
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <section role="dialog" aria-modal="true" aria-labelledby="survey-access-title" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-surface-muted bg-white shadow-2xl">
      <header className="flex items-start justify-between border-b border-surface-muted bg-orange-50/60 p-5">
        <div><h2 id="survey-access-title" className="flex items-center gap-2 text-lg font-bold"><ShieldCheck className="h-5 w-5 text-brand-primary" />Sonuç izleme yetkileri</h2><p className="mt-1 text-sm text-brand-gray">{access.data?.title}</p></div>
        <button type="button" disabled={busy} onClick={onClose} aria-label="Kapat"><X className="h-5 w-5" /></button>
      </header>
      <div className="space-y-5 p-5">
        <p className="rounded-xl bg-surface-ground p-3 text-sm text-brand-gray">Oluşturan kişi varsayılan olarak özet sonuçları görür. Detaylı izleyici açık uçlu yanıtları ve yalnızca kimlikli anketlerde kişi bazlı yanıtları görebilir. Dışa aktarım ve dosya indirme izinleri ayrıca kontrol edilir.</p>
        {access.data?.isAnonymous && <p className="text-sm font-medium text-brand-primary">Anonim anket: detaylı izleyici atamak kimlikli yanıt erişimi sağlamaz. Gizlilik eşikleri geçerlidir.</p>}
        {access.isError ? <p role="alert" className="text-sm text-red-700">İzleyiciler yüklenemedi. <button onClick={() => access.refetch()} className="underline">Tekrar dene</button></p> : access.isPending ? <p>Yükleniyor...</p> : <>
          <div className="space-y-2">
            {!access.data.entries.length && <p className="text-sm text-brand-gray">Henüz izleyici atanmamış. Eski kampanyalara buradan izleyici ekleyebilirsiniz.</p>}
            {access.data.entries.map(entry => <article key={entry.userId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-surface-muted p-3">
              <div><p className="text-sm font-semibold">{entry.displayName}</p><p className="text-xs text-brand-gray">{entry.email}</p>
                <p className="mt-1 text-xs text-brand-gray">{entry.isImplicit ? 'Oluşturan / sahip · Özet sonuçlar' : entry.accessLevel === 2 ? 'Detaylı izleyici' : 'Özet izleyicisi'} · {!entry.isActiveUser ? 'Kullanıcı pasif' : entry.isEffective ? 'Erişim açık' : 'Erişim kapalı'}{entry.validUntil && ` · Bitiş: ${new Date(entry.validUntil).toLocaleString('tr-TR')}`}</p></div>
              <div className="flex gap-3 text-xs font-semibold">
                {entry.isActiveUser && <button disabled={busy} onClick={() => { setTarget(entry); setLevel(entry.accessLevel); setUntil(localDateInput(entry.validUntil)); }} className="text-brand-primary">{entry.isEffective ? 'Düzenle' : 'Yeniden yetkilendir'}</button>}
                {(entry.isEffective || !entry.revokedAt) && <button disabled={busy} onClick={() => save(entry.userId, true, entry.accessLevel)} className="text-red-700">Yetkiyi kaldır</button>}
              </div>
            </article>)}
          </div>
          <div className="rounded-xl border border-surface-muted p-4">
            <h3 className="mb-3 text-sm font-bold">İzleyici ekle veya güncelle</h3>
            <input autoFocus aria-label="Aktif kullanıcı ara" value={search} onChange={e => setSearch(e.target.value)} placeholder="Aktif kullanıcı adı veya e-posta ara (en az 2 karakter)" className="w-full rounded-lg border border-surface-muted p-2 text-sm" />
            {debouncedSearch.length >= 2 && <div className="mt-2 max-h-40 overflow-auto">
              {candidates.isError ? <p role="alert" className="text-sm text-red-700">Kullanıcılar yüklenemedi.</p> : candidates.isFetching ? <p className="text-sm">Aranıyor...</p> : !candidates.data?.items.length ? <p className="text-sm text-brand-gray">Aktif kullanıcı bulunamadı.</p> : candidates.data.items.map(user => <button key={user.userId} disabled={busy} onClick={() => { setTarget(user); setSearch(''); setLevel(1); setUntil(''); }} className="block w-full rounded p-2 text-left text-sm hover:bg-orange-50">{user.displayName} <span className="text-xs text-brand-gray">{user.email}</span></button>)}
            </div>}
            {target && <p className="my-3 text-sm font-semibold text-brand-primary">Seçilen: {target.displayName}</p>}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-brand-gray">Erişim seviyesi<select value={level} onChange={e => setLevel(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-surface-muted p-2 text-sm"><option value={1}>Özet sonuçlar</option><option value={2}>Detaylı izleyici</option></select></label>
              <label className="text-xs text-brand-gray">Yetki bitişi (boşsa süresiz)<input type="datetime-local" value={until} onChange={e => setUntil(e.target.value)} className="mt-1 w-full rounded-lg border border-surface-muted p-2 text-sm" /></label>
            </div>
          </div>
          <label className="block text-xs font-semibold text-brand-gray">Değişiklik gerekçesi (ekleme, düzenleme ve kaldırma için zorunlu)<textarea value={reason} maxLength={500} onChange={e => setReason(e.target.value)} placeholder="Örn. Görev değişikliği nedeniyle rapor takibi devredildi." className="mt-2 w-full rounded-lg border border-surface-muted p-3 text-sm" /></label>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button disabled={busy || !target || !reason.trim()} onClick={() => target && save(target.userId, false)} className="rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{busy ? 'Kaydediliyor...' : 'İzleme yetkisini kaydet'}</button>
        </>}
      </div>
    </section>
  </div>;
}
