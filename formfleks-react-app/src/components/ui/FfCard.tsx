import React from 'react';
import { cn } from './index';

export interface FfCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  noPadding?: boolean;
}

export const FfCard = React.forwardRef<HTMLDivElement, FfCardProps>(
  ({ className, title, subtitle, action, children, noPadding = false, ...props }, ref) => {
    return (
      <div 
        ref={ref} 
        className={cn("bg-surface-base rounded-xl shadow-soft border border-surface-muted overflow-hidden flex flex-col", className)}
        {...props}
      >
        {(title || action) && (
          <div className="px-6 py-4 border-b border-surface-muted flex flex-row items-center justify-between gap-4">
            <div className="flex flex-col">
              {title && typeof title === 'string' ? <h3 className="text-lg font-semibold text-brand-dark tracking-tight">{title}</h3> : title}
              {subtitle && typeof subtitle === 'string' ? <p className="text-sm text-brand-gray mt-1">{subtitle}</p> : subtitle}
            </div>
            {action && <div>{action}</div>}
          </div>
        )}
        <div className={cn("flex-grow", !noPadding && "p-6")}>
          {children}
        </div>
      </div>
    );
  }
);
FfCard.displayName = "FfCard";
