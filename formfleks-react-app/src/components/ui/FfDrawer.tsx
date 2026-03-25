import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from './index';

export interface FfDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnOutsideClick?: boolean;
}

export const FfDrawer: React.FC<FfDrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  size = 'md',
  children,
  footer,
  closeOnOutsideClick = true
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if the actual overlay background was clicked, not the drawer content
    if (closeOnOutsideClick && e.target === overlayRef.current) {
      onClose();
    }
  };

  const sizes = {
    sm: 'w-full md:w-[400px]',
    md: 'w-full md:w-[600px]',
    lg: 'w-full md:w-[800px]',
    xl: 'w-full md:w-[1000px]',
    full: 'w-full',
  };

  return createPortal(
    <div 
      className={cn(
        "fixed inset-0 z-[100] bg-surface-base/60 backdrop-blur-sm transition-opacity duration-300",
        isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )}
      ref={overlayRef}
      onClick={handleOverlayClick}
      aria-hidden={!isOpen}
    >
      <div 
        className={cn(
          "absolute top-0 right-0 h-full bg-surface-base shadow-2xl flex flex-col transition-transform duration-300 ease-in-out transform border-l border-surface-muted",
          sizes[size],
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        {/* Drawer Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-surface-muted bg-surface-ground">
          <div className="flex flex-col gap-1 pr-6">
            <h2 id="drawer-title" className="text-xl font-bold text-brand-dark tracking-tight leading-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm text-brand-gray">{subtitle}</p>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-brand-gray hover:text-brand-dark hover:bg-surface-muted rounded-full transition-colors flex-shrink-0"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {children}
        </div>

        {/* Drawer Footer (Fixed at bottom) */}
        {footer && (
          <div className="border-t border-surface-muted p-6 bg-surface-ground flex items-center justify-end gap-3 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body // Portalled to the end of the body to guarantee Z-Index layer priority over DevExtreme widgets
  );
};
