import React from 'react';
import { Inbox } from 'lucide-react';
import { cn } from './index';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, title = "Kayıt Bulunamadı", description = "Bu görünüm için henüz herhangi bir veri eklenmemiş veya arama kriterlerinize uygun sonuç yok.", icon, action, ...props }, ref) => {
    return (
      <div 
        ref={ref}
        className={cn("flex flex-col items-center justify-center p-8 text-center min-h-[300px] border-2 border-dashed border-surface-muted rounded-xl bg-surface-base/50", className)}
        {...props}
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-primary/10 mb-4">
          {icon || <Inbox className="h-10 w-10 text-brand-primary" />}
        </div>
        <h3 className="mt-2 text-lg font-semibold text-brand-dark">{title}</h3>
        <p className="mt-2 text-sm text-brand-gray max-w-sm mb-6">{description}</p>
        {action && <div>{action}</div>}
      </div>
    );
  }
);
EmptyState.displayName = "EmptyState";
