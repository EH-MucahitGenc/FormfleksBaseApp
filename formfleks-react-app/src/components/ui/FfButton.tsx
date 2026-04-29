import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from './index';

export interface FfButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

/**
 * @component FfButton
 * @description Uygulama genelinde standartlaşmış buton bileşeni. Yükleniyor (loading) durumu, ikon desteği ve farklı varyasyonları (primary, danger vb.) barındırır.
 */
export const FfButton = React.forwardRef<HTMLButtonElement, FfButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading = false, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    
    const baseStyles = "inline-flex items-center justify-center font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50 disabled:pointer-events-none disabled:opacity-50 rounded-lg active:scale-[0.97]";
    
    const variants = {
      primary: "bg-brand-primary text-white hover:bg-[#e0753a] shadow-sm hover:shadow-md",
      secondary: "bg-[#0f172a] text-white hover:bg-brand-gray shadow-sm",
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
