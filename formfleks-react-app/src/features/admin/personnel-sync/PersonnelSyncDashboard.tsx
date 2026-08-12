import React from 'react';
import {
  Activity,
  AlertCircle,
  ArrowDownToLine,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Clock3,
  Database,
  History,
  Network,
  RefreshCw,
  ServerCog,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import type { SyncLogDto } from '@/services/integrations.service';
import { usePersonnelStats, useSyncLogs, useTriggerSync } from '../hooks/useIntegrations';

const formatFullDate = (value: string | null | undefined) => {
  if (!value) return 'Henüz yapılmadı';

  return new Date(value).toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatLogDate = (value: string) =>
  new Date(value).toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function PersonnelSyncDashboard() {
  const { data: stats, isLoading: isStatsLoading } = usePersonnelStats();
  const { data: logsPage, isLoading: isLogsLoading } = useSyncLogs(1, 10);
  const syncMutation = useTriggerSync();

  const handleSync = () => {
    syncMutation.mutate();
  };

  const departmentMax = Math.max(...(stats?.departmentDistribution.map((department) => department.count) ?? [1]));

  return (
    <div className="space-y-5 pb-8">
      <section className="relative overflow-hidden rounded-[28px] border border-[#f1dfd3] bg-[linear-gradient(118deg,#fff8f2_0%,#ffffff_58%,#eefaf6_100%)] px-5 py-5 shadow-[0_22px_60px_-38px_rgba(53,39,31,0.42)] sm:px-7 sm:py-6 xl:px-8">
        <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full border border-emerald-100/70" />
        <div className="pointer-events-none absolute -right-8 -top-12 h-48 w-48 rounded-full border border-orange-100/70" />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#ffd8c5] bg-white/80 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#e76228] shadow-sm">
              <ServerCog className="h-3.5 w-3.5" />
              Personel veri köprüsü
            </div>
            <h1 className="text-[30px] font-black leading-tight tracking-[-0.045em] text-[#211a17] sm:text-[36px]">
              IFS Personel Senkronizasyonu
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[#746861]">
              Oracle/IFS organizasyon yapısını Formfleks kullanıcıları ve onay hiyerarşisiyle güvenli biçimde eşitleyin.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50/80 px-3 py-2 text-[11px] font-black text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_5px_rgba(16,185,129,0.10)]" />
                Veri kaynağı erişilebilir
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#ebe5e1] bg-white/75 px-3 py-2 text-[11px] font-bold text-[#756963]">
                <ShieldCheck className="h-3.5 w-3.5 text-[#f36c2f]" />
                Kontrollü aktarım
              </span>
            </div>
          </div>

          <div className="flex w-full max-w-[430px] flex-col gap-3 rounded-[24px] border border-white bg-white/80 p-4 shadow-[0_20px_45px_-30px_rgba(33,26,23,0.38)] backdrop-blur-xl sm:flex-row sm:items-center xl:w-auto xl:min-w-[430px]">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#fff0e8] text-[#f36c2f]">
              <Clock3 className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#9b8e86]">Son başarılı aktarım</p>
              {isStatsLoading ? (
                <div className="mt-2 h-5 w-36 animate-pulse rounded-md bg-[#ece8e5]" />
              ) : (
                <p className="mt-1 truncate text-sm font-black text-[#2d2521]">{formatFullDate(stats?.lastSyncDate)}</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleSync}
              disabled={syncMutation.isPending}
              className="group inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#ff7138] px-5 text-sm font-black text-white shadow-[0_14px_28px_rgba(255,113,56,0.25)] transition-all hover:-translate-y-0.5 hover:bg-[#f5652f] hover:shadow-[0_18px_34px_rgba(255,113,56,0.30)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : 'transition-transform group-hover:rotate-45'}`} />
              {syncMutation.isPending ? 'Eşitleniyor...' : 'Şimdi Eşitle'}
            </button>
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard
            title="Aktif Personel"
            value={stats?.totalActivePersonnel.toLocaleString('tr-TR')}
            caption="Onay hiyerarşisinde"
            icon={<Users className="h-5 w-5" />}
            tone="orange"
            loading={isStatsLoading}
          />
          <StatCard
            title="Departman"
            value={stats?.totalDepartments.toLocaleString('tr-TR')}
            caption="Organizasyon birimi"
            icon={<Building2 className="h-5 w-5" />}
            tone="emerald"
            loading={isStatsLoading}
          />
          <StatCard
            title="Farklı Pozisyon"
            value={stats?.totalPositions.toLocaleString('tr-TR')}
            caption="Rol ve görev tanımı"
            icon={<BriefcaseBusiness className="h-5 w-5" />}
            tone="blue"
            loading={isStatsLoading}
          />
          <StatCard
            title="Geçmiş İşlem"
            value={logsPage?.totalCount.toLocaleString('tr-TR')}
            caption="Kayıtlı senkronizasyon"
            icon={<History className="h-5 w-5" />}
            tone="slate"
            loading={isLogsLoading}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.75fr)_minmax(340px,0.75fr)]">
        <section className="overflow-hidden rounded-[24px] border border-[#e8e3df] bg-white shadow-[0_18px_50px_-40px_rgba(33,26,23,0.42)]">
          <div className="flex flex-col gap-3 border-b border-[#eee9e5] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#fff0e8] text-[#f36c2f]">
                <Activity className="h-4.5 w-4.5" />
              </span>
              <div>
                <h2 className="text-base font-black tracking-[-0.02em] text-[#2d2521]">Senkronizasyon Geçmişi</h2>
                <p className="mt-0.5 text-[11px] font-semibold text-[#8b7e77]">Son 10 aktarımın sonuç ve değişim özeti</p>
              </div>
            </div>
            <span className="w-fit rounded-full border border-[#ece7e3] bg-[#faf9f8] px-3 py-1.5 text-[10px] font-black text-[#756963]">
              {logsPage?.totalCount?.toLocaleString('tr-TR') ?? '0'} işlem kaydı
            </span>
          </div>

          {isLogsLoading ? (
            <LogSkeleton />
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[780px] text-left">
                  <thead>
                    <tr className="bg-[#faf9f8] text-[9px] font-black uppercase tracking-[0.13em] text-[#91847d]">
                      <th className="px-6 py-3.5">Tarih</th>
                      <th className="px-4 py-3.5">Tetikleyen</th>
                      <th className="px-4 py-3.5 text-center">Eklenen</th>
                      <th className="px-4 py-3.5 text-center">Güncellenen</th>
                      <th className="px-4 py-3.5 text-center">Pasif</th>
                      <th className="px-6 py-3.5 text-right">Sonuç</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logsPage?.items?.map((log) => <DesktopLogRow key={log.id} log={log} />)}
                    {(!logsPage?.items || logsPage.items.length === 0) && <EmptyLogs />}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 p-4 md:hidden">
                {logsPage?.items?.map((log) => <MobileLogCard key={log.id} log={log} />)}
                {(!logsPage?.items || logsPage.items.length === 0) && (
                  <div className="py-10 text-center text-sm font-semibold text-[#8b7e77]">Henüz senkronizasyon kaydı bulunmuyor.</div>
                )}
              </div>
            </>
          )}
        </section>

        <section className="overflow-hidden rounded-[24px] border border-[#e8e3df] bg-white shadow-[0_18px_50px_-40px_rgba(33,26,23,0.42)]">
          <div className="border-b border-[#eee9e5] px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <Network className="h-4.5 w-4.5" />
                </span>
                <div>
                  <h2 className="text-base font-black tracking-[-0.02em] text-[#2d2521]">Departman Yoğunluğu</h2>
                  <p className="mt-0.5 text-[11px] font-semibold text-[#8b7e77]">Aktif personelin organizasyon dağılımı</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">
                {stats?.totalDepartments ?? 0} birim
              </span>
            </div>
          </div>

          {isStatsLoading ? (
            <div className="space-y-5 p-6">
              {[...Array(6)].map((_, index) => (
                <div key={index} className="space-y-2">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-[#ece8e5]" />
                  <div className="h-2 animate-pulse rounded-full bg-[#f1eeeb]" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-5 p-5 sm:p-6">
              {stats?.departmentDistribution.map((department, index) => {
                const share = stats.totalActivePersonnel > 0 ? (department.count / stats.totalActivePersonnel) * 100 : 0;
                const relativeWidth = (department.count / departmentMax) * 100;

                return (
                  <div key={department.departmentName} className="group">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[9px] font-black ${index === 0 ? 'bg-[#fff0e8] text-[#f36c2f]' : 'bg-[#f5f3f1] text-[#8b7e77]'}`}>
                          {index + 1}
                        </span>
                        <span className="truncate text-xs font-extrabold text-[#4b403a]" title={department.departmentName}>
                          {department.departmentName}
                        </span>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-sm font-black text-[#2d2521]">{department.count.toLocaleString('tr-TR')}</span>
                        <span className="ml-1.5 text-[9px] font-bold text-[#a0938c]">%{share.toLocaleString('tr-TR', { maximumFractionDigits: 1 })}</span>
                      </div>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#f0edeb]">
                      <div
                        className={`h-full origin-left rounded-full transition-all duration-700 ${index === 0 ? 'bg-gradient-to-r from-[#ff7138] to-[#ff9b6f]' : 'bg-gradient-to-r from-[#0e9f7a] to-[#60d2b1]'}`}
                        style={{ width: `${Math.max(4, relativeWidth)}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {stats?.departmentDistribution.length === 0 && (
                <div className="flex flex-col items-center py-12 text-center">
                  <Database className="h-8 w-8 text-[#c5bbb5]" />
                  <p className="mt-3 text-sm font-black text-[#5f544e]">Dağılım verisi bulunamadı</p>
                </div>
              )}
            </div>
          )}

          <div className="mx-5 mb-5 flex items-center gap-3 rounded-2xl border border-[#eee9e5] bg-[#faf9f8] px-4 py-3 sm:mx-6 sm:mb-6">
            <Sparkles className="h-4 w-4 shrink-0 text-[#f36c2f]" />
            <p className="text-[10px] font-semibold leading-4 text-[#7d7069]">Çubuklar en yoğun departmana göre, yüzdeler toplam aktif personele göre hesaplanır.</p>
          </div>
        </section>
      </div>
    </div>
  );
}

type StatTone = 'orange' | 'emerald' | 'blue' | 'slate';

const toneClasses: Record<StatTone, string> = {
  orange: 'bg-[#fff0e8] text-[#f36c2f]',
  emerald: 'bg-emerald-50 text-emerald-700',
  blue: 'bg-blue-50 text-blue-700',
  slate: 'bg-[#f2f1f0] text-[#625650]',
};

function StatCard({ title, value, caption, icon, tone, loading }: { title: string; value?: string; caption: string; icon: React.ReactNode; tone: StatTone; loading: boolean }) {
  return (
    <div className="group flex min-w-0 items-center gap-3 rounded-[20px] border border-white bg-white/82 p-3.5 shadow-[0_14px_32px_-26px_rgba(33,26,23,0.42)] backdrop-blur-xl transition-transform hover:-translate-y-0.5 sm:p-4">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl sm:h-11 sm:w-11 ${toneClasses[tone]}`}>{icon}</span>
      <div className="min-w-0">
        <p className="truncate text-[9px] font-black uppercase tracking-[0.13em] text-[#8f827b]">{title}</p>
        {loading ? (
          <div className="mt-1.5 h-7 w-20 animate-pulse rounded-md bg-[#ece8e5]" />
        ) : (
          <p className="mt-0.5 text-2xl font-black leading-none tracking-[-0.04em] text-[#241d1a]">{value || '0'}</p>
        )}
        <p className="mt-1 hidden truncate text-[10px] font-semibold text-[#9a8d86] sm:block">{caption}</p>
      </div>
    </div>
  );
}

function SyncStatus({ log }: { log: SyncLogDto }) {
  return log.isSuccess ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Başarılı
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-red-100 bg-red-50 px-2.5 py-1 text-[10px] font-black text-red-700" title={log.errorMessage || ''}>
      <AlertCircle className="h-3.5 w-3.5" />
      Hata
    </span>
  );
}

function DesktopLogRow({ log }: { log: SyncLogDto }) {
  return (
    <tr className="border-t border-[#f0ece9] transition-colors hover:bg-[#fffbf8]">
      <td className="whitespace-nowrap px-6 py-4 text-xs font-black text-[#3d332e]">{formatLogDate(log.startTime)}</td>
      <td className="max-w-[190px] truncate px-4 py-4 text-xs font-semibold text-[#756963]" title={log.triggeredByUser}>{log.triggeredByUser}</td>
      <td className="px-4 py-4 text-center"><ChangeValue icon={<ArrowDownToLine className="h-3 w-3" />} value={`+${log.insertedCount}`} tone="success" /></td>
      <td className="px-4 py-4 text-center"><ChangeValue value={log.updatedCount.toString()} tone="info" /></td>
      <td className="px-4 py-4 text-center"><ChangeValue value={`-${log.deactivatedCount}`} tone="danger" /></td>
      <td className="px-6 py-4 text-right"><SyncStatus log={log} /></td>
    </tr>
  );
}

function ChangeValue({ value, tone, icon }: { value: string; tone: 'success' | 'info' | 'danger'; icon?: React.ReactNode }) {
  const classes = {
    success: 'bg-emerald-50 text-emerald-700',
    info: 'bg-blue-50 text-blue-700',
    danger: 'bg-red-50 text-red-700',
  }[tone];

  return <span className={`inline-flex min-w-10 items-center justify-center gap-1 rounded-lg px-2 py-1 text-[11px] font-black ${classes}`}>{icon}{value}</span>;
}

function MobileLogCard({ log }: { log: SyncLogDto }) {
  return (
    <article className="rounded-2xl border border-[#ece7e3] bg-[#fcfbfa] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-[#3d332e]">{formatLogDate(log.startTime)}</p>
          <p className="mt-1 text-[11px] font-semibold text-[#857871]">{log.triggeredByUser}</p>
        </div>
        <SyncStatus log={log} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <MobileMetric label="Eklenen" value={`+${log.insertedCount}`} className="text-emerald-700" />
        <MobileMetric label="Güncellenen" value={log.updatedCount.toString()} className="text-blue-700" />
        <MobileMetric label="Pasif" value={`-${log.deactivatedCount}`} className="text-red-700" />
      </div>
    </article>
  );
}

function MobileMetric({ label, value, className }: { label: string; value: string; className: string }) {
  return (
    <div className="rounded-xl bg-white px-2 py-2.5 text-center shadow-sm">
      <p className="text-[8px] font-black uppercase tracking-[0.1em] text-[#9b8e86]">{label}</p>
      <p className={`mt-1 text-sm font-black ${className}`}>{value}</p>
    </div>
  );
}

function LogSkeleton() {
  return (
    <div className="space-y-3 p-5">
      {[...Array(6)].map((_, index) => (
        <div key={index} className="h-12 animate-pulse rounded-xl bg-[#f2efed]" />
      ))}
    </div>
  );
}

function EmptyLogs() {
  return (
    <tr>
      <td colSpan={6} className="px-6 py-16 text-center">
        <div className="flex flex-col items-center">
          <History className="h-8 w-8 text-[#c5bbb5]" />
          <p className="mt-3 text-sm font-black text-[#5f544e]">Henüz senkronizasyon kaydı bulunmuyor</p>
        </div>
      </td>
    </tr>
  );
}
