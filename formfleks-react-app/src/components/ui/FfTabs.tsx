import React from 'react';
import { cn } from './index';

export interface FfTabItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
}

export interface FfTabsProps {
  items: FfTabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
}

/**
 * Enterprise V4 Tabs
 * Horizontal tab bar with animated active indicator, icon support,
 * and premium hover/focus states.
 */
export const FfTabs: React.FC<FfTabsProps> = ({ items, activeKey, onChange, className }) => {
  return (
    <div className={cn('flex items-center gap-1 border-b border-surface-muted', className)}>
      {items.map((item) => {
        const isActive = item.key === activeKey;
        return (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            className={cn(
              'relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 rounded-t-lg',
              isActive
                ? 'text-brand-primary'
                : 'text-brand-gray hover:text-brand-dark hover:bg-surface-muted/50'
            )}
          >
            {item.icon && <span className="shrink-0">{item.icon}</span>}
            {item.label}

            {/* Active indicator */}
            {isActive && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-brand-primary rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
};
