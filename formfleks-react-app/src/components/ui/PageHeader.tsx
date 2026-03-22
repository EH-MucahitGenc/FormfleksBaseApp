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

/**
 * Enterprise V3 Page Header
 * Standardized header layout with breadcrumbs, title, description, and action bar.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, breadcrumbs, actions, className }) => {
  return (
    <div className={cn("flex flex-col gap-4 mb-6 lg:mb-8 animate-fade-in-up", className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center space-x-1.5 text-sm font-medium text-brand-gray/70">
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <React.Fragment key={index}>
                {item.href && !isLast ? (
                  <Link to={item.href} className="hover:text-brand-primary transition-colors">
                    {item.label}
                  </Link>
                ) : (
                  <span className={isLast ? "text-brand-dark" : ""}>{item.label}</span>
                )}
                {!isLast && <ChevronRight className="w-4 h-4 mx-1" />}
              </React.Fragment>
            );
          })}
        </nav>
      )}

      {/* Title & Actions Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-brand-dark via-brand-primary to-orange-400 bg-clip-text text-transparent drop-shadow-sm pb-1">
            {title}
          </h1>
          <p className="text-base text-brand-gray mt-1 font-medium">{description}</p>
        </div>
        
        {/* Action Buttons (Right Aligned) */}
        {actions && (
          <div className="flex items-center gap-3 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
