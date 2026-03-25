import React from 'react';
import { cn } from '@/components/ui';

export interface PremiumInputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label: string;
  helperText?: string;
  error?: string;
  multiline?: boolean;
  rows?: number;
}

export const PremiumInput = React.forwardRef<HTMLInputElement | HTMLTextAreaElement, PremiumInputProps>(
  ({ label, helperText, error, multiline, className, ...props }, ref) => {
    const Component = multiline ? 'textarea' : 'input';
    return (
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-brand-dark">{label}</label>
        <Component
          ref={ref as any}
          className={cn(
            "w-full px-4 py-2 bg-surface-base border rounded-lg text-sm text-brand-dark transition-all outline-none",
            error 
              ? "border-status-danger focus:ring-2 focus:ring-status-danger/20" 
              : "border-surface-muted focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20",
            className
          )}
          {...(props as any)}
        />
        {error ? (
          <p className="text-xs font-medium text-status-danger">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-brand-gray">{helperText}</p>
        ) : null}
      </div>
    );
  }
);
PremiumInput.displayName = 'PremiumInput';

export interface PremiumSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  helperText?: string;
  error?: string;
}

export const PremiumSelect = React.forwardRef<HTMLSelectElement, PremiumSelectProps>(
  ({ label, helperText, error, className, children, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-brand-dark">{label}</label>
        <select
          ref={ref}
          className={cn(
            "w-full px-4 py-2 bg-surface-base border rounded-lg text-sm text-brand-dark transition-all outline-none appearance-none",
            error 
              ? "border-status-danger focus:ring-2 focus:ring-status-danger/20" 
              : "border-surface-muted focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20",
            className
          )}
          {...props}
        >
          {children}
        </select>
        {error ? (
          <p className="text-xs font-medium text-status-danger">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-brand-gray">{helperText}</p>
        ) : null}
      </div>
    );
  }
);
PremiumSelect.displayName = 'PremiumSelect';

export interface PremiumCheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  helperText?: string;
  error?: string;
  onChange?: (checked: boolean) => void;
  checked?: boolean;
}

export const PremiumCheckbox = React.forwardRef<HTMLInputElement, PremiumCheckboxProps>(
  ({ label, helperText, error, className, onChange, checked, ...props }, ref) => {
    return (
      <div className="flex items-start gap-3 py-1">
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
          className={cn(
            "mt-1 h-4 w-4 rounded border-surface-muted text-brand-primary focus:ring-brand-primary/20 transition-colors",
            error && "border-status-danger",
            className
          )}
          {...props}
        />
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-brand-dark select-none">{label}</label>
          {error ? (
            <p className="text-xs font-medium text-status-danger">{error}</p>
          ) : helperText ? (
            <p className="text-xs text-brand-gray">{helperText}</p>
          ) : null}
        </div>
      </div>
    );
  }
);
PremiumCheckbox.displayName = 'PremiumCheckbox';
