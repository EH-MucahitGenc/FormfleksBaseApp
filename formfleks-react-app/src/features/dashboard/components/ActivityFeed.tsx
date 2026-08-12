import React from 'react';
import { Activity, ArrowRight, Clock3 } from 'lucide-react';
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
  info: 'bg-orange-50 text-brand-primary ring-orange-100',
  success: 'bg-emerald-50 text-status-success ring-emerald-100',
  warning: 'bg-amber-50 text-status-warning ring-amber-100',
  error: 'bg-red-50 text-status-danger ring-red-100',
};

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ logs }) => {
  const visibleLogs = logs?.slice(0, 8) || [];

  return (
    <GlassCard noPadding className="flex h-full min-h-[520px] flex-col p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-[14px] font-semibold text-brand-dark">
            <Activity className="h-4 w-4 text-brand-primary" />
            Sistem Aktiviteleri
          </h3>
          <p className="mt-1 text-xs text-brand-gray">
            Son sistem hareketlerini daha okunaklı bir akışta izleyin.
          </p>
        </div>
        <button className="inline-flex items-center gap-1 text-xs font-semibold text-brand-primary transition-colors hover:text-brand-dark">
          Tümünü Gör
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      <div className="flex-1 space-y-5">
        {visibleLogs.length > 0 ? (
          visibleLogs.map((log, index) => (
            <div key={log.id} className="relative">
              {index !== visibleLogs.length - 1 && (
                <div className="absolute bottom-[-20px] left-2.5 top-7 w-px bg-surface-muted" />
              )}

              <div className="flex gap-4">
                <div className={`relative z-10 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-4 ring-surface-base ${typeColors[log.type] || typeColors.info}`}>
                  <div className="h-1.5 w-1.5 rounded-full bg-current" />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-medium leading-6 text-brand-dark">
                    {log.message}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-brand-gray">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3 w-3" />
                      {new Date(log.createdAt).toLocaleString('tr-TR', {
                        day: '2-digit',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {log.actorName && <span>Kişi: {log.actorName}</span>}
                    {log.targetName && <span>Talep: {log.targetName}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-surface-muted px-6 py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-ground text-brand-gray">
              <Activity className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-brand-dark">Gösterilebilir aktivite bulunmuyor</p>
            <p className="mt-1 max-w-xs text-xs leading-5 text-brand-gray">
              Görüntüleme yetkinize uygun son hareketler oluştuğunda burada listelenecektir.
            </p>
          </div>
        )}
      </div>
    </GlassCard>
  );
};
