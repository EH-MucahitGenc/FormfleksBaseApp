import React, { useCallback, useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useForm, FormProvider } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Shield, Trash2, Edit3, ShieldAlert } from 'lucide-react';

import { PageHeader, FfButton, FfDrawer, FfStatusBadge, PageContainer, GlassCard } from '@/components/ui/index';
import { FfDataGrid, FfSelectBox } from '@/components/dev-extreme/index';
import { FfTextField, FormSection } from '@/components/dev-extreme/FfFormLayout';
import { adminService, type AdminUserDto, type UpdateUserRequest } from '@/services/admin.service';

// --- SCHEMA & TYPES ---
const userSchema = z.object({
  displayName: z.string().min(2, 'Ad soyad en az 2 karakter olmalıdır'),
  roleId: z.string().min(1, 'Lütfen bir rol seçin'),
});

type UserFormValues = z.infer<typeof userSchema>;

export const Users: React.FC = () => {
  const queryClient = useQueryClient();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserDto | null>(null);
  
  // Modals for deletion would typically go here, but for brevity we'll focus on the Edit Drawer

  const methods = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      displayName: '',
      roleId: ''
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; payload: UpdateUserRequest }) => 
      adminService.updateUser(data.id, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      setIsDrawerOpen(false);
      methods.reset();
    }
  });

  const handleEdit = (user: AdminUserDto) => {
    setSelectedUser(user);
    // In a real app, map exact role ID. For mock, just use index logic.
    methods.reset({
      displayName: user.name,
      roleId: user.roles.includes('SysAdmin') ? '101' : '103'
    });
    setIsDrawerOpen(true);
  };

  const onSubmit = (data: UserFormValues) => {
    if (!selectedUser) return;
    updateMutation.mutate({
      id: selectedUser.id,
      payload: {
        displayName: data.displayName,
        roleIds: [data.roleId]
      }
    });
  };

  // --- Grid Renderers ---
  const nameRender = useCallback((cellData: any) => {
    const u = cellData.data as AdminUserDto;
    const initials = u.name.substring(0, 1).toUpperCase();
    return (
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-copper to-brand-copper-dark text-xs font-bold text-white shadow-sm ring-1 ring-white">
          {initials}
        </div>
        <span className="font-medium text-brand-dark">{u.name}</span>
      </div>
    );
  }, []);

  const rolesRender = useCallback((cellData: any) => {
    const u = cellData.data as AdminUserDto;
    return (
      <div className="flex flex-wrap gap-1">
        {u.roles.map((role) => (
          <span key={role} className="inline-flex items-center rounded-full border border-brand-copper/20 bg-brand-copper/10 px-2.5 py-0.5 text-xs font-semibold text-brand-copper-dark">
            {role}
          </span>
        ))}
      </div>
    );
  }, []);

  const statusRender = useCallback((cellData: any) => {
    return <FfStatusBadge status={cellData.data.isActive ? 1 : 2} dotMode />;
  }, []);

  const actionsRender = useCallback((cellData: any) => {
    const u = cellData.data as AdminUserDto;
    return (
      <div className="flex items-center gap-2">
        <button 
          onClick={() => handleEdit(u)}
          className="p-1.5 text-brand-gray hover:text-brand-primary hover:bg-brand-primary/10 rounded-md transition-colors"
          title="Kullanıcıyı Düzenle"
        >
          <Edit3 className="h-4 w-4" />
        </button>
        <button 
          className="p-1.5 text-brand-gray hover:text-status-danger hover:bg-status-danger/10 rounded-md transition-colors"
          title="Sil (Pasife Al)"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns = [
    { dataField: 'name', caption: 'Kullanıcı', minWidth: 250, cellRender: nameRender },
    { dataField: 'email', caption: 'E-Posta', minWidth: 220 },
    { dataField: 'roles', caption: 'Rol / Yetki Grupları', minWidth: 200, cellRender: rolesRender, allowFiltering: false, allowSorting: false },
    { dataField: 'isActive', caption: 'Durum', width: 120, cellRender: statusRender, alignment: 'center' },
    { caption: 'İşlem', width: 100, cellRender: actionsRender, alignment: 'center', allowSorting: false, allowFiltering: false }
  ];

  return (
    <PageContainer>
      <PageHeader 
        title="Kullanıcı Yönetimi" 
        description="Sistemdeki tüm kullanıcıları, rollerini ve durumlarını yönetin." 
        breadcrumbs={[
          { label: 'Anasayfa', href: '/' },
          { label: 'Sistem Yönetimi', href: '#' },
          { label: 'Kullanıcılar' }
        ]}
      />

      <GlassCard noPadding className="mt-6 overflow-hidden">
        <FfDataGrid 
          queryKey={['adminUsers']}
          fetchFn={adminService.getUsers}
          columns={columns}
          pageSize={15}
          className="border-0"
        />
      </GlassCard>

      {/* Edit Drawer */}
      <FfDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-brand-primary" />
            Kullanıcı Yetkilerini Düzenle
          </div>
        }
        subtitle={`${selectedUser?.email} hesap erişim ve yetki tanımlarını güncelliyorsunuz.`}
        size="md"
        footer={
          <>
            <FfButton variant="ghost" onClick={() => setIsDrawerOpen(false)}>İptal</FfButton>
            <FfButton 
               variant="primary" 
               onClick={methods.handleSubmit(onSubmit)}
               isLoading={updateMutation.isPending}
            >
              Yetkileri Kaydet
            </FfButton>
          </>
        }
      >
        <FormProvider {...methods}>
          <form className="flex flex-col gap-6" onSubmit={(e) => e.preventDefault()}>
            
            <div className="rounded-lg bg-status-info/10 p-4 border border-status-info/20 flex gap-3 text-status-info">
               <ShieldAlert className="h-5 w-5 shrink-0" />
               <p className="text-sm">
                 Kullanıcı rol seviyelerini değiştirmeniz, kişinin yetkili olduğu modüllere anında etki eder. 
                 E-Posta adresini buradan değiştiremezsiniz, domain bazlı otomatik atanmaktadır.
               </p>
            </div>

            <FormSection>
              <FfTextField 
                 name="displayName"
                 label="Ad Soyad"
                 required
                 className="col-span-full"
              />
              <FfSelectBox 
                 name="roleId"
                 label="Yetki / Rol"
                 required
                 dataSource={[
                   { id: '101', name: 'Sistem Yöneticisi' },
                   { id: '102', name: 'Departman Yöneticisi' },
                   { id: '103', name: 'Standart Kullanıcı' },
                 ]}
                 displayExpr="name"
                 valueExpr="id"
                 className="col-span-full"
              />
            </FormSection>
          </form>
        </FormProvider>
      </FfDrawer>
    </PageContainer>
  );
};
