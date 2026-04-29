import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from './index';

export interface FfModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnOutsideClick?: boolean;
}

/**
 * @component FfModal
 * @description Ekranın ortasında açılan, arka planı bulanıklaştıran (glassmorphism) standart modal (iletişim kutusu) bileşeni.
 * ESC tuşuyla kapanma ve arkadaki kaydırma (scroll) çubuğunu kilitleme özelliklerine sahiptir.
 */
export const FfModal: React.FC<FfModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  size = 'md',
  children,
  footer,
  closeOnOutsideClick = true,
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  // ESC ile kapat
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Sayfa kaydırmasını (scroll) kilitle
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOutsideClick && e.target === overlayRef.current) onClose();
  };

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return createPortal(
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0f172a]/40 backdrop-blur-sm transition-all duration-300',
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      )}
      aria-hidden={!isOpen}
    >
      <div
        className={cn(
          'w-full bg-surface-base rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300',
          sizes[size],
          isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* Başlık */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-surface-muted">
          <div className="flex flex-col gap-1 pr-4">
            <h2 className="text-lg font-bold text-brand-dark tracking-tight">{title}</h2>
            {subtitle && <p className="text-sm text-brand-gray">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 -mt-1 text-brand-gray hover:text-brand-dark hover:bg-surface-muted rounded-full transition-colors shrink-0"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* İçerik */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {children}
        </div>

        {/* Alt Kısım */}
        {footer && (
          <div className="border-t border-surface-muted px-6 py-4 bg-surface-ground flex items-center justify-end gap-3 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
