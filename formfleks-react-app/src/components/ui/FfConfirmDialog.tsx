import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { FfModal } from './FfModal';
import { FfButton } from './FfButton';

export interface FfConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

/**
 * @component FfConfirmDialog
 * @description Kritik veya geri alınamayan işlemlerden (Silme, İptal vb.) önce kullanıcıdan onay almak için kullanılan standart iletişim kutusu.
 * FfModal üzerine inşa edilmiştir.
 */
export const FfConfirmDialog: React.FC<FfConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'İşlemi Onayla',
  message = 'Bu işlemi gerçekleştirmek istediğinizden emin misiniz? Bu eylem geri alınamaz.',
  confirmLabel = 'Evet, Devam Et',
  cancelLabel = 'İptal',
  variant = 'danger',
  isLoading = false,
}) => {
  const iconColors = {
    danger: 'text-status-danger bg-status-danger/10',
    warning: 'text-status-warning bg-status-warning/10',
    info: 'text-status-info bg-status-info/10',
  };

  const buttonVariant = variant === 'danger' ? 'danger' : 'primary';

  return (
    <FfModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <FfButton variant="ghost" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </FfButton>
          <FfButton variant={buttonVariant} onClick={onConfirm} isLoading={isLoading}>
            {confirmLabel}
          </FfButton>
        </>
      }
    >
      <div className="flex flex-col items-center text-center gap-4 py-2">
        <div className={`p-4 rounded-full ${iconColors[variant]}`}>
          <AlertTriangle className="h-8 w-8" />
        </div>
        <p className="text-sm text-brand-gray leading-relaxed max-w-sm">{message}</p>
      </div>
    </FfModal>
  );
};
