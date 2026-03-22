import { useState, useCallback } from 'react';

/**
 * Formfleks V4 — useGridPage Hook
 * 
 * Encapsulates the common CRUD page state pattern shared by
 * Users, Roles, Departments, and similar admin grid pages.
 * 
 * Handles:
 * - Drawer open/close state
 * - Selected item tracking (for edit mode)
 * - Confirm dialog state (for delete)
 * - Create vs Edit mode detection
 */

export interface UseGridPageOptions {
  /** Called when reset is needed (e.g., after drawer close) */
  onResetForm?: () => void;
}

export function useGridPage<T extends { id: string }>(options?: UseGridPageOptions) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<T | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<T | null>(null);

  const isEditMode = selectedItem !== null;

  /** Open drawer in Create mode */
  const openCreate = useCallback(() => {
    setSelectedItem(null);
    options?.onResetForm?.();
    setIsDrawerOpen(true);
  }, [options]);

  /** Open drawer in Edit mode */
  const openEdit = useCallback((item: T) => {
    setSelectedItem(item);
    setIsDrawerOpen(true);
  }, []);

  /** Close drawer and reset selection */
  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    setSelectedItem(null);
    options?.onResetForm?.();
  }, [options]);

  /** Open confirm dialog for deletion */
  const confirmDelete = useCallback((item: T) => {
    setItemToDelete(item);
    setIsConfirmOpen(true);
  }, []);

  /** Close confirm dialog */
  const cancelDelete = useCallback(() => {
    setIsConfirmOpen(false);
    setItemToDelete(null);
  }, []);

  /** Called after successful delete mutation */
  const onDeleteSuccess = useCallback(() => {
    setIsConfirmOpen(false);
    setItemToDelete(null);
  }, []);

  /** Called after successful create/update mutation */
  const onSaveSuccess = useCallback(() => {
    setIsDrawerOpen(false);
    setSelectedItem(null);
    options?.onResetForm?.();
  }, [options]);

  return {
    // Drawer state
    isDrawerOpen,
    selectedItem,
    isEditMode,
    openCreate,
    openEdit,
    closeDrawer,
    onSaveSuccess,

    // Confirm dialog state
    isConfirmOpen,
    itemToDelete,
    confirmDelete,
    cancelDelete,
    onDeleteSuccess,
  };
}
