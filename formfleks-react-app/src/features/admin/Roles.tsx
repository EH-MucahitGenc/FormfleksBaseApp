import React, { useCallback, useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useForm, FormProvider } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, Edit3, ShieldX } from 'lucide-react';

import { PageHeader, FfButton, FfDrawer, FfStatusBadge } from '@/components/ui/index';
import { FfDataGrid } from '@/components/dev-extreme/FfDataGrid';
import { FfTextField, FormSection } from '@/components/dev-extreme/FfFormLayout';
import { adminService, type AdminRoleDto, type CreateRoleCommand, type UpdateRoleCommand } from '@/services/admin.service';

// --- SCHEMA & TYPES ---
const roleSchema = z.object({
  code: z.string().min(2, 'Rol kodu en az 2 karakter olmalıdır').regex(/^[A-Z_]+$/, 'Kodu sadece büyük harfler ve alt çizgi ile yazınız'),
  name: z.string().min(2, 'Rol adı en az 2 karakter olmalıdır'),
  active: z.boolean()
});

type RoleFormValues = z.infer<typeof roleSchema>;

export const Roles: React.FC = () => {
  const queryClient = useQueryClient();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AdminRoleDto | null>(null);

  const methods = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: { code: '', name: '', active: true }
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: CreateRoleCommand) => adminService.createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRoles'] });
      setIsDrawerOpen(false);
      methods.reset();
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; payload: UpdateRoleCommand }) => 
      adminService.updateRole(data.id, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRoles'] });
      setIsDrawerOpen(false);
      methods.reset();
    }
  });

  // Handlers
  const handleOpenCreate = () => {
    setSelectedRole(null);
    methods.reset({ code: '', name: '', active: true });
    setIsDrawerOpen(true);
  };

  const handleEdit = (role: AdminRoleDto) => {
    setSelectedRole(role);
    methods.reset({ code: role.code, name: role.name, active: role.active });
    setIsDrawerOpen(true);
  };

  const onSubmit = (data: RoleFormValues) => {
    if (selectedRole) {
      updateMutation.mutate({ id: selectedRole.id, payload: data });
    } else {
      createMutation.mutate(data);
    }
  };

  // --- Grid Renderers ---
  const codeRender = useCallback((cellData: any) => (
    <span className="font-semibold text-brand-dark">{cellData.data.code}</span>
  ), []);

  const statusRender = useCallback((cellData: any) => {
    return <FfStatusBadge status={cellData.data.active ? 1 : 2} dotMode />;
  }, []);

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
          className="p-1.5 text-brand-gray hover:text-status-danger hover:bg-status-danger/10 rounded-md transition-colors"
          title="Sil"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns = [
    { dataField: 'code', caption: 'Rol Kodu', width: 200, cellRender: codeRender },
    { dataField: 'name', caption: 'Rol Adı', minWidth: 250 },
    { dataField: 'active', caption: 'Durum', width: 150, cellRender: statusRender, alignment: 'center' },
    { caption: 'İşlem', width: 100, cellRender: actionsRender, alignment: 'center', allowSorting: false, allowFiltering: false }
  ];

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <PageHeader 
        title="Rol Yönetimi" 
        description="Sistem yetki rolleri tanımlarını yapın ve durumlarını güncelleyin." 
        className="shrink-0 mb-4"
        actions={
          <FfButton 
            variant="primary" 
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={handleOpenCreate}
          >
            Yeni Rol Ekle
          </FfButton>
        }
      />

      <div className="flex-1 min-h-0 bg-surface-base rounded-xl shadow-soft border border-surface-muted overflow-hidden flex flex-col">
        <FfDataGrid 
          queryKey={['adminRoles']}
          fetchFn={adminService.getRoles}
          columns={columns}
          pageSize={15}
        />
      </div>

      {/* Create/Edit Drawer */}
      <FfDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={selectedRole ? 'Rol Düzenle' : 'Yeni Rol Ekle'}
        subtitle={selectedRole ? `${selectedRole.name} detaylarını güncelliyorsunuz.` : 'Yeni bir sistem rolü oluşturun.'}
        size="sm"
        footer={
          <>
            <FfButton variant="ghost" onClick={() => setIsDrawerOpen(false)}>İptal</FfButton>
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
          <form className="flex flex-col gap-6" onSubmit={(e) => e.preventDefault()}>
            
            <div className="rounded-lg bg-status-warning/10 p-4 border border-status-warning/20 flex gap-3 text-status-warning">
               <ShieldX className="h-5 w-5 shrink-0" />
               <p className="text-sm">
                 Rol kodunu sistemde benzersiz olarak, büyük harf ve alt çizgi (Örn: <code className="font-mono bg-status-warning/20 px-1 py-0.5 rounded">HR_MANAGER</code>) formatında tanımlayınız.
               </p>
            </div>

            <FormSection>
              <FfTextField 
                 name="code"
                 label="Rol Kodu"
                 placeholder="Örn: SYS_ADMIN"
                 required
                 className="col-span-full"
              />
              <FfTextField 
                 name="name"
                 label="Rol Adı"
                 placeholder="Örn: Sistem Yöneticisi"
                 required
                 className="col-span-full"
              />
              <div className="col-span-full flex items-center mt-2">
                 <input 
                   type="checkbox" 
                   id="role-active" 
                   {...methods.register('active')}
                   className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                 />
                 <label htmlFor="role-active" className="ml-2 block text-sm font-medium text-brand-dark">
                   Bu rol sistemde aktif olsun
                 </label>
              </div>
            </FormSection>
          </form>
        </FormProvider>
      </FfDrawer>
    </div>
  );
};
