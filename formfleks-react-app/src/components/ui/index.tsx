import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge tailwind classes safely
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Re-export all UI components from their individual files
export * from './FfButton';
export * from './FfCard';
export * from './FfStatusBadge';
export * from './EmptyState';
export * from './FfDrawer';
export * from './FfModal';
export * from './FfTabs';
export * from './FfConfirmDialog';
export * from './PageHeader';
export * from './PageContainer';
export * from './GlassCard';
