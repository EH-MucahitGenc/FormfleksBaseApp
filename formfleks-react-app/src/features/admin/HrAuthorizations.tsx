import { useCallback, useMemo } from 'react';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, Edit3, ShieldX } from 'lucide-react';
import { CheckBox } from 'devextreme-react/check-box';
import { SelectBox } from 'devextreme-react/select-box';
import { TagBox } from 'devextreme-react/tag-box';


import { PageHeader, FfButton, FfDrawer, FfStatusBadge, PageContainer, GlassCard, FfConfirmDialog } from '@/components/ui/index';
import { FfDataGrid } from '@/components/dev-extreme/index';
import { hrAuthorizationsService, type SetHrAuthorizationsPayload } from '@/services/hr-authorizations.service';
import { adminService } from '@/services/admin.service';
import { useGridPage } from '@/hooks/useGridPage';
import { notify } from '@/lib/notifications';

// --- VALIDATION SCHEMA ---
const hrAuthSchema = z.object({
  userId: z.string().min(1, 'Kullanıcı seçimi zorunludur.'),
  isGlobalManager: z.boolean(),
  locations: z.array(z.string())
});

type HrAuthFormValues = z.infer<typeof hrAuthSchema>;

export default function HrAuthorizations() {
  const queryClient = useQueryClient();

  const methods = useForm<HrAuthFormValues>({
    resolver: zodResolver(hrAuthSchema),
    defaultValues: { userId: '', isGlobalManager: false, locations: [] },
    mode: 'onTouched'
  });

  const isGlobalManager = methods.watch('isGlobalManager');

  const { data: auths = [], isLoading: isLoadingAuths } = useQuery({
    queryKey: ['hrAuthorizations'],
    queryFn: hrAuthorizationsService.getAuthorizations
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['distinctLocations'],
    queryFn: hrAuthorizationsService.getDistinctLocations
  });

  const { data: users = [] } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: () => adminService.getUsers()
  });



  const {
    isDrawerOpen,
    selectedItem,
    isEditMode,
    openCreate,
    openEdit,
    closeDrawer,
    isConfirmOpen,
    itemToDelete,
    confirmDelete,
    cancelDelete
  } = useGridPage<any>({
    onResetForm: () => methods.reset({ userId: '', isGlobalManager: false, locations: [] })
  });

  const availableUsers = useMemo(() => {
    // 1. Sadece İK yetkisi/rolü verilmiş kullanıcıları filtrele
    let filtered = users.filter(u => 
      u.roles && u.roles.some(r => {
        const upper = r.toUpperCase();
        return upper.includes('IK') || upper.includes('HR') || upper.includes('İNSAN') || upper.includes('HUMAN') || upper === 'ADMIN';
      })
    );

    // 2. Yeni ekleme modundaysak, zaten atanmış olanları listeden çıkar (Düzenlemede kendi ismi kalsın)
    if (!isEditMode) {
      const assignedUserIds = new Set(auths.map(a => a.userId));
      filtered = filtered.filter(u => !assignedUserIds.has(u.id));
    }

    return filtered;
  }, [users, auths, isEditMode]);

  const setMutation = useMutation({
    mutationFn: (data: SetHrAuthorizationsPayload) => hrAuthorizationsService.setAuthorizations(data),
    onSuccess: () => {
      notify.updated('İK Yetkileri');
      queryClient.invalidateQueries({ queryKey: ['hrAuthorizations'] });
      closeDrawer();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => hrAuthorizationsService.deleteAuthorizations(userId),
    onSuccess: () => {
      notify.deleted('İK Yetkileri');
      queryClient.invalidateQueries({ queryKey: ['hrAuthorizations'] });
      cancelDelete();
    }
  });

  const gridData = useMemo(() => {
    const map = new Map<string, any>();
    auths.forEach(auth => {
      if (!map.has(auth.userId)) {
        map.set(auth.userId, {
          userId: auth.userId,
          userName: auth.userName,
          userEmail: auth.userEmail,
          isGlobalManager: auth.isGlobalManager,
          locations: [],
          active: auth.active
        });
      }
      if (auth.locationName) {
        map.get(auth.userId).locations.push(auth.locationName);
      }
    });
    return Array.from(map.values());
  }, [auths]);

  const handleEdit = useCallback((auth: any) => {
    methods.reset({ 
        userId: auth.userId, 
        isGlobalManager: auth.isGlobalManager, 
        locations: auth.locations 
    });
    openEdit(auth);
  }, [methods, openEdit]);

  const onSubmit = (data: HrAuthFormValues) => {
    if (!data.isGlobalManager && data.locations.length === 0) {
      notify.error('Lütfen en az bir şube seçin veya Global Yöneticisi olarak işaretleyin.');
      return;
    }
    setMutation.mutate(data);
  };

  const handleDeleteConfirm = () => {
    if (itemToDelete) deleteMutation.mutate(itemToDelete.userId);
  };

  const statusRender = useCallback((cellData: any) => (
    <FfStatusBadge status={cellData.data.active ? 1 : 2} dotMode />
  ), []);

  const typeRender = useCallback((cellData: any) => {
    return cellData.data.isGlobalManager ? (
      <span className="font-semibold text-brand-primary">Global Müdür</span>
    ) : (
      <span className="text-brand-gray">Şube İK Sorumlusu</span>
    );
  }, []);

  const actionsRender = useCallback((cellData: any) => {
    const r = cellData.data;
    return (
      <div className="flex items-center gap-2 justify-center">
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
          title="Pasife Al"
          disabled={!r.active}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    );
  }, [handleEdit, confirmDelete]);

  const isPending = setMutation.isPending;

  return (
    <PageContainer>
      <PageHeader 
        title="Şube / Lokasyon İK Yetkilendirmesi" 
        description="Kullanıcıları şubelere bağlayın veya Global İK Yöneticisi olarak atayın." 
        breadcrumbs={[
          { label: 'Anasayfa', href: '/' },
          { label: 'Yönetim', href: '#' },
          { label: 'İK Şube Yetkileri' }
        ]}
        actions={
          <div className="flex items-center gap-3">
            <FfButton 
              variant="primary" 
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={openCreate}
            >
              Yeni Yetki Ekle
            </FfButton>
          </div>
        }
      />

      <GlassCard noPadding className="mt-6 overflow-hidden">
        <FfDataGrid 
          dataSource={gridData}
          loading={isLoadingAuths}
          pageSize={15}
          className="border-0"
          columns={[
            { dataField: 'userName', caption: 'Kullanıcı' },
            { dataField: 'userEmail', caption: 'E-Posta' },
            { caption: 'Yetki Tipi', cellRender: typeRender, width: 180 },
            { dataField: 'locations', caption: 'Sorumlu Olduğu Şubeler', cellRender: (c: any) => c.data.locations.join(', ') },
            { dataField: 'active', caption: 'Durum', width: 140, cellRender: statusRender, alignment: 'center' },
            { caption: 'İşlem', width: 120, cellRender: actionsRender, alignment: 'center', allowSorting: false, allowFiltering: false }
          ]}
        />
      </GlassCard>

      <FfDrawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        title={isEditMode ? 'Yetkileri Düzenle' : 'Yeni Yetki Ekle'}
        subtitle={isEditMode ? `${selectedItem?.userName} için şube yetkilerini düzenliyorsunuz.` : 'Yeni bir İK yöneticisi yetkisi oluşturun.'}
        size="md"
        footer={
          <>
            <FfButton variant="ghost" onClick={closeDrawer}>İptal</FfButton>
            <FfButton 
               variant="primary" 
               onClick={methods.handleSubmit(onSubmit)}
               isLoading={isPending}
            >
              Kaydet
            </FfButton>
          </>
        }
      >
        <FormProvider {...methods}>
          <form className="flex flex-col gap-6 pt-2" onSubmit={(e) => e.preventDefault()}>
            
            <div className="rounded-xl bg-brand-primary/5 p-4 border border-brand-primary/20 flex gap-4 text-brand-dark shadow-sm">
               <ShieldX className="h-6 w-6 shrink-0 mt-0.5 text-brand-primary" />
               <p className="text-sm leading-relaxed text-brand-gray">
                 Global İK Yöneticileri şirket genelindeki tüm süreçleri izleyebilir. Şube bazlı İK yetkilileri sadece sorumlu oldukları lokasyonlardan gelen formları görebilir.
               </p>
            </div>

            <div className="flex flex-col gap-5 bg-surface-ground p-5 rounded-xl border border-surface-muted/50">
              
              <div>
                <label className="block text-sm font-semibold text-brand-dark mb-1.5">
                  Yetkilendirilecek Kullanıcı <span className="text-status-danger">*</span>
                </label>
                <Controller
                  name="userId"
                  control={methods.control}
                  render={({ field }: any) => (
                    <SelectBox
                      dataSource={availableUsers}
                      displayExpr="name"
                      valueExpr="id"
                      value={field.value}
                      onValueChanged={(e) => {
                        if (e.event) field.onChange(e.value);
                      }}
                      searchEnabled={true}
                      placeholder="Kullanıcı seçiniz..."
                      disabled={isEditMode}
                      className="w-full"
                    />
                  )}
                />
              </div>

              <div className="flex items-center bg-surface-base p-4 rounded-lg border border-surface-muted shadow-sm transition-all hover:border-brand-primary/30">
                <Controller
                  name="isGlobalManager"
                  control={methods.control}
                  render={({ field }: any) => (
                    <CheckBox
                      text="Global İK Yöneticisi (Tüm Şubeler)"
                      value={field.value}
                      onValueChanged={(e) => {
                        if (e.event) {
                          field.onChange(e.value);
                          if (e.value) methods.setValue('locations', []);
                        }
                      }}
                    />
                  )}
                />
              </div>

              {!isGlobalManager && (
                <div>
                  <label className="block text-sm font-semibold text-brand-dark mb-1.5">
                    Sorumlu Olduğu Şubeler <span className="text-status-danger">*</span>
                  </label>
                  <Controller
                    name="locations"
                    control={methods.control}
                    render={({ field }: any) => (
                      <TagBox
                        dataSource={locations}
                        value={field.value}
                        onValueChanged={(e) => {
                          if (e.event) field.onChange(e.value);
                        }}
                        searchEnabled={true}
                        placeholder="Şube seçiniz (Çoklu seçim yapılabilir)..."
                        showSelectionControls={true}
                        showMultiTagOnly={false}
                        className="w-full"
                      />
                    )}
                  />
                </div>
              )}

            </div>
          </form>
        </FormProvider>
      </FfDrawer>

      <FfConfirmDialog 
        isOpen={isConfirmOpen}
        onClose={cancelDelete}
        onConfirm={handleDeleteConfirm}
        title="Yetkileri Pasife Almak İstediğinize Emin misiniz?"
        message={`${itemToDelete?.userName} isimli kullanıcının tüm İK yetkileri pasife alınacaktır. Bu işlemden sonra yeni onay talepleri bu kullanıcının ekranına düşmeyecektir.`}
        confirmLabel="Evet, Pasife Al"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </PageContainer>
  );
}
