import React from 'react';
import { cn } from './index';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, breadcrumbs, actions, className }) => {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center space-x-1.5 text-[12px] font-medium text-brand-gray/75">
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <React.Fragment key={index}>
                {item.href && !isLast ? (
                  <Link to={item.href} className="transition-colors hover:text-brand-primary">
                    {item.label}
                  </Link>
                ) : (
                  <span className={isLast ? 'text-brand-dark' : ''}>{item.label}</span>
                )}
                {!isLast && <ChevronRight className="mx-1 h-4 w-4" />}
              </React.Fragment>
            );
          })}
        </nav>
      )}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-brand-dark">
            {title}
          </h1>
          {description && <p className="mt-1 text-[14px] text-brand-gray">{description}</p>}
        </div>

        {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
};
