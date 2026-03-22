import React, { useCallback } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useForm, FormProvider } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, Edit3, ShieldX } from 'lucide-react';

import { PageHeader, FfButton, FfDrawer, FfStatusBadge, PageContainer, GlassCard, FfConfirmDialog } from '@/components/ui/index';
import { FfDataGrid, FfTextBox, FfField } from '@/components/dev-extreme/index';
import { adminService, type AdminRoleDto, type CreateRoleCommand, type UpdateRoleCommand } from '@/services/admin.service';
import { useGridPage } from '@/hooks/useGridPage';
import { queryKeys } from '@/lib/query-keys';
import { notify } from '@/lib/notifications';

// --- VALIDATION SCHEMA ---
const roleSchema = z.object({
  code: z.string().min(2, 'Rol kodu en az 2 karakter olmalıdır.').regex(/^[A-Z_]+$/, 'Kodu sadece büyük harfler ve alt çizgi ile yazınız.'),
  name: z.string().min(2, 'Rol adı en az 2 karakter olmalıdır.'),
  active: z.boolean()
});

type RoleFormValues = z.infer<typeof roleSchema>;

export const Roles: React.FC = () => {
  const queryClient = useQueryClient();

  const methods = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: { code: '', name: '', active: true },
    mode: 'onTouched'
  });

  // Abstracted Grid Page State (Drawer, Confirm Dialog, Edits)
  const {
    isDrawerOpen,
    selectedItem: selectedRole,
    isEditMode,
    openCreate,
    openEdit,
    closeDrawer,
    isConfirmOpen,
    itemToDelete,
    confirmDelete,
    cancelDelete
  } = useGridPage<AdminRoleDto>({
    onResetForm: () => methods.reset({ code: '', name: '', active: true })
  });

  // --- MUTATIONS ---
  const createMutation = useMutation({
    mutationFn: (data: CreateRoleCommand) => adminService.createRole(data),
    onSuccess: () => {
      notify.created('Rol');
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.roles });
      closeDrawer();
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; payload: UpdateRoleCommand }) => 
      adminService.updateRole(data.id, data.payload),
    onSuccess: () => {
      notify.updated('Rol');
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.roles });
      closeDrawer();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminService.deleteRole(id),
    onSuccess: () => {
      notify.deleted('Rol');
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.roles });
      cancelDelete();
    }
  });

  // --- HANDLERS ---
  const handleEdit = useCallback((role: AdminRoleDto) => {
    methods.reset({ code: role.code, name: role.name, active: role.active });
    openEdit(role);
  }, [methods, openEdit]);

  const onSubmit = (data: RoleFormValues) => {
    if (isEditMode && selectedRole) {
      updateMutation.mutate({ id: selectedRole.id, payload: data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDeleteConfirm = () => {
    if (itemToDelete) deleteMutation.mutate(itemToDelete.id);
  };

  // --- GRID RENDERERS ---
  const codeRender = useCallback((cellData: any) => (
    <span className="font-semibold text-brand-dark">{cellData.data.code}</span>
  ), []);

  const statusRender = useCallback((cellData: any) => (
    <FfStatusBadge status={cellData.data.active ? 1 : 2} dotMode />
  ), []);

  const actionsRender = useCallback((cellData: any) => {
    const r = cellData.data as AdminRoleDto;
    return (
      <div className="flex items-center gap-2">
        <button 
          onClick={() => handleEdit(r)}
          className="p-1.5 text-brand-gray hover:text-brand-primary hover:bg-brand-primary/10 rounded-md transition-colors"
          title="Düzenle"
        >
          <Edit3 className="h-4 w-4" />
        </button>
        <button 
          onClick={() => confirmDelete(r)}
          className="p-1.5 text-brand-gray hover:text-status-danger hover:bg-status-danger/10 rounded-md transition-colors"
          title="Sil"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    );
  }, [handleEdit, confirmDelete]);

  const columns = [
    { dataField: 'code', caption: 'Rol Kodu', width: 220, cellRender: codeRender },
    { dataField: 'name', caption: 'Rol Adı', minWidth: 250 },
    { dataField: 'active', caption: 'Durum', width: 140, cellRender: statusRender, alignment: 'center' },
    { caption: 'İşlem', width: 100, cellRender: actionsRender, alignment: 'center', allowSorting: false, allowFiltering: false }
  ];

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <PageContainer>
      <PageHeader 
        title="Rol Yönetimi" 
        description="Sistem yetki rolleri tanımlarını yapın ve durumlarını güncelleyin." 
        breadcrumbs={[
          { label: 'Anasayfa', href: '/' },
          { label: 'Sistem Yönetimi', href: '#' },
          { label: 'Roller' }
        ]}
        actions={
          <div className="flex items-center gap-3">
            <FfButton 
              variant="primary" 
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={openCreate}
            >
              Yeni Rol Ekle
            </FfButton>
          </div>
        }
      />

      <GlassCard noPadding className="mt-6 overflow-hidden">
        <FfDataGrid 
          queryKey={[...queryKeys.admin.roles]}
          fetchFn={adminService.getRoles}
          columns={columns}
          pageSize={15}
          className="border-0"
        />
      </GlassCard>

      {/* --- SIDE DRAWER FORM --- */}
      <FfDrawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        title={isEditMode ? 'Rol Düzenle' : 'Yeni Rol Ekle'}
        subtitle={isEditMode ? `${selectedRole?.name} detaylarını güncelliyorsunuz.` : 'Yeni bir sistem rolü oluşturun.'}
        size="md"
        footer={
          <>
            <FfButton variant="ghost" onClick={closeDrawer}>İptal</FfButton>
            <FfButton 
               variant="primary" 
               onClick={methods.handleSubmit(onSubmit)}
               isLoading={isPending}
            >
              Sisteme Kaydet
            </FfButton>
          </>
        }
      >
        <FormProvider {...methods}>
          <form className="flex flex-col gap-6 pt-2" onSubmit={(e) => e.preventDefault()}>
            
            <div className="rounded-xl bg-status-warning/10 p-4 border border-status-warning/20 flex gap-4 text-status-warning shadow-sm">
               <ShieldX className="h-6 w-6 shrink-0 mt-0.5" />
               <p className="text-sm leading-relaxed">
                 Rol kodunu sistemde benzersiz olarak, <strong>büyük harf ve alt çizgi</strong> (Örn: <code className="font-mono bg-status-warning/20 px-1 py-0.5 rounded text-xs select-all">HR_MANAGER</code>) formatında tanımlayınız. Bu kodlar workflow süreçlerini etkilemektedir.
               </p>
            </div>

            <div className="flex flex-col gap-5 bg-surface-ground p-5 rounded-xl border border-surface-muted/50">
              <FfField
                name="code"
                control={methods.control}
                component={FfTextBox}
                label="Rol Kodu"
                componentProps={{ placeholder: "Örn: SYS_ADMIN" }}
              />
              
              <FfField
                name="name"
                control={methods.control}
                component={FfTextBox}
                label="Rol Adı Yansıması"
                componentProps={{ placeholder: "Örn: Sistem Yöneticisi" }}
              />

              <div className="flex items-center mt-3 bg-white p-4 rounded-lg border border-surface-muted shadow-sm transition-all hover:border-brand-primary/30">
                 <input 
                   type="checkbox" 
                   id="role-active" 
                   {...methods.register('active')}
                   className="h-5 w-5 rounded border-gray-300 text-brand-primary focus:ring-brand-primary/50 cursor-pointer transition-colors"
                 />
                 <label htmlFor="role-active" className="ml-3 block text-sm font-semibold text-brand-dark cursor-pointer select-none">
                   Bu rol sistemde genel aktif olsun
                 </label>
              </div>
            </div>
          </form>
        </FormProvider>
      </FfDrawer>

      <FfConfirmDialog 
        isOpen={isConfirmOpen}
        onClose={cancelDelete}
        onConfirm={handleDeleteConfirm}
        title="Rolü Silmek İstediğinize Emin misiniz?"
        message={`${itemToDelete?.name} logiksel olarak silinecektir. Sistemde bu role sahip onay mekanizmaları zarar görebilir.`}
        confirmLabel="Evet, Kalıcı Olarak Sil"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </PageContainer>
  );
};

