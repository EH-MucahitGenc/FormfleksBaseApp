import React from 'react';
import { FfCard, cn } from '@/components/ui/index';

export interface KpiCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  caption?: string;
  unitLabel?: string;
  tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger';
  urgent?: boolean;
  onClick?: () => void;
  className?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  icon: Icon,
  caption,
  unitLabel = 'adet',
  tone = 'neutral',
  urgent = false,
  onClick,
  className,
}) => {
  const tones = {
    neutral: {
      icon: 'bg-zinc-100 text-zinc-700',
      accent: 'bg-zinc-700',
      footer: 'text-zinc-500',
    },
    primary: {
      icon: 'bg-orange-50 text-brand-primary',
      accent: 'bg-brand-primary',
      footer: 'text-brand-gray',
    },
    success: {
      icon: 'bg-emerald-50 text-status-success',
      accent: 'bg-status-success',
      footer: 'text-brand-gray',
    },
    warning: {
      icon: 'bg-amber-50 text-status-warning',
      accent: 'bg-status-warning',
      footer: 'text-brand-gray',
    },
    danger: {
      icon: 'bg-red-50 text-status-danger',
      accent: 'bg-status-danger',
      footer: 'text-brand-gray',
    },
  };

  const theme = tones[tone];

  return (
    <FfCard
      className={cn(
        'group h-full border border-surface-muted/80 bg-surface-base transition-all duration-200 hover:border-zinc-300/80 hover:shadow-premium',
        onClick && 'cursor-pointer',
        className
      )}
      noPadding
      onClick={onClick}
    >
      <div className="flex h-full flex-col p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
              {title}
            </p>
            <div className="flex items-end gap-2">
              <span className="text-[30px] font-semibold leading-none tracking-[-0.04em] text-brand-dark">
                {value}
              </span>
              <span className="pb-1 text-xs text-zinc-400">{unitLabel}</span>
            </div>
          </div>
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', theme.icon)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-5 border-t border-surface-muted/70 pt-3">
          <p className={cn('text-xs', theme.footer)}>
            {caption || 'Güncel iş hacmi özeti'}
          </p>
        </div>

        {urgent && <div className={cn('mt-4 h-1 rounded-full', theme.accent)} />}
      </div>
    </FfCard>
  );
};
