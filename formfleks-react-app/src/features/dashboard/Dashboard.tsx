import React from 'react';
import { PageHeader, FfButton, PageContainer, GlassCard } from '@/components/ui/index';
import { FileText, CheckCircle, Clock, XCircle, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FfSkeletonLoader } from '@/components/shared/FfSkeletonLoader';
import { FfBarChart } from '@/components/charts/FfBarChart';
import { FfPieChart } from '@/components/charts/FfPieChart';
import { useDashboardStats, useDeptChart, useStatusChart, useRecentLogs, useUrgentApprovals } from './hooks/useDashboard';
import { UrgentWidget } from './components/UrgentWidget';
import { ActivityFeed } from './components/ActivityFeed';
import { useCountUp } from '@/hooks/useCountUp';

const STATUS_COLORS = ['#10b981', '#ef4444', '#f59e0b'];

// ─── Inline Animation Component ──────────
const AnimatedNumber = ({ value }: { value: number }) => {
  const count = useCountUp(value, 1500); // 1.5s premium duration
  return <>{count}</>;
};

// ─── Inline StatCard ──────────
const StatCard = ({ title, value, icon: Icon, colorClass, urgent = false, onClick }: {
  title: string; value: number; icon: React.ElementType; colorClass: string; urgent?: boolean; onClick?: () => void;
}) => (
  <GlassCard 
    noPadding 
    className={`p-5 relative overflow-hidden group hover-lift animate-fade-in-up ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
    onClick={onClick}
  >
    <div className="flex justify-between items-start">
      <div>
        <p className="text-xs font-semibold text-brand-gray uppercase tracking-wider mb-2">{title}</p>
        <h4 className="text-3xl font-black text-brand-dark tracking-tight">
          <AnimatedNumber value={value} />
        </h4>
      </div>
      <div className={`p-3 rounded-xl ${colorClass} transition-transform group-hover:scale-110`}>
        <Icon className="h-6 w-6" />
      </div>
    </div>
    {urgent && <div className="absolute bottom-0 left-0 right-0 h-1 bg-status-warning shimmer" />}
  </GlassCard>
);

// ─── Dashboard Page (Pure Composition) ───────────────────────────────
export const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  // All data via custom hooks
  const { data: stats, isLoading: isStatsLoading } = useDashboardStats();
  const { data: deptChart, isLoading: isDeptLoading } = useDeptChart();
  const { data: statusChart, isLoading: isStatusLoading } = useStatusChart();
  const { data: logs, isLoading: isLogsLoading } = useRecentLogs();
  const { data: urgentApprovals, isLoading: isApprovalsLoading } = useUrgentApprovals();

  const isLoading = isStatsLoading || isDeptLoading || isStatusLoading || isLogsLoading || isApprovalsLoading;

  if (isLoading) {
    return (
      <PageContainer className="animate-fade-in">
        <div className="flex justify-between items-center mb-6">
          <FfSkeletonLoader type="text" className="w-64 h-8" />
          <FfSkeletonLoader type="text" className="w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <FfSkeletonLoader key={i} type="card" className="h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2 space-y-6">
            <FfSkeletonLoader type="grid" className="h-[250px]" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FfSkeletonLoader type="grid" className="h-[300px]" />
              <FfSkeletonLoader type="grid" className="h-[300px]" />
            </div>
          </div>
          <FfSkeletonLoader type="grid" className="h-[600px]" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <PageHeader
          title="Yönetim Paneli"
          description="Sistemin genel durumu, istatistikler ve onay bekleyen işleriniz."
          breadcrumbs={[{ label: 'Anasayfa', href: '/' }]}
        />
        <div className="flex items-center gap-3">
          <FfButton variant="outline" onClick={() => navigate('/forms')} leftIcon={<FileText className="h-4 w-4" />}>
            Taleplerim
          </FfButton>
          <FfButton variant="primary" onClick={() => navigate('/forms/create')} leftIcon={<TrendingUp className="h-4 w-4" />}>
            Yeni Talep
          </FfButton>
        </div>
      </div>

      {/* Approver Stats Row */}
      <div className="mb-6">
        <h2 className="text-sm font-bold text-brand-dark mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-brand-primary" /> Yönetici İşlemlerim
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Bekleyen Onaylarım" value={stats?.pendingApprovalsCount || 0} icon={Clock} colorClass="text-status-warning bg-status-warning/10" urgent={(stats?.pendingApprovalsCount || 0) > 0} onClick={() => navigate('/approvals')} />
          <StatCard title="Onay Verdiklerim" value={stats?.approvedByMeCount || 0} icon={CheckCircle} colorClass="text-status-success bg-status-success/10" onClick={() => navigate('/approvals/history?status=approved')} />
          <StatCard title="Reddettiklerim" value={stats?.rejectedByMeCount || 0} icon={XCircle} colorClass="text-status-danger bg-status-danger/10" onClick={() => navigate('/approvals/history?status=rejected')} />
        </div>
      </div>

      {/* Requestor Stats Row */}
      <div className="mb-6">
        <h2 className="text-sm font-bold text-brand-dark mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-brand-primary" /> Kendi Taleplerim
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard title="Toplam Talebim" value={stats?.totalFormsSubmitted || 0} icon={FileText} colorClass="text-brand-gray bg-surface-muted" onClick={() => navigate('/forms')} />
          <StatCard title="Onay Sürecindekiler" value={stats?.inProgressFormsCount || 0} icon={TrendingUp} colorClass="text-brand-primary bg-brand-primary/10" onClick={() => navigate('/forms?status=pending')} />
          <StatCard title="Onaylananlar" value={stats?.approvedFormsCount || 0} icon={CheckCircle} colorClass="text-status-success bg-status-success/10" onClick={() => navigate('/forms?status=approved')} />
          <StatCard title="Reddedilenler" value={stats?.rejectedFormsCount || 0} icon={XCircle} colorClass="text-status-danger bg-status-danger/10" onClick={() => navigate('/forms?status=rejected')} />
          <StatCard title="İade Edilenler" value={stats?.returnedFormsCount || 0} icon={TrendingUp} colorClass="text-status-warning bg-status-warning/10" onClick={() => navigate('/forms?status=returned')} />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Urgent + Charts */}
        <div className="lg:col-span-2 space-y-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <UrgentWidget items={urgentApprovals} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassCard noPadding className="p-6 flex flex-col group">
              <h3 className="font-bold text-brand-dark mb-4 text-sm group-hover:text-brand-primary transition-colors">Departmanlara Göre Dağılım</h3>
              <div className="flex-1 min-h-[250px] flex items-center justify-center">
                <FfBarChart data={deptChart || []} />
              </div>
            </GlassCard>

            <GlassCard noPadding className="p-6 flex flex-col group">
              <h3 className="font-bold text-brand-dark mb-4 text-sm group-hover:text-brand-primary transition-colors">Talep Durum Dağılımı</h3>
              <div className="flex-1 min-h-[250px] flex items-center justify-center">
                <FfPieChart data={statusChart || []} colors={STATUS_COLORS} />
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Right: Activity Feed */}
        <div className="lg:col-span-1 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <ActivityFeed logs={logs} />
        </div>
      </div>
    </PageContainer>
  );
};

