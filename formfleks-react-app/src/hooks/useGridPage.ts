import { useState, useCallback } from 'react';

/**
 * @hook useGridPage
 * @description Ortak CRUD (Listeleme, Ekleme, Düzenleme, Silme) sayfalarındaki state yönetimini tekilleştiren hook.
 * Çekmece (Drawer) durumu, seçili kayıt, silme onayı gibi state'leri yöneterek Users, Roles, Departments gibi sayfalardaki kod tekrarını engeller.
 */
export interface UseGridPageOptions {
  /** Formun sıfırlanması gerektiğinde çağrılır (Örn: çekmece kapandıktan sonra) */
  onResetForm?: () => void;
}

export function useGridPage<T extends { id: string }>(options?: UseGridPageOptions) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<T | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<T | null>(null);

  const isEditMode = selectedItem !== null;

  /** Çekmeceyi Ekleme (Create) modunda aç */
  const openCreate = useCallback(() => {
    setSelectedItem(null);
    options?.onResetForm?.();
    setIsDrawerOpen(true);
  }, [options]);

  /** Çekmeceyi Düzenleme (Edit) modunda aç */
  const openEdit = useCallback((item: T) => {
    setSelectedItem(item);
    setIsDrawerOpen(true);
  }, []);

  /** Çekmeceyi kapat ve seçimi sıfırla */
  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    setSelectedItem(null);
    options?.onResetForm?.();
  }, [options]);

  /** Silme işlemi için onay penceresini aç */
  const confirmDelete = useCallback((item: T) => {
    setItemToDelete(item);
    setIsConfirmOpen(true);
  }, []);

  /** Onay penceresini kapat */
  const cancelDelete = useCallback(() => {
    setIsConfirmOpen(false);
    setItemToDelete(null);
  }, []);

  /** Başarılı bir silme işleminden sonra çağrılır */
  const onDeleteSuccess = useCallback(() => {
    setIsConfirmOpen(false);
    setItemToDelete(null);
  }, []);

  /** Başarılı bir ekleme/güncelleme işleminden sonra çağrılır */
  const onSaveSuccess = useCallback(() => {
    setIsDrawerOpen(false);
    setSelectedItem(null);
    options?.onResetForm?.();
  }, [options]);

  return {
    // Çekmece (Drawer) durumu
    isDrawerOpen,
    selectedItem,
    isEditMode,
    openCreate,
    openEdit,
    closeDrawer,
    onSaveSuccess,

    // Onay penceresi (Confirm dialog) durumu
    isConfirmOpen,
    itemToDelete,
    confirmDelete,
    cancelDelete,
    onDeleteSuccess,
  };
}
