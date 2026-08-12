import React, { useState } from 'react';
import { FfButton, GlassCard, PageContainer, cn } from '@/components/ui/index';
import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle,
  Clock,
  Eye,
  FileText,
  Flame,
  Gauge,
  ListChecks,
  MonitorDot,
  Plus,
  Radio,
  RotateCw,
  Settings2,
  ShieldCheck,
  TrendingUp,
  XCircle,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FfSkeletonLoader } from '@/components/shared/FfSkeletonLoader';
import { FfAreaChart } from '@/components/charts/FfAreaChart';
import { useAuthStore } from '@/store/useAuthStore';
import {
  useDashboardStats,
  useFormTypeChart,
  useStatusChart,
  useRecentLogs,
  useUrgentApprovals,
  useTrendChart,
} from './hooks/useDashboard';
import type { ActivityLogItem } from './components/ActivityFeed';
import type { UrgentApprovalItem } from './components/UrgentWidget';

type DashboardMode = 'focus' | 'analytics' | 'system';
type CommandScope = 'manager' | 'requests' | 'system';
type WidgetKey = 'approvals' | 'stream' | 'analytics' | 'summary';
type ChartPoint = { label: string; value: number };

const WIDGET_STORAGE_KEY = 'formfleks.dashboard.widgets.v2';

const DEFAULT_WIDGETS: Record<WidgetKey, boolean> = {
  approvals: true,
  stream: true,
  analytics: true,
  summary: true,
};

const widgetLabels: Record<WidgetKey, string> = {
  approvals: 'Onay Kokpiti',
  stream: 'Canlı Akış',
  analytics: 'Analitik Sahne',
  summary: 'Karar Özeti',
};

const statusPalette = ['#10b981', '#f59e0b', '#ef4444', '#2563eb', '#64748b', '#8b5cf6'];

const formatDateTime = (date: string) =>
  new Date(date).toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

const getAgeLabel = (date: string) => {
  const created = new Date(date).getTime();
  const diffHours = Math.max(0, Math.round((Date.now() - created) / (1000 * 60 * 60)));
  if (diffHours < 1) return 'Yeni';
  if (diffHours < 24) return `${diffHours} sa`;
  return `${Math.floor(diffHours / 24)} gün`;
};

const getApprovalSla = (date: string) => {
  const created = new Date(date).getTime();
  const diffHours = Number.isNaN(created) ? 0 : Math.max(0, Math.round((Date.now() - created) / (1000 * 60 * 60)));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours >= 72) {
    return {
      level: 'critical' as const,
      label: 'Kritik',
      age: `${diffDays} gün`,
      message: '3 günü geçti, acil karar bekliyor',
      score: diffHours,
    };
  }

  if (diffHours >= 48) {
    return {
      level: 'warning' as const,
      label: 'Yaklaşıyor',
      age: `${diffDays} gün`,
      message: 'SLA sınırına yaklaşıyor',
      score: diffHours,
    };
  }

  if (diffHours >= 24) {
    return {
      level: 'watch' as const,
      label: 'İzlemede',
      age: `${diffDays} gün`,
      message: 'Bugün takip edilmeli',
      score: diffHours,
    };
  }

  return {
    level: 'fresh' as const,
    label: 'Yeni',
    age: diffHours < 1 ? 'Yeni' : `${diffHours} sa`,
    message: 'SLA içinde',
    score: diffHours,
  };
};

const getActorInitials = (name?: string) => {
  if (!name) return 'FF';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase('tr-TR'))
    .join('');
};

const getActorVisual = (log: ActivityLogItem, index: number) => {
  const palettes = [
    'from-orange-500 to-amber-300',
    'from-emerald-500 to-teal-300',
    'from-sky-500 to-blue-300',
    'from-rose-500 to-red-300',
    'from-violet-500 to-fuchsia-300',
  ];
  const badges: Record<ActivityLogItem['type'], string> = {
    info: '💬',
    success: '✓',
    warning: '⚡',
    error: '!',
  };

  return {
    initials: getActorInitials(log.actorName),
    palette: palettes[index % palettes.length],
    badge: badges[log.type],
  };
};

const useDashboardWidgets = () => {
  const [widgets, setWidgets] = useState<Record<WidgetKey, boolean>>(() => {
    if (typeof window === 'undefined') return DEFAULT_WIDGETS;
    const raw = window.localStorage.getItem(WIDGET_STORAGE_KEY);
    if (!raw) return DEFAULT_WIDGETS;
    try {
      return { ...DEFAULT_WIDGETS, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_WIDGETS;
    }
  });

  const toggleWidget = (key: WidgetKey) => {
    setWidgets((current) => {
      const next = { ...current, [key]: !current[key] };
      localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return { widgets, toggleWidget };
};

const CommandMetric = ({
  label,
  value,
  detail,
  tone,
  icon: Icon,
  onClick,
}: {
  label: string;
  value: number;
  detail: string;
  tone: 'orange' | 'emerald' | 'red' | 'blue';
  icon: React.ElementType;
  onClick?: () => void;
}) => {
  const tones = {
    orange: 'text-brand-primary',
    emerald: 'text-status-success',
    red: 'text-status-danger',
    blue: 'text-status-info',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden rounded-xl border border-surface-muted/90 bg-white/78 px-4 py-3 text-left shadow-soft transition-all',
        'hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(24,24,27,0.12)] focus:outline-none focus:ring-2 focus:ring-brand-primary/30',
        tones[tone]
      )}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-white/80" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-gray">{label}</div>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-3xl font-semibold leading-none text-brand-dark">{value}</span>
            <span className="pb-1 text-xs text-brand-gray/70">adet</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-surface-muted/80 bg-surface-ground/65 shadow-sm">
            <Icon className="h-4.5 w-4.5" />
          </span>
          <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-70" />
        </div>
      </div>
      <div className="mt-2 text-xs text-brand-gray">{detail}</div>
    </button>
  );
};

const ModeButton = ({
  mode,
  activeMode,
  label,
  icon: Icon,
  onClick,
}: {
  mode: DashboardMode;
  activeMode: DashboardMode;
  label: string;
  icon: React.ElementType;
  onClick: (mode: DashboardMode) => void;
}) => (
  <button
    type="button"
    onClick={() => onClick(mode)}
    className={cn(
      'inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-xs font-semibold transition-all',
      activeMode === mode
        ? 'border-[#ddd9d5] bg-[#eceae8] text-brand-dark shadow-sm'
        : 'border-surface-muted bg-surface-base text-brand-gray hover:border-zinc-300 hover:text-brand-dark'
    )}
  >
    <Icon className="h-4 w-4" />
    {label}
  </button>
);

const ScopeButton = ({
  scope,
  activeScope,
  label,
  caption,
  icon: Icon,
  onClick,
}: {
  scope: CommandScope;
  activeScope: CommandScope;
  label: string;
  caption: string;
  icon: React.ElementType;
  onClick: (scope: CommandScope) => void;
}) => (
  <button
    type="button"
    onClick={() => onClick(scope)}
    className={cn(
      'group flex min-w-[190px] items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all',
      activeScope === scope
        ? 'border-brand-primary bg-orange-50 text-brand-dark shadow-[0_16px_36px_rgba(255,122,61,0.16)]'
        : 'border-white/90 bg-white/65 text-brand-gray shadow-sm hover:border-orange-200 hover:bg-white hover:text-brand-dark'
    )}
  >
    <span
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors',
        activeScope === scope ? 'bg-brand-primary text-white' : 'bg-surface-ground text-brand-gray group-hover:text-brand-primary'
      )}
    >
      <Icon className="h-5 w-5" />
    </span>
      <span>
      <span className="block text-sm font-semibold">{label}</span>
      <span className={cn('mt-0.5 block text-xs', activeScope === scope ? 'text-brand-gray' : 'text-brand-gray/75')}>{caption}</span>
    </span>
  </button>
);

const ApprovalCockpit = ({ items }: { items?: UrgentApprovalItem[] }) => {
  const navigate = useNavigate();
  const hasItems = Boolean(items?.length);

  return (
    <GlassCard noPadding className="overflow-hidden border-surface-muted/80 bg-white">
      <div className="flex flex-col gap-3 border-b border-surface-muted/80 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-brand-primary" />
            <h3 className="text-sm font-semibold text-brand-dark">Onay Kokpiti</h3>
          </div>
          <p className="mt-1 text-xs text-brand-gray">Öncelikli talepler, yaş bilgisi ve hızlı aksiyonlar.</p>
        </div>
        <FfButton variant="outline" size="sm" onClick={() => navigate('/approvals')} rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
          Onay Merkezi
        </FfButton>
      </div>

      {hasItems ? (
        <div className="divide-y divide-surface-muted/70">
          {items?.map((item, index) => (
            <button
              type="button"
              key={item.requestId}
              onClick={() => navigate('/approvals')}
              className="grid w-full gap-4 px-6 py-4 text-left transition-colors hover:bg-surface-ground/65 md:grid-cols-[minmax(0,1.5fr)_140px_120px_96px] md:items-center"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn('h-2 w-2 rounded-full', index === 0 ? 'bg-brand-primary' : 'bg-status-warning')} />
                  <span className="truncate text-sm font-semibold text-brand-dark">{item.formTypeName}</span>
                </div>
                <p className="mt-1 text-xs text-brand-gray">{formatDateTime(item.createdAt)}</p>
              </div>
              <div className="text-sm font-medium text-brand-dark">{item.requestNo}</div>
              <div>
                <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-status-warning">
                  {getAgeLabel(item.createdAt)}
                </span>
              </div>
              <span className="text-right text-xs font-semibold text-brand-primary">İncele</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="px-6 py-6">
          <div className="relative overflow-hidden rounded-2xl border border-surface-muted/80 bg-surface-ground/35 px-6 py-7 text-center">
            <div className="pointer-events-none absolute -right-8 -top-12 h-32 w-32 rounded-full bg-orange-100/45 blur-2xl" />
            <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-status-success shadow-sm ring-1 ring-surface-muted">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h4 className="relative mt-4 text-base font-semibold text-brand-dark">Onay kuyruğu temiz</h4>
            <p className="relative mx-auto mt-2 max-w-md text-sm leading-6 text-brand-gray">
              Yeni bir talep düştüğünde bu alan canlı iş kuyruğuna dönüşür. Şimdilik sistem sakin.
            </p>
          </div>
        </div>
      )}
    </GlassCard>
  );
};

const ApprovalSlaRadar = ({ items }: { items?: UrgentApprovalItem[] }) => {
  const navigate = useNavigate();
  const rows = [...(items || [])]
    .map((item) => ({ item, sla: getApprovalSla(item.createdAt) }))
    .sort((a, b) => b.sla.score - a.sla.score);
  const critical = rows.filter((row) => row.sla.level === 'critical');
  const warning = rows.filter((row) => row.sla.level === 'warning');
  const watch = rows.filter((row) => row.sla.level === 'watch');
  const actionRows = rows.filter((row) => row.sla.level !== 'fresh').slice(0, 4);
  const hasAction = actionRows.length > 0;
  const severityClasses = {
    critical: {
      dot: 'bg-red-500 shadow-[0_0_0_6px_rgba(239,68,68,0.12)]',
      badge: 'bg-red-50 text-status-danger border-red-100',
      row: 'border-red-100 bg-red-50/45',
    },
    warning: {
      dot: 'bg-amber-500 shadow-[0_0_0_6px_rgba(245,158,11,0.14)]',
      badge: 'bg-amber-50 text-status-warning border-amber-100',
      row: 'border-amber-100 bg-amber-50/45',
    },
    watch: {
      dot: 'bg-sky-500 shadow-[0_0_0_6px_rgba(14,165,233,0.12)]',
      badge: 'bg-sky-50 text-status-info border-sky-100',
      row: 'border-sky-100 bg-sky-50/45',
    },
    fresh: {
      dot: 'bg-emerald-500 shadow-[0_0_0_6px_rgba(16,185,129,0.12)]',
      badge: 'bg-emerald-50 text-status-success border-emerald-100',
      row: 'border-emerald-100 bg-emerald-50/45',
    },
  };

  return (
    <GlassCard noPadding className="overflow-hidden border-surface-muted/80 bg-white">
      <div className="flex flex-col gap-4 border-b border-surface-muted/80 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-status-danger">
              <Flame className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-brand-dark">SLA Radar: Acil Onaylar</h3>
              <p className="mt-1 text-xs text-brand-gray">3 günü geçen veya sınıra yaklaşan onayları aksiyona çevirir.</p>
            </div>
          </div>
        </div>
        <FfButton variant="outline" size="sm" onClick={() => navigate('/approvals')} rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
          Acil Kuyruğu Aç
        </FfButton>
      </div>

      <div className="grid gap-3 border-b border-surface-muted/70 bg-surface-ground/20 px-6 py-4 md:grid-cols-3">
        <div className="rounded-xl border border-surface-muted/80 bg-surface-ground/30 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-gray">Kritik</div>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-3xl font-semibold leading-none text-status-danger">{critical.length}</span>
            <span className="pb-1 text-xs text-brand-gray">3 gün üstü</span>
          </div>
        </div>
        <div className="rounded-xl border border-surface-muted/80 bg-surface-ground/30 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-gray">Yaklaşıyor</div>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-3xl font-semibold leading-none text-status-warning">{warning.length}</span>
            <span className="pb-1 text-xs text-brand-gray">2-3 gün</span>
          </div>
        </div>
        <div className="rounded-xl border border-surface-muted/80 bg-surface-ground/30 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-gray">İzlemede</div>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-3xl font-semibold leading-none text-status-info">{watch.length}</span>
            <span className="pb-1 text-xs text-brand-gray">1-2 gün</span>
          </div>
        </div>
      </div>

      {hasAction ? (
        <div className="space-y-3 px-6 py-5">
          {actionRows.map(({ item, sla }) => {
            const visual = severityClasses[sla.level];

            return (
              <button
                type="button"
                key={item.requestId}
                onClick={() => navigate('/approvals')}
                className={cn('group grid w-full gap-4 rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-soft md:grid-cols-[minmax(0,1.35fr)_120px_150px_80px] md:items-center', visual.row)}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', visual.dot)} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-brand-dark">{item.formTypeName}</div>
                    <div className="mt-1 text-xs text-brand-gray">{sla.message}</div>
                  </div>
                </div>
                <div className="text-sm font-semibold text-brand-dark">{item.requestNo}</div>
                <div>
                  <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold', visual.badge)}>
                    {sla.label} · {sla.age}
                  </span>
                </div>
                <div className="flex items-center justify-end gap-1 text-xs font-semibold text-brand-primary">
                  İncele
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="px-6 py-5">
          <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-surface-muted/80 bg-surface-ground/35 px-5 py-5 text-center sm:flex-row sm:text-left">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-status-success shadow-sm ring-1 ring-surface-muted">
              <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-brand-dark">SLA riski yok</h4>
                <p className="mt-1 max-w-md text-xs leading-5 text-brand-gray">24 saati aşan bekleyen onay bulunmuyor; kritik panel temiz.</p>
              </div>
            </div>
            <span className="rounded-full border border-surface-muted bg-white px-3 py-1.5 text-[11px] font-semibold text-status-success">Kontrol altında</span>
          </div>
        </div>
      )}
    </GlassCard>
  );
};

const RequestLifecycleTheater = ({
  total,
  inProgress,
  approved,
  rejected,
  returned,
}: {
  total: number;
  inProgress: number;
  approved: number;
  rejected: number;
  returned: number;
}) => {
  const stages = [
    {
      label: 'Toplam',
      value: total,
      icon: FileText,
      color: '#18181b',
      tone: 'bg-zinc-950 text-white border-zinc-900',
      soft: 'bg-zinc-50 text-zinc-700 border-zinc-100',
      hint: 'Açılan talep',
    },
    {
      label: 'Süreçte',
      value: inProgress,
      icon: TrendingUp,
      color: '#ff7a3d',
      tone: 'bg-brand-primary text-white border-orange-500',
      soft: 'bg-orange-50 text-brand-primary border-orange-100',
      hint: 'Akışta ilerliyor',
    },
    {
      label: 'Onaylandı',
      value: approved,
      icon: CheckCircle,
      color: '#10b981',
      tone: 'bg-emerald-500 text-white border-emerald-500',
      soft: 'bg-emerald-50 text-status-success border-emerald-100',
      hint: 'Başarıyla kapandı',
    },
    {
      label: 'Red',
      value: rejected,
      icon: XCircle,
      color: '#ef4444',
      tone: 'bg-red-500 text-white border-red-500',
      soft: 'bg-red-50 text-status-danger border-red-100',
      hint: 'Olumsuz sonuç',
    },
    {
      label: 'İade',
      value: returned,
      icon: Clock,
      color: '#f59e0b',
      tone: 'bg-amber-500 text-white border-amber-500',
      soft: 'bg-amber-50 text-status-warning border-amber-100',
      hint: 'Revizyon bekliyor',
    },
  ];
  const visibleTotal = Math.max(total, inProgress + approved + rejected + returned, 1);
  const completionRate = total > 0 ? Math.round((approved / total) * 100) : 0;
  const actionCount = inProgress + returned;
  const segments = stages.slice(1);
  const dominantStage = [...stages].sort((a, b) => b.value - a.value)[0];

  return (
    <GlassCard noPadding className="overflow-hidden bg-[linear-gradient(135deg,#ffffff_0%,#fbfcff_52%,#fff7f1_100%)]">
      <div className="border-b border-surface-muted/80 px-6 py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <SparklineIcon />
              <h3 className="text-sm font-semibold text-brand-dark">Talep Yolculuğu Sahnesi</h3>
            </div>
            <p className="mt-1 text-xs text-brand-gray">Taleplerin nerede yoğunlaştığını tek akış üzerinde okuyun.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-surface-muted bg-white px-3 py-1 text-xs font-semibold text-brand-gray">
              {total} toplam talep
            </span>
            <span className={cn('rounded-full border px-3 py-1 text-xs font-semibold', actionCount > 0 ? 'border-orange-100 bg-orange-50 text-brand-primary' : 'border-emerald-100 bg-emerald-50 text-status-success')}>
              {actionCount > 0 ? `${actionCount} aksiyon bekliyor` : 'Aksiyon yok'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 px-6 py-6 xl:grid-cols-[260px_minmax(0,1fr)]">
        <div className="relative overflow-hidden rounded-2xl border border-surface-muted/80 bg-white p-5 shadow-soft">
          <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-orange-100 blur-2xl" />
          <div className="relative">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-gray">Genel ilerleme</div>
            <div className="mt-4 flex items-end gap-2">
              <span className="text-5xl font-semibold leading-none text-brand-dark">{completionRate}</span>
              <span className="pb-2 text-sm text-brand-gray">%</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-brand-gray">
              En yoğun aşama <span className="font-semibold text-brand-dark">{dominantStage.label}</span>.
            </p>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-surface-ground">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-primary to-emerald-400"
                style={{ width: `${Math.max(6, completionRate)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="relative rounded-2xl border border-surface-muted/80 bg-white p-5 shadow-soft">
            <div className="absolute left-8 right-8 top-[42px] hidden h-px bg-gradient-to-r from-zinc-200 via-orange-200 to-emerald-200 md:block" />
            <div className="grid gap-4 md:grid-cols-5">
              {stages.map((stage, index) => {
                const Icon = stage.icon;
                return (
                  <div key={stage.label} className="relative">
                    <div className={cn('relative z-[1] flex h-10 w-10 items-center justify-center rounded-xl border shadow-soft', stage.value > 0 ? stage.tone : stage.soft)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="mt-4">
                      <div className="text-2xl font-semibold text-brand-dark">{stage.value}</div>
                      <div className="mt-1 text-sm font-semibold text-brand-dark">{stage.label}</div>
                      <div className="mt-1 text-xs leading-5 text-brand-gray">{stage.hint}</div>
                    </div>
                    {index < stages.length - 1 && (
                      <div className="mt-3 h-1 rounded-full bg-surface-ground md:hidden">
                        <div className="h-full rounded-full" style={{ width: '60%', backgroundColor: stage.color }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            {segments.map((stage) => {
              const percent = Math.round((stage.value / visibleTotal) * 100);
              return (
                <div key={stage.label} className="rounded-xl border border-surface-muted/80 bg-white/80 p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-brand-dark">{stage.label}</span>
                    <span className="text-xs font-semibold text-brand-gray">{percent}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-ground">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(stage.value > 0 ? 8 : 0, percent)}%`, backgroundColor: stage.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </GlassCard>
  );
};

const SparklineIcon = () => (
  <span className="flex h-4 w-4 items-end gap-0.5">
    <span className="h-1.5 w-1 rounded-full bg-brand-primary" />
    <span className="h-3 w-1 rounded-full bg-brand-primary/70" />
    <span className="h-2 w-1 rounded-full bg-brand-primary/40" />
  </span>
);

const FormUsageMap = ({ data }: { data?: ChartPoint[] }) => {
  const sorted = [...(data || [])].sort((a, b) => b.value - a.value);
  const max = Math.max(...sorted.map((item) => item.value), 1);
  const total = sorted.reduce((sum, item) => sum + item.value, 0);

  return (
    <GlassCard noPadding className="overflow-hidden">
      <div className="border-b border-surface-muted/80 px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-brand-primary" />
              <h3 className="text-sm font-semibold text-brand-dark">Form Kullanım Haritası</h3>
            </div>
            <p className="mt-1 text-xs text-brand-gray">En çok kullanılan form tiplerini yoğunluk haritası gibi okuyun.</p>
          </div>
          <span className="rounded-full border border-orange-100 bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-brand-primary">
            {total} talep
          </span>
        </div>
      </div>

      <div className="space-y-4 px-6 py-6">
        {sorted.length > 0 ? (
          sorted.map((item, index) => {
            const width = Math.max(10, Math.round((item.value / max) * 100));
            return (
              <div key={item.label} className="group">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-950 text-[11px] font-semibold text-white">
                      {index + 1}
                    </span>
                    <span className="truncate text-sm font-semibold text-brand-dark">{item.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-brand-dark">{item.value}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-surface-ground">
                  <div
                    className="ff-flow-bar h-full rounded-full bg-gradient-to-r from-brand-primary via-orange-300 to-amber-200"
                    style={{ width: `${width}%`, animationDelay: `${index * 90}ms` }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div className="grid min-h-[260px] place-items-center rounded-xl border border-dashed border-surface-muted">
            <div className="text-center">
              <BarChart3 className="mx-auto h-7 w-7 text-brand-gray/60" />
              <p className="mt-3 text-sm font-semibold text-brand-dark">Henüz form yoğunluğu oluşmadı</p>
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
};

const StatusFlowPanel = ({ data }: { data?: ChartPoint[] }) => {
  const rows = data || [];
  const total = rows.reduce((sum, item) => sum + item.value, 0);

  return (
    <GlassCard noPadding className="overflow-hidden">
      <div className="border-b border-surface-muted/80 px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-brand-primary" />
              <h3 className="text-sm font-semibold text-brand-dark">Durum Akış Panosu</h3>
            </div>
            <p className="mt-1 text-xs text-brand-gray">Donut yerine okunabilir süreç kompozisyonu.</p>
          </div>
          <span className="text-2xl font-semibold text-brand-dark">{total}</span>
        </div>
      </div>

      <div className="px-6 py-6">
        {rows.length > 0 ? (
          <>
            <div className="flex h-5 overflow-hidden rounded-full bg-surface-ground">
              {rows.map((item, index) => (
                <div
                  key={item.label}
                  className="ff-status-segment h-full"
                  style={{
                    width: `${Math.max(6, (item.value / Math.max(total, 1)) * 100)}%`,
                    backgroundColor: statusPalette[index % statusPalette.length],
                    animationDelay: `${index * 120}ms`,
                  }}
                  title={`${item.label}: ${item.value}`}
                />
              ))}
            </div>

            <div className="mt-6 grid gap-3">
              {rows.map((item, index) => {
                const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;
                return (
                  <div key={item.label} className="flex items-center justify-between rounded-lg border border-surface-muted/80 bg-surface-ground/45 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: statusPalette[index % statusPalette.length] }} />
                      <span className="truncate text-sm font-semibold text-brand-dark">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-brand-gray">%{percent}</span>
                      <span className="text-sm font-semibold text-brand-dark">{item.value}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="grid min-h-[260px] place-items-center rounded-xl border border-dashed border-surface-muted">
            <div className="text-center">
              <Gauge className="mx-auto h-7 w-7 text-brand-gray/60" />
              <p className="mt-3 text-sm font-semibold text-brand-dark">Durum verisi bekleniyor</p>
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
};

const TrendStage = ({ data }: { data?: ChartPoint[] }) => (
  <GlassCard className="min-h-[340px] border-surface-muted/80 bg-white">
    <div className="mb-5 flex flex-col gap-3 border-b border-surface-muted/70 pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-brand-primary" />
          <h3 className="text-sm font-semibold text-brand-dark">Aktivite Trendi</h3>
        </div>
        <p className="mt-1 text-xs text-brand-gray">Son 30 gündeki talep ritmi.</p>
      </div>
      <span className="rounded-full border border-surface-muted bg-surface-ground px-2.5 py-1 text-[11px] font-semibold text-brand-gray">
        30 gün
      </span>
    </div>
    <div className="h-[260px]">
      <FfAreaChart data={data || []} color="#f5732b" />
    </div>
  </GlassCard>
);

const LiveSystemStream = ({ logs, theater = false }: { logs?: ActivityLogItem[]; theater?: boolean }) => {
  const visibleLogs = logs?.slice(0, theater ? 14 : 9) || [];

  return (
    <GlassCard noPadding className={cn('relative flex h-full min-h-[520px] flex-col overflow-hidden border-surface-muted/80 bg-white', theater && 'min-h-[650px]')}>
      <div className="ff-scanline pointer-events-none absolute inset-0 opacity-70" />
      <div className="border-b border-surface-muted/80 bg-surface-ground/30 px-6 py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-brand-primary" />
              <h3 className="text-sm font-semibold text-brand-dark">Canlı Sistem Akışı</h3>
            </div>
            <p className="mt-1 text-xs text-brand-gray">Yeni hareketler animasyonlu operasyon akışına düşer.</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-status-success">
            <span className="ff-live-dot h-1.5 w-1.5 rounded-full bg-status-success" />
            Canlı
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-white px-6 py-5">
        {visibleLogs.length > 0 ? (
          <div className={cn('space-y-5', theater && 'grid gap-3 space-y-0 2xl:grid-cols-2')}>
            {visibleLogs.map((log, index) => {
              const actor = getActorVisual(log, index);

              return (
                <div
                  key={log.id}
                  className={cn(
                    'ff-event-card relative rounded-xl border border-surface-muted/80 bg-surface-base/92 p-4 shadow-soft',
                    !theater && 'border-surface-muted/75 bg-surface-ground/28 p-3 shadow-none'
                  )}
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  {!theater && index !== visibleLogs.length - 1 && <span className="absolute left-5 top-12 h-[calc(100%+18px)] w-px bg-surface-muted" />}
                  <div className="flex gap-3">
                    <div className="relative shrink-0">
                      <div className={cn('grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br text-[12px] font-bold text-white shadow-[0_10px_24px_rgba(24,24,27,0.16)]', actor.palette)}>
                        {actor.initials}
                      </div>
                      <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full border-2 border-surface-base bg-white text-[10px] shadow-soft">
                        {actor.badge}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-xs font-semibold text-brand-dark">{log.actorName || 'Formfleks Sistem'}</span>
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                            log.type === 'success' && 'bg-emerald-50 text-status-success',
                            log.type === 'warning' && 'bg-amber-50 text-status-warning',
                            log.type === 'error' && 'bg-red-50 text-status-danger',
                            log.type === 'info' && 'bg-orange-50 text-brand-primary'
                          )}
                        >
                          {log.type === 'success' && 'Onay'}
                          {log.type === 'warning' && 'Uyarı'}
                          {log.type === 'error' && 'Red'}
                          {log.type === 'info' && 'Bilgi'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-medium leading-6 text-brand-dark">{log.message}</p>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-brand-gray">
                        <span>{formatDateTime(log.createdAt)}</span>
                        {log.targetName && <span>{log.targetName}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid h-full place-items-center rounded-xl border border-dashed border-surface-muted">
            <div className="text-center">
              <Activity className="mx-auto h-7 w-7 text-brand-gray/60" />
              <p className="mt-3 text-sm font-semibold text-brand-dark">Akış şu an sakin</p>
              <p className="mt-1 text-xs leading-5 text-brand-gray">Yeni hareketler burada animasyonlu görünür.</p>
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
};

const SystemPulse = ({
  pending,
  inProgress,
  logsCount,
}: {
  pending: number;
  inProgress: number;
  logsCount: number;
}) => {
  const nodes = [
    { label: 'API', value: logsCount, tone: 'bg-emerald-400' },
    { label: 'Onay', value: pending, tone: pending > 0 ? 'bg-amber-400' : 'bg-emerald-400' },
    { label: 'Talep', value: inProgress, tone: 'bg-sky-400' },
    { label: 'Bildirim', value: pending + inProgress, tone: 'bg-brand-primary' },
  ];

  return (
    <GlassCard className="overflow-hidden">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-brand-primary" />
            <h3 className="text-sm font-semibold text-brand-dark">Sistem Nabzı</h3>
          </div>
          <p className="mt-1 text-xs text-brand-gray">Canlılık hissi veren operasyon telemetrisi.</p>
        </div>
        <RotateCw className="ff-spin-slow h-4 w-4 text-brand-gray" />
      </div>

      <div className="relative grid min-h-[360px] place-items-center rounded-xl bg-[#101318] p-6 text-white">
        <div className="ff-orbit ff-orbit-lg" />
        <div className="ff-orbit ff-orbit-md" />
        <div className="relative z-10 grid h-36 w-36 place-items-center rounded-full border border-white/10 bg-white/[0.06] shadow-[0_0_80px_rgba(255,122,61,0.18)]">
          <div className="text-center">
            <MonitorDot className="mx-auto h-7 w-7 text-brand-primary" />
            <div className="mt-2 text-xs font-semibold uppercase tracking-[0.1em] text-white/45">Live Core</div>
          </div>
        </div>

        <div className="absolute inset-5 grid grid-cols-2 gap-4">
          {nodes.map((node, index) => (
            <div key={node.label} className={cn('flex', index % 2 === 0 ? 'items-start justify-start' : 'items-start justify-end', index > 1 && 'items-end')}>
              <div className="rounded-xl border border-white/10 bg-white/[0.08] px-4 py-3 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <span className={cn('ff-live-dot h-2 w-2 rounded-full', node.tone)} />
                  <span className="text-xs font-semibold text-white/65">{node.label}</span>
                </div>
                <div className="mt-2 text-2xl font-semibold">{node.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
};

const DecisionSummary = ({
  pending,
  inProgress,
  healthScore,
}: {
  pending: number;
  inProgress: number;
  healthScore: number;
}) => (
  <GlassCard className="space-y-4 border-surface-muted/80 bg-white">
    <div>
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4 text-brand-primary" />
        <h3 className="text-sm font-semibold text-brand-dark">Karar Özeti</h3>
      </div>
      <p className="mt-1 text-xs text-brand-gray">Dashboard’un söylediği kısa sonuç.</p>
    </div>
    <div className="space-y-3">
      <div className="rounded-xl border border-surface-muted/80 bg-surface-ground/45 px-4 py-3">
        <div className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-gray">Öncelik</div>
        <div className="mt-1 text-sm font-semibold text-brand-dark">
          {pending > 0 ? `${pending} onay bekliyor` : 'Onay kuyruğu temiz'}
        </div>
      </div>
      <div className="rounded-xl border border-surface-muted/80 bg-surface-ground/45 px-4 py-3">
        <div className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-gray">Süreç</div>
        <div className="mt-1 text-sm font-semibold text-brand-dark">
          {inProgress > 0 ? `${inProgress} talep aktif akışta` : 'Aktif talep bulunmuyor'}
        </div>
      </div>
      <div className="rounded-xl border border-surface-muted/80 bg-surface-ground/45 px-4 py-3">
        <div className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-gray">Kalite</div>
        <div className="mt-1 text-sm font-semibold text-brand-dark">%{healthScore} onay sağlığı</div>
      </div>
    </div>
  </GlassCard>
);

const WidgetCustomizer = ({
  widgets,
  onToggle,
}: {
  widgets: Record<WidgetKey, boolean>;
  onToggle: (key: WidgetKey) => void;
}) => (
  <GlassCard noPadding className="border-brand-primary/25 bg-orange-50/40">
    <div className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-brand-primary" />
          <h3 className="text-sm font-semibold text-brand-dark">Dashboard Düzenleme Modu</h3>
        </div>
        <p className="mt-1 text-xs text-brand-gray">Widget görünürlüğünü kişisel tercihinize göre saklıyoruz.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(widgetLabels) as WidgetKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onToggle(key)}
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors',
              widgets[key]
                ? 'border-brand-primary bg-brand-primary text-white'
                : 'border-surface-muted bg-surface-base text-brand-gray hover:text-brand-dark'
            )}
          >
            <span className={cn('h-2 w-2 rounded-full', widgets[key] ? 'bg-white' : 'bg-surface-muted')} />
            {widgetLabels[key]}
          </button>
        ))}
      </div>
    </div>
  </GlassCard>
);

const DashboardWorkspace = ({
  mode,
  commandScope,
  widgets,
  urgentApprovals,
  logs,
  formTypeChart,
  statusChart,
  trendChart,
  pending,
  inProgress,
  healthScore,
  totalForms,
  approved,
  rejected,
  returned,
}: {
  mode: DashboardMode;
  commandScope: CommandScope;
  widgets: Record<WidgetKey, boolean>;
  urgentApprovals?: UrgentApprovalItem[];
  logs?: ActivityLogItem[];
  formTypeChart?: ChartPoint[];
  statusChart?: ChartPoint[];
  trendChart?: ChartPoint[];
  pending: number;
  inProgress: number;
  healthScore: number;
  totalForms: number;
  approved: number;
  rejected: number;
  returned: number;
}) => {
  if (mode === 'analytics') {
    return (
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <FormUsageMap data={formTypeChart} />
        <StatusFlowPanel data={statusChart} />
        <div className="xl:col-span-2">
          <TrendStage data={trendChart} />
        </div>
      </section>
    );
  }

  if (mode === 'system') {
    return (
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.8fr)]">
        <LiveSystemStream logs={logs} theater />
        <div className="space-y-6">
          <SystemPulse pending={pending} inProgress={inProgress} logsCount={logs?.length || 0} />
          <DecisionSummary pending={pending} inProgress={inProgress} healthScore={healthScore} />
        </div>
      </section>
    );
  }

  if (commandScope === 'requests') {
    return (
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.42fr)_minmax(380px,0.72fr)]">
        <div className="space-y-6">
          <RequestLifecycleTheater
            total={totalForms}
            inProgress={inProgress}
            approved={approved}
            rejected={rejected}
            returned={returned}
          />
          <TrendStage data={trendChart} />
        </div>
        <div className="space-y-6">
          <DecisionSummary pending={pending} inProgress={inProgress} healthScore={healthScore} />
          <StatusFlowPanel data={statusChart} />
        </div>
      </section>
    );
  }

  if (commandScope === 'system') {
    return (
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.8fr)]">
        <LiveSystemStream logs={logs} theater />
        <div className="space-y-6">
          <SystemPulse pending={pending} inProgress={inProgress} logsCount={logs?.length || 0} />
          <DecisionSummary pending={pending} inProgress={inProgress} healthScore={healthScore} />
        </div>
      </section>
    );
  }

  return (
    <section className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1.58fr)_minmax(360px,0.82fr)]">
      <div className="space-y-6">
        {widgets.approvals && (
          <>
            <ApprovalSlaRadar items={urgentApprovals} />
            <ApprovalCockpit items={urgentApprovals} />
          </>
        )}
        {widgets.analytics && <TrendStage data={trendChart} />}
      </div>
      <div className="space-y-6">
        {widgets.stream && <LiveSystemStream logs={logs} />}
        {widgets.summary && <DecisionSummary pending={pending} inProgress={inProgress} healthScore={healthScore} />}
      </div>
    </section>
  );
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { widgets, toggleWidget } = useDashboardWidgets();
  const [mode, setMode] = useState<DashboardMode>('focus');
  const [commandScope, setCommandScope] = useState<CommandScope>('manager');
  const [isCustomizing, setIsCustomizing] = useState(false);

  const { data: stats, isLoading: isStatsLoading } = useDashboardStats();
  const { data: formTypeChart, isLoading: isFormTypeLoading } = useFormTypeChart();
  const { data: statusChart, isLoading: isStatusLoading } = useStatusChart();
  const { data: trendChart, isLoading: isTrendLoading } = useTrendChart();
  const { data: logs, isLoading: isLogsLoading } = useRecentLogs();
  const { data: urgentApprovals, isLoading: isApprovalsLoading } = useUrgentApprovals();

  const isLoading = isStatsLoading || isFormTypeLoading || isStatusLoading || isTrendLoading || isLogsLoading || isApprovalsLoading;

  const firstName = user?.firstName || 'Formfleks';
  const pending = stats?.pendingApprovalsCount || 0;
  const approvedByMe = stats?.approvedByMeCount || 0;
  const rejectedByMe = stats?.rejectedByMeCount || 0;
  const totalForms = stats?.totalFormsSubmitted || 0;
  const inProgress = stats?.inProgressFormsCount || 0;
  const approved = stats?.approvedFormsCount || 0;
  const rejected = stats?.rejectedFormsCount || 0;
  const returned = stats?.returnedFormsCount || 0;
  const criticalApprovalsCount = (urgentApprovals || []).filter((item) => getApprovalSla(item.createdAt).level === 'critical').length;
  const healthScore = totalForms > 0 ? Math.round((approved / totalForms) * 100) : 100;
  const healthMessage =
    pending > 0
      ? `${pending} onay bekliyor; odak kuyruğu yönetici aksiyonunda.`
      : inProgress > 0
        ? `${inProgress} talep akışta; sistem hareketli ama dengede.`
        : 'Kritik kuyruk yok; sistem sakin ve kontrol altında.';
  const scopeContent = {
    manager: {
      label: 'Yönetici İşlemleri',
      caption: 'Onay, red ve müdahale',
      icon: ShieldCheck,
      title: `Hoş geldin, ${firstName}. Öncelik isteyen işleri buradan yönet.`,
      description: 'Bekleyen onaylar, hızlı aksiyonlar ve canlı sistem hareketleri yönetici odağında toplandı.',
    },
    requests: {
      label: 'Kendi Taleplerim',
      caption: 'Talep yolculuğu ve durum',
      icon: FileText,
      title: `${firstName}, kendi taleplerinin yolculuğunu tek sahnede izle.`,
      description: 'Toplam talep, süreçteki işler, onaylananlar, red ve iade dağılımı görsel bir akışa dönüştü.',
    },
    system: {
      label: 'Sistem Sahnesi',
      caption: 'Canlı akış ve nabız',
      icon: Radio,
      title: 'Sistem sahnesi açık. Kim ne yaptı, hangi akış hareketlendi burada.',
      description: 'Avatar’lı canlı akış, sistem telemetrisi ve karar özeti birlikte çalışır.',
    },
  };
  const scopeMetrics = {
    manager: [
      { label: 'Bekleyen', value: pending, detail: 'Onay kuyruğu', tone: 'orange' as const, icon: Clock, onClick: () => navigate('/approvals') },
      { label: 'Kritik', value: criticalApprovalsCount, detail: '3 günü geçen onay', tone: 'red' as const, icon: Flame, onClick: () => navigate('/approvals') },
      { label: 'Onayladım', value: approvedByMe, detail: 'Tamamlanan aksiyon', tone: 'emerald' as const, icon: CheckCircle, onClick: () => navigate('/approvals/history?status=approved') },
      { label: 'Reddettim', value: rejectedByMe, detail: 'Reddedilen aksiyon', tone: 'red' as const, icon: XCircle, onClick: () => navigate('/approvals/history?status=rejected') },
      { label: 'Kuyruk', value: urgentApprovals?.length || 0, detail: 'Öncelikli kayıt', tone: 'blue' as const, icon: ListChecks, onClick: () => navigate('/approvals') },
    ],
    requests: [
      { label: 'Toplam', value: totalForms, detail: 'Oluşturulan talep', tone: 'blue' as const, icon: FileText, onClick: () => navigate('/forms') },
      { label: 'Süreçte', value: inProgress, detail: 'Akışta ilerliyor', tone: 'orange' as const, icon: TrendingUp, onClick: () => navigate('/forms?status=pending') },
      { label: 'Onaylanan', value: approved, detail: 'Başarıyla kapandı', tone: 'emerald' as const, icon: CheckCircle, onClick: () => navigate('/forms?status=approved') },
      { label: 'Reddedilen', value: rejected, detail: 'Olumsuz sonuçlanan', tone: 'red' as const, icon: XCircle, onClick: () => navigate('/forms?status=rejected') },
      { label: 'İade', value: returned, detail: 'Revizyon bekleyen', tone: 'orange' as const, icon: Clock, onClick: () => navigate('/forms?status=returned') },
    ],
    system: [
      { label: 'Aktivite', value: logs?.length || 0, detail: 'Son sistem izi', tone: 'blue' as const, icon: Activity, onClick: () => setMode('system') },
      { label: 'Kuyruk', value: pending, detail: 'Bekleyen onay', tone: 'orange' as const, icon: Clock, onClick: () => setCommandScope('manager') },
      { label: 'Akış', value: inProgress, detail: 'Aktif talep', tone: 'emerald' as const, icon: Radio, onClick: () => setCommandScope('requests') },
      { label: 'Sağlık', value: healthScore, detail: 'Süreç skoru', tone: healthScore >= 70 ? 'emerald' as const : 'red' as const, icon: Gauge, onClick: () => setMode('system') },
    ],
  };

  if (isLoading) {
    return (
      <PageContainer maxWidth="full">
        <FfSkeletonLoader type="grid" className="h-64" />
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.85fr)]">
          <FfSkeletonLoader type="grid" className="h-[540px]" />
          <FfSkeletonLoader type="grid" className="h-[540px]" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="full" className="min-h-full pb-10">
      <section className="relative overflow-hidden rounded-[24px] border border-[#e7ded7] bg-[linear-gradient(125deg,#fffaf6_0%,#ffffff_68%,#f7f7f6_100%)] shadow-[0_30px_90px_-48px_rgba(70,44,28,0.24)]">
        <div className="absolute inset-y-0 left-0 w-1 bg-brand-primary" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white" />
        <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-orange-200/25 blur-3xl" />
        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(380px,0.75fr)] lg:p-7">
          <div className="space-y-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-gray shadow-soft">
                  <MonitorDot className="h-3.5 w-3.5 text-brand-primary" />
                  Veri Özeti İzleme
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {(Object.keys(scopeContent) as CommandScope[]).map((scope) => {
                    const item = scopeContent[scope];
                    return (
                      <ScopeButton
                        key={scope}
                        scope={scope}
                        activeScope={commandScope}
                        label={item.label}
                        caption={item.caption}
                        icon={item.icon}
                        onClick={(nextScope) => {
                          setCommandScope(nextScope);
                          setMode('focus');
                        }}
                      />
                    );
                  })}
                </div>

                <h1 className="mt-6 max-w-4xl text-[34px] font-semibold leading-tight tracking-normal text-brand-dark lg:text-[44px]">
                  {scopeContent[commandScope].title}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-brand-gray">
                  {scopeContent[commandScope].description}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <FfButton variant="outline" className="bg-white/70" onClick={() => navigate('/forms')}>
                  Taleplerim
                </FfButton>
                <FfButton leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate('/forms/create')}>
                  Yeni Talep
                </FfButton>
              </div>
            </div>

            <div className={cn('grid gap-3 md:grid-cols-2', scopeMetrics[commandScope].length === 5 ? 'xl:grid-cols-5' : 'xl:grid-cols-4')}>
              {scopeMetrics[commandScope].map((metric) => (
                <CommandMetric key={metric.label} {...metric} />
              ))}
            </div>
          </div>

          <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-surface-muted/90 bg-[#f8f7f5] p-5 shadow-[0_18px_46px_-32px_rgba(70,60,54,0.26)]">
            <div className="pointer-events-none absolute -right-14 -top-16 h-40 w-40 rounded-full bg-orange-100/45 blur-3xl" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-gray">Operasyon Sinyali</p>
                <div className="mt-3 flex items-end gap-2">
                  <span className="text-5xl font-semibold leading-none text-brand-dark">{healthScore}</span>
                  <span className="pb-1 text-sm text-brand-gray">/ 100</span>
                </div>
              </div>
              <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-surface-muted bg-white text-brand-primary shadow-sm">
                <ShieldCheck className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-6 h-2 rounded-full bg-surface-muted">
              <div
                className="h-2 rounded-full bg-brand-primary"
                style={{ width: `${Math.max(8, Math.min(100, healthScore))}%` }}
              />
            </div>
            <div className="relative mt-5 rounded-xl border border-surface-muted/80 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-gray">Bugünün yorumu</div>
              <p className="mt-2 text-sm leading-6 text-brand-dark">{healthMessage}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <ModeButton mode="focus" activeMode={mode} label="Odak Görünümü" icon={ListChecks} onClick={setMode} />
          <ModeButton mode="analytics" activeMode={mode} label="Analitik Sahne" icon={BarChart3} onClick={setMode} />
          <ModeButton mode="system" activeMode={mode} label="Canlı Sistem" icon={Activity} onClick={setMode} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setIsCustomizing((value) => !value)}
            className={cn(
              'inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-xs font-semibold transition-all',
              isCustomizing
                ? 'border-brand-primary bg-orange-50 text-brand-primary'
                : 'border-surface-muted bg-white/80 text-brand-gray shadow-sm hover:border-brand-primary/40 hover:text-brand-dark'
            )}
          >
            <Settings2 className="h-4 w-4" />
            Dashboard'u Düzenle
          </button>
        </div>
      </div>

      {isCustomizing && <WidgetCustomizer widgets={widgets} onToggle={toggleWidget} />}

      <DashboardWorkspace
        mode={mode}
        commandScope={commandScope}
        widgets={widgets}
        urgentApprovals={urgentApprovals}
        logs={logs}
        formTypeChart={formTypeChart}
        statusChart={statusChart}
        trendChart={trendChart}
        pending={pending}
        inProgress={inProgress}
        healthScore={healthScore}
        totalForms={totalForms}
        approved={approved}
        rejected={rejected}
        returned={returned}
      />
    </PageContainer>
  );
};
