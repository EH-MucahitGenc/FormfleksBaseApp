import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader2 } from 'lucide-react';

/**
 * Utility function to merge tailwind classes safely
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ----------------------------------------------------------------------
// FfButton
// ----------------------------------------------------------------------

export interface FfButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const FfButton = React.forwardRef<HTMLButtonElement, FfButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading = false, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    
    const baseStyles = "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50 disabled:pointer-events-none disabled:opacity-50 rounded-lg";
    
    const variants = {
      primary: "bg-brand-primary text-white hover:bg-[#e0753a] shadow-sm",
      secondary: "bg-brand-dark text-white hover:bg-brand-gray shadow-sm",
      outline: "border-2 border-surface-muted bg-transparent hover:bg-surface-ground text-brand-dark",
      ghost: "bg-transparent hover:bg-surface-muted text-brand-dark",
      danger: "bg-status-danger text-white hover:bg-status-danger/90 shadow-sm",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs",
      md: "h-10 px-4 py-2 text-sm",
      lg: "h-12 px-8 text-base",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    );
  }
);
FfButton.displayName = "FfButton";

// ----------------------------------------------------------------------
// FfCard (SectionCard / Bento Box style)
// ----------------------------------------------------------------------

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

// ----------------------------------------------------------------------
// FfStatusBadge
// ----------------------------------------------------------------------

export interface FfStatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: 0 | 1 | 2 | 3; // 0: Draft, 1: Success, 2: Warning, 3: Danger (Matching Blazor ENUM)
  label?: string;
  dotMode?: boolean;
}

export const FfStatusBadge = React.forwardRef<HTMLSpanElement, FfStatusBadgeProps>(
  ({ className, status = 0, label, dotMode = false, ...props }, ref) => {
    
    // Status color mapping based on Tailwind theme we configured
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

// ----------------------------------------------------------------------
// EmptyState
// ----------------------------------------------------------------------

import { Inbox } from 'lucide-react';

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

// ----------------------------------------------------------------------
// PageHeader
// ----------------------------------------------------------------------

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ className, title, description, actions, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 md:py-6", className)} {...props}>
        <div>
          <h1 className="text-2xl font-bold text-brand-dark tracking-tight">{title}</h1>
          {description && <p className="text-sm text-brand-gray mt-1">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
      </div>
    );
  }
);
PageHeader.displayName = "PageHeader";

// ----------------------------------------------------------------------
// Export generic standalone UI components
// ----------------------------------------------------------------------
export * from './FfDrawer';
