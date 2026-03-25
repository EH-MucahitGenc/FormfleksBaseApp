import React from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { usePersonnelStats, useSyncLogs, useTriggerSync } from '../hooks/useIntegrations';
import { Users, Server, Building2, Briefcase, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function PersonnelSyncDashboard() {
  const { data: stats, isLoading: isStatsLoading } = usePersonnelStats();
  const { data: logsPage, isLoading: isLogsLoading } = useSyncLogs(1, 10);
  const syncMutation = useTriggerSync();

  const handleSync = () => {
    syncMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="IFS Personel Senkronizasyonu" 
        description="Oracle/IFS sistemlerindeki güncel organizasyon şemasını ve personel verilerini form onay hiyerarşisi için sisteme aktarın."
        actions={
          <button
            onClick={handleSync}
            disabled={syncMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 shadow-md transition-all disabled:opacity-70"
          >
            <RefreshCw className={`w-5 h-5 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            {syncMutation.isPending ? 'Eşitleniyor...' : 'Şimdi Senkronize Et'}
          </button>
        }
      />

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Aktif Personel"
          value={stats?.totalActivePersonnel.toLocaleString()}
          icon={<Users className="w-6 h-6 text-blue-500" />}
          loading={isStatsLoading}
        />
        <StatCard
          title="Departman Sayısı"
          value={stats?.totalDepartments.toLocaleString()}
          icon={<Building2 className="w-6 h-6 text-purple-500" />}
          loading={isStatsLoading}
        />
        <StatCard
          title="Farklı Pozisyon"
          value={stats?.totalPositions.toLocaleString()}
          icon={<Briefcase className="w-6 h-6 text-teal-500" />}
          loading={isStatsLoading}
        />
        <StatCard
          title="Son Senkronizasyon"
          value={stats?.lastSyncDate ? new Date(stats.lastSyncDate).toLocaleString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Hiç yapılmadı'}
          icon={<Server className="w-6 h-6 text-gray-500" />}
          loading={isStatsLoading}
          valueClassName="text-lg"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LOGS TABLE */}
        <div className="bg-surface-base rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Son Senkronizasyon İşlemleri</h2>
          {isLogsLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 animate-pulse rounded-md" />
              ))}
            </div>
          ) : (
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-lg">Tarih</th>
                      <th className="px-4 py-3">Tetikleyen</th>
                      <th className="px-4 py-3">Eklenen</th>
                      <th className="px-4 py-3">Güncellenen</th>
                      <th className="px-4 py-3">Pasif Edilen</th>
                      <th className="px-4 py-3 rounded-tr-lg">Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logsPage?.items?.map(log => (
                      <tr key={log.id} className="border-b last:border-0 hover:bg-gray-50/50">
                         <td className="px-4 py-3 font-medium text-gray-900">
                           {new Date(log.startTime).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                         </td>
                         <td className="px-4 py-3 text-gray-600">{log.triggeredByUser}</td>
                         <td className="px-4 py-3 text-green-600 font-medium">+{log.insertedCount}</td>
                         <td className="px-4 py-3 text-blue-600 font-medium">{log.updatedCount}</td>
                         <td className="px-4 py-3 text-red-600 font-medium">-{log.deactivatedCount}</td>
                         <td className="px-4 py-3">
                           {log.isSuccess ? (
                             <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                               <CheckCircle2 className="w-3.5 h-3.5" /> Başarılı
                             </span>
                           ) : (
                             <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800" title={log.errorMessage || ''}>
                               <AlertCircle className="w-3.5 h-3.5" /> Hata
                             </span>
                           )}
                         </td>
                      </tr>
                    ))}
                    {(!logsPage?.items || logsPage.items.length === 0) && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          Henüz hiç senkronizasyon kaydı bulunmuyor.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
             </div>
          )}
        </div>

        {/* DEPARTMENT CHART / DISTRIBUTION */}
        <div className="bg-surface-base rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Departman Dağılımı</h2>
          {isStatsLoading ? (
            <div className="h-64 bg-gray-50 animate-pulse rounded-lg flex items-center justify-center">
               <div className="w-32 h-32 rounded-full border-4 border-gray-200"></div>
            </div>
          ) : (
            <div className="space-y-4">
               {stats?.departmentDistribution.map(d => (
                 <div key={d.departmentName}>
                   <div className="flex justify-between text-sm mb-1">
                     <span className="text-gray-700 truncate pr-4" title={d.departmentName}>{d.departmentName}</span>
                     <span className="font-medium text-gray-900">{d.count}</span>
                   </div>
                   <div className="w-full bg-gray-100 rounded-full h-2">
                     <div 
                        className="bg-indigo-500 h-2 rounded-full" 
                        style={{ width: `${Math.min(100, Math.max(5, (d.count / (stats?.totalActivePersonnel || 1)) * 100))}%` }}
                     ></div>
                   </div>
                 </div>
               ))}
               {stats?.departmentDistribution.length === 0 && (
                 <div className="text-center text-gray-500 py-8">Kayıt Yok</div>
               )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, loading, valueClassName = "text-2xl" }: { title: string, value?: string, icon: React.ReactNode, loading: boolean, valueClassName?: string }) {
  return (
    <div className="bg-surface-base p-6 rounded-xl shadow-sm border border-gray-100 flex items-start gap-4 transition-all hover:shadow-md">
      <div className="p-3 bg-gray-50 rounded-lg">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        {loading ? (
           <div className="h-8 w-24 bg-gray-200 animate-pulse rounded mt-1" />
        ) : (
           <h3 className={`font-bold text-gray-900 mt-1 ${valueClassName}`}>{value || '0'}</h3>
        )}
      </div>
    </div>
  );
}
