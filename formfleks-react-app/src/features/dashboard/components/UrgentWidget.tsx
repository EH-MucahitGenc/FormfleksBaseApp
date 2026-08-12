import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock, TimerReset } from 'lucide-react';
import { GlassCard, FfButton } from '@/components/ui/index';

export interface UrgentApprovalItem {
  requestId: string;
  requestNo: string;
  formTypeName: string;
  createdAt: string;
}

interface UrgentWidgetProps {
  items?: UrgentApprovalItem[];
}

export const UrgentWidget: React.FC<UrgentWidgetProps> = ({ items }) => {
  const navigate = useNavigate();
  const total = items?.length || 0;

  const formatAge = (createdAt: string) => {
    const created = new Date(createdAt).getTime();
    const diffHours = Math.max(0, Math.round((Date.now() - created) / (1000 * 60 * 60)));
    if (diffHours < 24) return `${diffHours}s`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}g`;
  };

  return (
    <GlassCard noPadding className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-surface-muted/80 px-6 py-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-status-warning">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-brand-dark">Acil Onay Bekleyenler</h3>
              <p className="text-xs text-brand-gray">
                Onay kuyruğunuzdaki öncelikli talepleri hızlıca gözden geçirin.
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate('/approvals')}
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-primary transition-colors hover:text-brand-dark"
        >
          Tümünü Gör <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      <div className="divide-y divide-surface-muted/70">
        {!items || items.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-8 py-12 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-status-success">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-brand-dark">Her şey kontrol altında</p>
            <p className="mt-1 max-w-sm text-xs leading-5 text-brand-gray">
              Bekleyen acil onayınız bulunmuyor. Yeni bir işlem oluştuğunda burada görüntülenecektir.
            </p>
            <FfButton
              variant="outline"
              size="sm"
              className="mt-5"
              onClick={() => navigate('/approvals')}
            >
              Onayları Gör
            </FfButton>
          </div>
        ) : (
          <>
            <div className="grid gap-3 border-b border-surface-muted/70 bg-surface-ground/40 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500 sm:grid-cols-[1.6fr_0.9fr_0.6fr_0.7fr]">
              <span>Talep</span>
              <span>Talep No</span>
              <span>Yaş</span>
              <span className="text-right">İşlem</span>
            </div>

            {items.map((item) => (
              <div key={item.requestId} className="grid gap-4 px-6 py-4 transition-colors hover:bg-surface-ground/60 sm:grid-cols-[1.6fr_0.9fr_0.6fr_0.7fr] sm:items-center">
                <div>
                  <div className="text-sm font-semibold text-brand-dark">{item.formTypeName}</div>
                  <div className="mt-1 text-xs text-brand-gray">
                    {new Date(item.createdAt).toLocaleDateString('tr-TR', {
                      day: '2-digit',
                      month: 'long',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <div className="text-sm font-medium text-brand-dark">{item.requestNo}</div>
                <div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-status-warning">
                    <TimerReset className="h-3 w-3" />
                    {formatAge(item.createdAt)}
                  </span>
                </div>
                <div className="flex justify-end">
                  <FfButton variant="outline" size="sm" onClick={() => navigate('/approvals')}>
                    İncele
                  </FfButton>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between bg-surface-ground/40 px-6 py-3 text-xs text-brand-gray">
              <span>Öncelikli kuyrukta {total} talep bulunuyor.</span>
              <span>İlk 5 kayıt gösteriliyor.</span>
            </div>
          </>
        )}
      </div>
    </GlassCard>
  );
};
