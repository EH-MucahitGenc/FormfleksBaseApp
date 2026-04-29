import React from 'react';
import { cn } from './index';

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  maxWidth?: 'md' | 'lg' | 'xl' | '7xl' | 'full';
}

/**
 * @component PageContainer
 * @description Tüm sayfaların (Route) tutarlı padding, genişlik ve giriş animasyonlarına sahip olmasını sağlayan temel sarmalayıcı (wrapper) bileşen.
 */
export const PageContainer = React.forwardRef<HTMLDivElement, PageContainerProps>(
  ({ className, children, maxWidth = 'full', ...props }, ref) => {
    
    // Genişlik sınıflarını eşleştir
    const maxWidthClasses = {
      'md': 'max-w-screen-md',
      'lg': 'max-w-screen-lg',
      'xl': 'max-w-screen-xl',
      '7xl': 'max-w-7xl',
      'full': 'max-w-full'
    };

    return (
      <main
        ref={ref}
        className={cn(
          "mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 lg:py-8 transition-all duration-300 animate-fade-in-up", 
          maxWidthClasses[maxWidth],
          className
        )}
        {...props}
      >
        <div className="flex flex-col gap-6 w-full h-full">
           {children}
        </div>
      </main>
    );
  }
);
PageContainer.displayName = "PageContainer";
