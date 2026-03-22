import toast from 'react-hot-toast';

/**
 * Formfleks V4 — Centralized Toast Notification System
 * 
 * Standardizes all user-facing notifications to ensure
 * consistency across the entire application.
 */

export const notify = {
  /** Generic success message */
  success: (message: string) => toast.success(message),

  /** Generic error message */
  error: (message: string) => toast.error(message),

  /** Standard CRUD success (entity name is auto-inserted) */
  saved: (entity: string) => toast.success(`${entity} başarıyla kaydedildi.`),
  created: (entity: string) => toast.success(`${entity} başarıyla oluşturuldu.`),
  updated: (entity: string) => toast.success(`${entity} başarıyla güncellendi.`),
  deleted: (entity: string) => toast.success(`${entity} başarıyla silindi.`),

  /** Approval-related */
  approved: () => toast.success('Talep başarıyla onaylandı.'),
  rejected: () => toast.success('Talep reddedildi.'),
  returned: () => toast.success('Talep revizyona iade edildi.'),

  /** Info-level notification */
  info: (message: string) => toast(message, { icon: 'ℹ️' }),

  /** Standard loading toast (returns dismiss function) */
  loading: (message: string = 'İşleminiz gerçekleştiriliyor...') => toast.loading(message),
};
