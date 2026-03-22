import React, { useCallback, useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useForm, FormProvider } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, Edit3, Building2 } from 'lucide-react';

import { PageHeader, FfButton, FfDrawer, FfStatusBadge, PageContainer, GlassCard } from '@/components/ui/index';
import { FfDataGrid } from '@/components/dev-extreme/FfDataGrid';
import { FfTextField, FormSection } from '@/components/dev-extreme/FfFormLayout';
import { adminService, type AdminDepartmentDto, type CreateDepartmentCommand, type UpdateDepartmentCommand } from '@/services/admin.service';

// --- SCHEMA & TYPES ---
const departmentSchema = z.object({
  code: z.string().min(2, 'Departman kodu en az 2 karakter olmalıdır'),
  name: z.string().min(2, 'Departman adı en az 2 karakter olmalıdır'),
  active: z.boolean()
});

type DepartmentFormValues = z.infer<typeof departmentSchema>;

export const Departments: React.FC = () => {
  const queryClient = useQueryClient();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<AdminDepartmentDto | null>(null);

  const methods = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: { code: '', name: '', active: true }
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: CreateDepartmentCommand) => adminService.createDepartment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminDepartments'] });
      setIsDrawerOpen(false);
      methods.reset();
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; payload: UpdateDepartmentCommand }) => 
      adminService.updateDepartment(data.id, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminDepartments'] });
      setIsDrawerOpen(false);
      methods.reset();
    }
  });

  // Handlers
  const handleOpenCreate = () => {
    setSelectedDept(null);
    methods.reset({ code: '', name: '', active: true });
    setIsDrawerOpen(true);
  };

  const handleEdit = (dept: AdminDepartmentDto) => {
    setSelectedDept(dept);
    methods.reset({ code: dept.code, name: dept.name, active: dept.active });
    setIsDrawerOpen(true);
  };

  const onSubmit = (data: DepartmentFormValues) => {
    if (selectedDept) {
      updateMutation.mutate({ id: selectedDept.id, payload: data });
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
    const d = cellData.data as AdminDepartmentDto;
    return (
      <div className="flex items-center gap-2">
        <button 
          onClick={() => handleEdit(d)}
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
    { dataField: 'code', caption: 'Departman Kodu', width: 200, cellRender: codeRender },
    { dataField: 'name', caption: 'Departman Adı', minWidth: 250 },
    { dataField: 'active', caption: 'Durum', width: 150, cellRender: statusRender, alignment: 'center' },
    { caption: 'İşlem', width: 100, cellRender: actionsRender, alignment: 'center', allowSorting: false, allowFiltering: false }
  ];

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <PageContainer>
      <PageHeader 
        title="Departman Yönetimi" 
        description="Kurumsal departmanları yönetin ve listeye yeni departmanlar ekleyin." 
        breadcrumbs={[
          { label: 'Anasayfa', href: '/' },
          { label: 'Sistem Yönetimi', href: '#' },
          { label: 'Departmanlar' }
        ]}
        actions={
          <FfButton 
            variant="primary" 
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={handleOpenCreate}
          >
            Yeni Departman
          </FfButton>
        }
      />

      <GlassCard noPadding className="mt-6 overflow-hidden">
        <FfDataGrid 
          queryKey={['adminDepartments']}
          fetchFn={adminService.getDepartments}
          columns={columns}
          pageSize={15}
          className="border-0"
        />
      </GlassCard>

      {/* Create/Edit Drawer */}
      <FfDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={selectedDept ? 'Departman Düzenle' : 'Yeni Departman Ekle'}
        subtitle={selectedDept ? `${selectedDept.name} detaylarını güncelliyorsunuz.` : 'Sisteme yeni bir kurumsal departman ekleyin.'}
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
            
            <div className="rounded-lg bg-status-info/10 p-4 border border-status-info/20 flex gap-3 text-status-info">
               <Building2 className="h-5 w-5 shrink-0" />
               <p className="text-sm">
                 Departman kodları genellikle departmanın ingilizce baş harfleri üzerinden kısaltılarak kullanılır. (Örn: <code className="font-mono bg-status-info/20 px-1 py-0.5 rounded">IT</code>, <code className="font-mono bg-status-info/20 px-1 py-0.5 rounded">HR</code>)
               </p>
            </div>

            <FormSection>
              <FfTextField 
                 name="code"
                 label="Departman Kodu"
                 placeholder="Örn: IT"
                 required
                 className="col-span-full"
              />
              <FfTextField 
                 name="name"
                 label="Departman Adı"
                 placeholder="Örn: Bilgi Teknolojileri"
                 required
                 className="col-span-full"
              />
              <div className="col-span-full flex items-center mt-2">
                 <input 
                   type="checkbox" 
                   id="dept-active" 
                   {...methods.register('active')}
                   className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                 />
                 <label htmlFor="dept-active" className="ml-2 block text-sm font-medium text-brand-dark">
                   Bu departman sistemde aktif olsun
                 </label>
              </div>
            </FormSection>
          </form>
        </FormProvider>
      </FfDrawer>
    </PageContainer>
  );
};
