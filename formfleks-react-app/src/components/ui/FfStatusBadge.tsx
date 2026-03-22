import React from 'react';
import { cn } from './index';

export interface FfStatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: 0 | 1 | 2 | 3;
  label?: string;
  dotMode?: boolean;
}

export const FfStatusBadge = React.forwardRef<HTMLSpanElement, FfStatusBadgeProps>(
  ({ className, status = 0, label, dotMode = false, ...props }, ref) => {
    
    const variantConfig = {
      0: { bg: 'bg-status-draft/10', text: 'text-brand-gray', dot: 'bg-status-draft', defaultLabel: 'Taslak' },
      1: { bg: 'bg-status-success/10', text: 'text-status-success', dot: 'bg-status-success', defaultLabel: 'Tamamlandı' },
      2: { bg: 'bg-status-warning/10', text: 'text-status-warning', dot: 'bg-status-warning', defaultLabel: 'Bekliyor' },
      3: { bg: 'bg-status-danger/10', text: 'text-status-danger', dot: 'bg-status-danger', defaultLabel: 'İptal / Hata' },
    };

    const config = variantConfig[status] || variantConfig[0];
    const displayLabel = label || config.defaultLabel;

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
          config.bg,
          config.text,
          className
        )}
        {...props}
      >
        {dotMode && (
          <svg className={cn("-ml-0.5 mr-1.5 h-2 w-2", config.text)} fill="currentColor" viewBox="0 0 8 8">
            <circle cx="4" cy="4" r="3" />
          </svg>
        )}
        {displayLabel}
      </span>
    );
  }
);
FfStatusBadge.displayName = "FfStatusBadge";
