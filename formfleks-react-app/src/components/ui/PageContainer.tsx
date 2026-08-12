import React from 'react';
import { cn } from './index';

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  maxWidth?: 'md' | 'lg' | 'xl' | '7xl' | 'full';
}

export const PageContainer = React.forwardRef<HTMLDivElement, PageContainerProps>(
  ({ className, children, maxWidth = 'full', ...props }, ref) => {
    const maxWidthClasses = {
      md: 'max-w-screen-md',
      lg: 'max-w-screen-lg',
      xl: 'max-w-screen-xl',
      '7xl': 'max-w-[1600px]',
      full: 'max-w-none',
    };

    return (
      <main
        ref={ref}
        className={cn(
          'mx-auto w-full px-4 py-5 sm:px-6 lg:px-8 lg:py-6 transition-all duration-300',
          maxWidthClasses[maxWidth],
          className
        )}
        {...props}
      >
        <div className="flex h-full w-full flex-col gap-6">
          {children}
        </div>
      </main>
    );
  }
);
PageContainer.displayName = 'PageContainer';
