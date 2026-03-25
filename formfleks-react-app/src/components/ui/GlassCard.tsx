import React from 'react';
import { cn } from './index';

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  noPadding?: boolean;
}

/**
 * Enterprise V3 GlassCard
 * A premium, slightly blurred card component with soft shadows.
 * Base lego piece for all panels and dashboards.
 */
export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, children, noPadding = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-surface-base/90 backdrop-blur-lg border border-white/20 shadow-premium rounded-xl lg:rounded-2xl transition-all duration-300 animate-fade-in-up hover-lift",
          !noPadding && "p-6 lg:p-8",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
GlassCard.displayName = "GlassCard";
