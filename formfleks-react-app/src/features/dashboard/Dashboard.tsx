import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboard.service';
import { PageHeader, FfButton } from '@/components/ui/index';
import { FileText, CheckCircle, Clock, XCircle, Activity, TrendingUp, ArrowRight } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { FfSkeletonLoader } from '@/components/shared/FfSkeletonLoader';

const STATUS_COLORS = ['#4caf50', '#f44336', '#ff9800'];

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  // Parallel data fetching for dashboard widgets
  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['dash-stats'],
    queryFn: () => dashboardService.getOverviewStats()
  });

  const { data: deptChart, isLoading: isDeptLoading } = useQuery({
    queryKey: ['dash-dept-chart'],
    queryFn: () => dashboardService.getFormsByDepartmentChart()
  });

  const { data: statusChart, isLoading: isStatusLoading } = useQuery({
    queryKey: ['dash-status-chart'],
    queryFn: () => dashboardService.getFormsByStatusChart()
  });

  const { data: logs, isLoading: isLogsLoading } = useQuery({
    queryKey: ['dash-logs'],
    queryFn: () => dashboardService.getRecentActivityLogs()
  });

  const { data: urgentApprovals, isLoading: isApprovalsLoading } = useQuery({
    queryKey: ['dash-urgent-approvals'],
    queryFn: () => dashboardService.getUrgentPendingApprovals()
  });

  const isLoading = isStatsLoading || isDeptLoading || isStatusLoading || isLogsLoading || isApprovalsLoading;

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 space-y-6 w-full">
         <div className="flex justify-between items-center mb-6">
           <FfSkeletonLoader type="text" className="w-64" />
           <FfSkeletonLoader type="text" className="w-32" />
         </div>
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
           {Array.from({length: 4}).map((_, i) => (
             <FfSkeletonLoader key={i} type="card" />
           ))}
         </div>
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <div className="lg:col-span-2 space-y-6">
              <FfSkeletonLoader type="grid" className="h-[250px]" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <FfSkeletonLoader type="grid" className="h-[300px]" />
                 <FfSkeletonLoader type="grid" className="h-[300px]" />
              </div>
           </div>
           <div className="lg:col-span-1">
              <FfSkeletonLoader type="grid" className="h-[600px]" />
           </div>
         </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <PageHeader
          title="Yönetim Paneli"
          description="Sistemin genel durumu, istatistikler ve onay bekleyen işleriniz."
        />
        <div className="flex items-center gap-3">
          <FfButton 
            variant="outline"
            onClick={() => navigate('/forms')}
            leftIcon={<FileText className="h-4 w-4" />}
          >
            Taleplerim
          </FfButton>
          <FfButton 
            variant="primary"
            onClick={() => navigate('/forms/create')}
            leftIcon={<TrendingUp className="h-4 w-4" />}
          >
            Yeni Talep
          </FfButton>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Toplam Talep" 
          value={stats?.totalFormsSubmitted || 0} 
          icon={FileText} 
          colorClass="text-brand-primary bg-brand-primary/10" 
        />
        <StatCard 
          title="Onay Bekleyen İşlerim" 
          value={stats?.pendingApprovalsCount || 0} 
          icon={Clock} 
          colorClass="text-status-warning bg-status-warning/10" 
          urgent={stats && stats.pendingApprovalsCount > 0}
        />
        <StatCard 
          title="Onaylananlar" 
          value={stats?.approvedFormsCount || 0} 
          icon={CheckCircle} 
          colorClass="text-status-success bg-status-success/10" 
        />
        <StatCard 
          title="Reddedilenler" 
          value={stats?.rejectedFormsCount || 0} 
          icon={XCircle} 
          colorClass="text-status-danger bg-status-danger/10" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Charts Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Urgent Approvals Widget */}
          <div className="bg-white rounded-xl shadow-sm border border-surface-muted overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-brand-dark flex items-center gap-2">
                <Clock className="h-5 w-5 text-status-warning" />
                Acil Onay Bekleyenler
              </h3>
              <button 
                onClick={() => navigate('/approvals')}
                className="text-xs font-semibold text-brand-primary hover:text-brand-dark flex items-center gap-1 transition-colors"
              >
                Tümünü Gör <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            <div className="divide-y border-surface-muted">
              {urgentApprovals?.length === 0 ? (
                <div className="p-6 text-center text-sm text-brand-gray">Bekleyen acil bir işiniz bulunmamaktadır.</div>
              ) : (
                urgentApprovals?.map((item) => (
                  <div key={item.requestId} className="p-4 hover:bg-surface-muted/30 transition-colors flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm text-brand-dark">{item.formTypeName}</div>
                      <div className="text-xs text-brand-gray mt-1">
                        Talep No: {item.requestNo} • {new Date(item.createdAt).toLocaleDateString('tr-TR')}
                      </div>
                    </div>
                    <FfButton 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate('/approvals')}
                    >
                      İncele
                    </FfButton>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="bg-white rounded-xl shadow-sm border border-surface-muted p-6 flex flex-col">
              <h3 className="font-bold text-brand-dark mb-4 text-sm">Departmanlara Göre Dağılım</h3>
              <div className="flex-1 min-h-[250px] flex items-center justify-center">
                {deptChart && deptChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deptChart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                      <RechartsTooltip 
                        cursor={{ fill: '#F3F4F6' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="value" fill="#f6894c" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <span className="text-sm text-brand-gray/60 italic">Henüz yeterli dağılım verisi oluşmadı.</span>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-surface-muted p-6 flex flex-col">
              <h3 className="font-bold text-brand-dark mb-4 text-sm">Talep Durum Dağılımı</h3>
              <div className="flex-1 min-h-[250px] flex items-center justify-center">
                {statusChart && statusChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusChart}
                        cx="50%"
                        cy="45%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {statusChart?.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        iconType="circle"
                        formatter={(value) => <span className="text-xs text-brand-dark font-medium">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <span className="text-sm text-brand-gray/60 italic">Henüz durum istatistiği oluşmadı.</span>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Right Sidebar - Activity Feed */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-surface-muted p-6 h-full min-h-[500px]">
            <h3 className="font-bold text-brand-dark flex items-center gap-2 mb-6 text-sm">
              <Activity className="h-4 w-4 text-brand-primary" />
              Sistem Aktiviteleri
            </h3>
            
            <div className="space-y-6">
              {logs && logs.length > 0 ? logs.map((log, index) => (
                <div key={log.id} className="relative">
                  {/* Timeline connecting line */}
                  {index !== logs.length - 1 && (
                    <div className="absolute left-2.5 top-7 bottom-[-24px] w-0.5 bg-surface-muted"></div>
                  )}
                  
                  <div className="flex gap-4">
                    <div className={`mt-0.5 relative z-10 w-5 h-5 rounded-full flex items-center justify-center shrink-0 border-2 border-white ring-1 ${
                      log.type === 'info' ? 'bg-brand-primary/20 ring-brand-primary/30 text-brand-primary' :
                      log.type === 'success' ? 'bg-status-success/20 ring-status-success/30 text-status-success' :
                      log.type === 'warning' ? 'bg-status-warning/20 ring-status-warning/30 text-status-warning' :
                      'bg-status-danger/20 ring-status-danger/30 text-status-danger'
                    }`}>
                      <div className="w-1.5 h-1.5 rounded-full fill-current bg-current"></div>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-brand-dark leading-snug">{log.message}</p>
                      <span className="text-xs text-brand-gray mt-1 block">
                        {new Date(log.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit'})}
                      </span>
                    </div>
                  </div>
                </div>
              )) : (
                 <div className="text-center text-sm text-brand-gray/60 italic py-8">Gösterilecek son aktivite kaydı bulunmuyor.</div>
              )}
            </div>
            
            {logs && logs.length > 0 && (
              <button className="w-full mt-8 py-2 text-sm font-semibold text-brand-primary hover:bg-brand-primary/5 rounded-lg transition-colors border border-transparent hover:border-brand-primary/20">
                Tüm Logları Görüntüle
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

// -- Helper Widget --

const StatCard = ({ title, value, icon: Icon, colorClass, urgent = false }: any) => (
  <div className="bg-white rounded-xl shadow-sm border border-surface-muted p-5 relative overflow-hidden group">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-xs font-semibold text-brand-gray uppercase tracking-wider mb-2">{title}</p>
        <h4 className="text-3xl font-black text-brand-dark tracking-tight">{value}</h4>
      </div>
      <div className={`p-3 rounded-xl ${colorClass} transition-transform group-hover:scale-110`}>
        <Icon className="h-6 w-6" />
      </div>
    </div>
    
    {urgent && (
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-status-warning animate-pulse"></div>
    )}
  </div>
);
