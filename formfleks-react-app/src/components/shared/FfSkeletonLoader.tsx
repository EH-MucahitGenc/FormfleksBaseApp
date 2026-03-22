import React from 'react';
import { cn } from '../ui';

interface FfSkeletonLoaderProps {
  type?: 'text' | 'card' | 'grid' | 'avatar' | 'form';
  count?: number;
  className?: string;
}

export const FfSkeletonLoader: React.FC<FfSkeletonLoaderProps> = ({ 
  type = 'text', 
  count = 1, 
  className 
}) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <div className={cn("bg-white rounded-xl border border-surface-muted p-6 w-full flex flex-col gap-4 shadow-sm", className)}>
            <div className="flex justify-between items-start w-full">
              <div className="flex flex-col gap-2 w-1/2">
                <div className="h-4 skeleton-shimmer w-3/4"></div>
                <div className="h-3 skeleton-shimmer w-1/2"></div>
              </div>
              <div className="h-10 w-10 rounded-lg skeleton-shimmer shrink-0"></div>
            </div>
            <div className="h-8 skeleton-shimmer w-1/3 mt-2"></div>
            <div className="flex gap-2 items-center mt-2">
              <div className="h-3 skeleton-shimmer w-16"></div>
              <div className="h-3 skeleton-shimmer w-24"></div>
            </div>
          </div>
        );
      
      case 'grid':
        return (
          <div className={cn("bg-white rounded-xl border border-surface-muted flex flex-col w-full shadow-sm overflow-hidden", className)}>
             {/* Header */}
             <div className="h-14 border-b border-surface-muted bg-surface-ground/50 flex items-center px-4 gap-4">
                <div className="h-4 skeleton-shimmer w-1/4"></div>
                <div className="h-4 skeleton-shimmer w-1/4"></div>
                <div className="h-4 skeleton-shimmer w-1/4"></div>
             </div>
             {/* Rows */}
             {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-12 border-b border-surface-muted/30 flex items-center px-4 gap-4">
                    <div className="h-3 skeleton-shimmer w-1/4"></div>
                    <div className="h-3 skeleton-shimmer w-1/4"></div>
                    <div className="h-3 skeleton-shimmer w-1/4"></div>
                </div>
             ))}
          </div>
        );
      
      case 'form':
        return (
          <div className={cn("flex flex-col gap-6 w-full", className)}>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
               <div className="flex flex-col gap-2">
                 <div className="h-4 skeleton-shimmer w-1/4"></div>
                 <div className="h-10 skeleton-shimmer w-full"></div>
               </div>
               <div className="flex flex-col gap-2">
                 <div className="h-4 skeleton-shimmer w-1/3"></div>
                 <div className="h-10 skeleton-shimmer w-full"></div>
               </div>
               <div className="flex flex-col gap-2 md:col-span-2">
                 <div className="h-4 skeleton-shimmer w-1/5"></div>
                 <div className="h-24 skeleton-shimmer w-full"></div>
               </div>
             </div>
          </div>
        );
      
      case 'avatar':
        return <div className={cn("h-10 w-10 rounded-full skeleton-shimmer", className)}></div>;
      
      case 'text':
      default:
        return (
          <div className={cn("flex flex-col gap-2 w-full", className)}>
            <div className="h-4 skeleton-shimmer w-full"></div>
            <div className="h-4 skeleton-shimmer w-5/6"></div>
            <div className="h-4 skeleton-shimmer w-2/3"></div>
          </div>
        );
    }
  };

  if (count === 1) return renderSkeleton();

  return (
    <div className="flex flex-col gap-4 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <React.Fragment key={i}>
          {renderSkeleton()}
        </React.Fragment>
      ))}
    </div>
  );
};
