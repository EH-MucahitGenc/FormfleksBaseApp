import React from 'react';
import { FfCard } from '@/components/ui/index';
import { cn } from '@/components/ui/index';

export interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: {
    value: number; // e.g. 12 (means +12%) or -5 (means -5%)
    label?: string; // e.g. "geçen aya göre"
  };
  colorConfig?: 'primary' | 'success' | 'warning' | 'info';
  className?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon: Icon, trend, colorConfig = 'primary', className }) => {
  
  const colors = {
    primary: { bg: 'bg-brand-primary/10', text: 'text-brand-primary' },
    success: { bg: 'bg-status-success/10', text: 'text-status-success' },
    warning: { bg: 'bg-status-warning/10', text: 'text-status-warning' },
    info: { bg: 'bg-status-info/10', text: 'text-status-info' }
  };

  const theme = colors[colorConfig];

  return (
    <FfCard className={cn("relative overflow-hidden group", className)} noPadding>
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center mb-2", theme.bg, theme.text)}>
            <Icon className="h-6 w-6" />
          </div>
          {trend && (
            <div className={cn("flex items-center text-xs font-semibold px-2 py-1 rounded-full", trend.value >= 0 ? "bg-status-success/10 text-status-success" : "bg-status-danger/10 text-status-danger")}>
               {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
            </div>
          )}
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-brand-gray mb-1">{title}</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-brand-dark">{value}</span>
          </div>
          {trend?.label && <p className="text-xs text-brand-gray mt-2">{trend.label}</p>}
        </div>
      </div>
      
      {/* Decorative background flare */}
      <div className={cn("absolute -right-8 -bottom-8 h-32 w-32 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none", theme.bg)} />
    </FfCard>
  );
};
