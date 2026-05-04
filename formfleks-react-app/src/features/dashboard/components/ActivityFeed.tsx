import React from 'react';
import { Activity } from 'lucide-react';
import { GlassCard } from '@/components/ui/index';

export interface ActivityLogItem {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  createdAt: string;
  actorName?: string;
  targetName?: string;
}

interface ActivityFeedProps {
  logs?: ActivityLogItem[];
}

const typeColors: Record<string, string> = {
  info: 'bg-brand-primary/20 ring-brand-primary/30 text-brand-primary',
  success: 'bg-status-success/20 ring-status-success/30 text-status-success',
  warning: 'bg-status-warning/20 ring-status-warning/30 text-status-warning',
  error: 'bg-status-danger/20 ring-status-danger/30 text-status-danger',
};

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ logs }) => {
  return (
    <GlassCard noPadding className="p-6 h-full min-h-[500px]">
      <h3 className="font-bold text-brand-dark flex items-center gap-2 mb-6 text-sm">
        <Activity className="h-4 w-4 text-brand-primary" />
        Sistem Aktiviteleri
      </h3>

      <div className="space-y-6">
        {logs && logs.length > 0 ? (
          logs.map((log, index) => (
            <div key={log.id} className="relative">
              {/* Timeline connecting line */}
              {index !== logs.length - 1 && (
                <div className="absolute left-2.5 top-7 bottom-[-24px] w-0.5 bg-surface-muted" />
              )}

              <div className="flex gap-4">
                <div className={`mt-0.5 relative z-10 w-5 h-5 rounded-full flex items-center justify-center shrink-0 border-2 border-white ring-1 ${typeColors[log.type] || typeColors.info}`}>
                  <div className="w-1.5 h-1.5 rounded-full fill-current bg-current" />
                </div>

                <div>
                  <p className="text-sm font-medium text-brand-dark leading-snug">
                    {log.message}
                    {log.targetName && <span className="font-bold text-brand-primary ml-1">({log.targetName})</span>}
                  </p>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1">
                    <span className="text-xs text-brand-gray/80 flex items-center gap-1">
                      {new Date(log.createdAt).toLocaleString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {log.actorName && (
                      <>
                        <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-surface-muted"></span>
                        <span className="text-xs font-semibold text-brand-dark flex items-center gap-1">
                          <span className="text-brand-gray font-normal">Kişi:</span> {log.actorName}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-sm text-brand-gray/60 italic py-8">
            Gösterilecek son aktivite kaydı bulunmuyor.
          </div>
        )}
      </div>

      {logs && logs.length > 0 && (
        <button className="w-full mt-8 py-2 text-sm font-semibold text-brand-primary hover:bg-brand-primary/5 rounded-lg transition-colors border border-transparent hover:border-brand-primary/20">
          Tüm Logları Görüntüle
        </button>
      )}
    </GlassCard>
  );
};
