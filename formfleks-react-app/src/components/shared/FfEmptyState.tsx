import React from 'react';
import { FolderOpen } from 'lucide-react';
import { cn, FfButton } from '../ui';

interface FfEmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const FfEmptyState: React.FC<FfEmptyStateProps> = ({
  title = "Kayıt Bulunamadı",
  description = "Arama kriterlerinize uyan veya bu alanda henüz eklenmiş herhangi bir veri bulunmuyor.",
  icon,
  actionLabel,
  onAction,
  className
}) => {
  return (
    <div className={cn("w-full h-full min-h-[300px] flex flex-col items-center justify-center p-8 text-center bg-surface-base border border-surface-muted border-dashed rounded-xl", className)}>
      <div className="h-16 w-16 mb-4 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
        {icon || <FolderOpen className="h-8 w-8 opacity-80" strokeWidth={1.5} />}
      </div>
      
      <h3 className="text-lg font-semibold text-brand-dark mb-2">
        {title}
      </h3>
      
      <p className="text-sm text-brand-gray max-w-sm mb-6">
        {description}
      </p>

      {actionLabel && onAction && (
        <FfButton 
          variant="secondary" 
          onClick={onAction}
          className="shadow-sm"
        >
          {actionLabel}
        </FfButton>
      )}
    </div>
  );
};
