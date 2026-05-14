import { useCallback, useEffect } from 'react';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Edit3, Trash2 } from 'lucide-react';

import { PageHeader, FfButton, FfDrawer, FfStatusBadge, PageContainer, GlassCard, FfConfirmDialog } from '@/components/ui/index';
import { FfDataGrid } from '@/components/dev-extreme/index';
import { FfSelectBox, FfTagBox } from '@/components/dev-extreme/index';
import { FfField } from '@/components/dev-extreme/FfField';
import { locationRolesService, type UserLocationRoleDto, type CreateLocationRolePayload } from '@/services/location-roles.service';
import { adminService } from '@/services/admin.service';
import { useGridPage } from '@/hooks/useGridPage';
import { notify } from '@/lib/notifications';

const locationRoleSchema = z.object({
  userId: z.string().min(1, 'Kullanıcı seçimi zorunludur.'),
  roleId: z.string().min(1, 'Rol seçimi zorunludur.'),
  locationNames: z.array(z.string()).catch([]),
  locationName: z.string().nullable().optional(),
  isGlobalManager: z.boolean(),
  isActive: z.boolean()
});

type LocationRoleFormValues = z.infer<typeof locationRoleSchema>;

export default function LocationRoles() {
  const queryClient = useQueryClient();

  const methods = useForm<LocationRoleFormValues>({
    resolver: zodResolver(locationRoleSchema),
    defaultValues: { userId: '', roleId: '', locationNames: [], locationName: '', isGlobalManager: false, isActive: true },
    mode: 'onTouched'
  });

  const {
    isDrawerOpen,
    openCreate,
    openEdit,
    closeDrawer,
    isConfirmOpen,
    itemToDelete,
    confirmDelete,
    cancelDelete,
    isEditMode,
    selectedItem
  } = useGridPage<UserLocationRoleDto>({
    onResetForm: () => methods.reset({ userId: '', roleId: '', locationNames: [], locationName: '', isGlobalManager: false, isActive: true })
  });

  useEffect(() => {
    if (selectedItem) {
      methods.reset({
        userId: selectedItem.userId,
        roleId: selectedItem.roleId,
        locationName: selectedItem.locationName || '',
        locationNames: [],
        isGlobalManager: selectedItem.isGlobalManager,
        isActive: selectedItem.isActive
      });
    }
  }, [selectedItem, methods]);

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: adminService.getUsers
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: adminService.getRoles
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['distinct-locations'],
    queryFn: locationRolesService.getDistinctLocations
  });

  // --- MUTATIONS ---
  const createMutation = useMutation({
    mutationFn: (data: CreateLocationRolePayload) => locationRolesService.create(data),
    onSuccess: () => {
      notify.created('Yetkilendirme');
      queryClient.invalidateQueries({ queryKey: ['userLocationRoles'] });
      closeDrawer();
    },
    onError: () => notify.error('Ekleme işlemi başarısız.')
  });

  const updateMutation = useMutation({
    mutationFn: (data: {id: string} & import('@/services/location-roles.service').UpdateLocationRolePayload) => locationRolesService.update(data.id, data),
    onSuccess: () => {
      notify.success('Yetkilendirme başarıyla güncellendi.');
      queryClient.invalidateQueries({ queryKey: ['userLocationRoles'] });
      closeDrawer();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => locationRolesService.delete(id),
    onSuccess: () => {
      notify.success('Yetki başarıyla pasife alındı.');
      queryClient.invalidateQueries({ queryKey: ['userLocationRoles'] });
      cancelDelete();
    },
    onError: () => {
      notify.error('İşlem başarısız.');
      cancelDelete();
    }
  });

  const actionTemplate = useCallback((cellData: any) => {
    const data = cellData.data as UserLocationRoleDto;
    return (
      <div className="flex items-center justify-center gap-2">
        <button 
          onClick={() => openEdit(data)}
          className="p-1.5 text-brand-gray hover:text-brand-primary hover:bg-brand-primary/10 rounded-md transition-colors"
          title="Güncelle"
        >
          <Edit3 className="h-4 w-4" />
        </button>
        <button 
          onClick={() => confirmDelete(data)}
          className="p-1.5 text-brand-gray hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors"
          title="Pasife Al (Sil)"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    );
  }, [openEdit, confirmDelete]);

  // --- HANDLERS ---
  const onSubmit = (data: LocationRoleFormValues) => {
    if (isEditMode && selectedItem) {
      updateMutation.mutate({
        id: selectedItem.id,
        locationName: data.locationName || null,
        isGlobalManager: data.isGlobalManager,
        isActive: data.isActive
      });
    } else {
      createMutation.mutate({
        userId: data.userId,
        roleId: data.roleId,
        locationNames: data.locationNames,
        isGlobalManager: data.isGlobalManager,
        isActive: data.isActive
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (itemToDelete) {
      deleteMutation.mutate(itemToDelete.id);
    }
  };

  const statusTemplate = useCallback((cellData: any) => {
    const data = cellData.data as UserLocationRoleDto;
    return <FfStatusBadge status={data.isActive ? 1 : 2} dotMode />;
  }, []);

  const scopeTemplate = useCallback((cellData: any) => {
    const data = cellData.data as UserLocationRoleDto;
    return data.isGlobalManager ? 
        <span className="inline-flex items-center rounded-md bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10">Global (Tümü)</span> : 
        <span className="font-medium">{data.locationName}</span>;
  }, []);

  return (
    <PageContainer>
      <PageHeader 
        title="Lokasyon Yetkileri" 
        description="Kullanıcıların hangi lokasyonlarda hangi rollerle yetkili olduğunu yönetin." 
        actions={
          <FfButton variant="primary" onClick={() => openCreate()} leftIcon={<Plus className="h-4 w-4" />}>Yeni Ekle</FfButton>
        }
      />
      
      <GlassCard className="mt-6">
        <FfDataGrid
          queryKey={['userLocationRoles']}
          fetchFn={locationRolesService.getAll}
          columns={[
            { dataField: 'userFullName', caption: 'Kullanıcı', minWidth: 200 },
            { dataField: 'roleName', caption: 'Rol', minWidth: 150 },
            { dataField: 'locationName', caption: 'Kapsam', minWidth: 150, cellRender: scopeTemplate },
            { dataField: 'isActive', caption: 'Durum', width: 100, alignment: 'center', cellRender: statusTemplate },
            { caption: 'İşlemler', width: 100, alignment: 'center', allowSorting: false, allowFiltering: false, cellRender: actionTemplate }
          ]}
        />
      </GlassCard>

      {/* DRAWER FORM */}
      <FfDrawer isOpen={isDrawerOpen} onClose={closeDrawer} title="Yeni Yetkilendirme" size="md">
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit as any)} className="space-y-6 flex flex-col h-full">
            <div className="flex-1 overflow-y-auto space-y-6 p-1 scrollbar-thin">
              
              <FfField
                name="userId"
                control={methods.control as any}
                component={FfSelectBox}
                label="Kullanıcı"
                componentProps={{
                  dataSource: users,
                  valueExpr: "id",
                  displayExpr: "name",
                  searchEnabled: true,
                  placeholder: "Kullanıcı Seçiniz",
                  showClearButton: true,
                  disabled: isEditMode
                }}
              />

              <FfField
                name="roleId"
                control={methods.control as any}
                component={FfSelectBox}
                label="Rol"
                componentProps={{
                  dataSource: roles,
                  valueExpr: "id",
                  displayExpr: "name",
                  searchEnabled: true,
                  placeholder: "Rol Seçiniz",
                  showClearButton: true,
                  disabled: isEditMode
                }}
              />

              <div className="grid grid-cols-2 gap-4">
                <Controller name="isGlobalManager" render={({ field }) => (
                  <div className="flex items-center space-x-2 border rounded-md p-3">
                    <input
                      type="checkbox"
                      id="isGlobalManager"
                      className="rounded text-brand-primary focus:ring-brand-primary h-4 w-4 border-gray-300"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                    <label htmlFor="isGlobalManager" className="text-sm font-medium text-brand-dark">Tüm Şubelerde Geçerli (Global)</label>
                  </div>
                )} />
                
                <Controller name="isActive" render={({ field }) => (
                  <div className="flex items-center space-x-2 border rounded-md p-3">
                    <input
                      type="checkbox"
                      id="isActive"
                      className="rounded text-brand-primary focus:ring-brand-primary h-4 w-4 border-gray-300"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                    <label htmlFor="isActive" className="text-sm font-medium text-brand-dark">Aktif</label>
                  </div>
                )} />
              </div>

              {!methods.watch('isGlobalManager') && (
                isEditMode ? (
                  <FfField
                    name="locationName"
                    control={methods.control as any}
                    component={FfSelectBox}
                    label="Lokasyon / Şube Adı"
                    componentProps={{
                      dataSource: locations,
                      searchEnabled: true,
                      placeholder: "Lokasyon Seçiniz",
                      showClearButton: true
                    }}
                  />
                ) : (
                  <FfField
                    name="locationNames"
                    control={methods.control as any}
                    component={FfTagBox}
                    label="Lokasyon / Şube Adı"
                    componentProps={{
                      dataSource: locations,
                      searchEnabled: true,
                      placeholder: "Lokasyon Seçiniz (Çoklu Seçim)",
                      showClearButton: true
                    }}
                  />
                )
              )}

            </div>

            <div className="pt-6 border-t border-surface-muted flex justify-end gap-3 shrink-0">
              <FfButton type="button" variant="outline" onClick={closeDrawer}>İptal</FfButton>
              <FfButton type="submit" isLoading={createMutation.isPending || updateMutation.isPending}>Kaydet</FfButton>
            </div>
          </form>
        </FormProvider>
      </FfDrawer>

      {/* CONFIRM DIALOG */}
      <FfConfirmDialog
        isOpen={isConfirmOpen}
        title="Yetkiyi Pasife Al"
        message={`${itemToDelete?.userFullName} adlı kullanıcının ${itemToDelete?.roleName} yetkisini pasife almak (Soft Delete) istediğinize emin misiniz?`}
        confirmLabel="Evet, Pasife Al"
        onConfirm={handleDeleteConfirm}
        onClose={cancelDelete}
        isLoading={deleteMutation.isPending}
        variant="danger"
      />
    </PageContainer>
  );
}
