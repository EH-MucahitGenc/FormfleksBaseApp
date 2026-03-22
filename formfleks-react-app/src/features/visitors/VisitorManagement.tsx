import React, { useCallback, useState } from 'react';
import { PageHeader, FfButton, FfDrawer } from '@/components/ui/index';
import { FfDataGrid, FfDateBox } from '@/components/dev-extreme/index';
import { FfTextField, FormSection } from '@/components/dev-extreme/FfFormLayout';
import { Plus, Save } from 'lucide-react';
import { visitorService, type VisitorDto, type CreateVisitorRequestDto } from '@/services/visitor.service';
import { useForm, FormProvider } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';

// --- SCHEMA ---
const visitorSchema = z.object({
  firstName: z.string().min(2, 'Ad en az 2 karakter olmalıdır'),
  lastName: z.string().min(2, 'Soyad en az 2 karakter olmalıdır'),
  companyName: z.string().min(2, 'Firma adı zorunludur'),
  purpose: z.string().min(5, 'Ziyaret nedeni daha açıklayıcı olmalıdır'),
  visitDate: z.date()
});

export const VisitorManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Form Setup
  const methods = useForm<CreateVisitorRequestDto>({
    resolver: zodResolver(visitorSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      companyName: '',
      purpose: '',
      visitDate: new Date()
    }
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateVisitorRequestDto) => visitorService.createVisitor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
      setIsDrawerOpen(false);
      methods.reset();
    },
    onError: (err: any) => {
      setActionError(err.message || 'Ziyaretçi kaydedilirken bir hata oluştu.');
    }
  });

  const onSubmit = (data: CreateVisitorRequestDto) => {
    setActionError(null);
    createMutation.mutate(data);
  };

  const handleOpenDrawer = () => {
    methods.reset({ visitDate: new Date() });
    setActionError(null);
    setIsDrawerOpen(true);
  };

  // Grid Cell Renders
  const nameRender = useCallback((cellData: any) => {
    const item = cellData.data as VisitorDto;
    return <span className="font-semibold text-brand-dark">{item.firstName} {item.lastName}</span>;
  }, []);

  const dateRender = useCallback((cellData: any) => (
    <span className="text-sm text-brand-gray">{new Date(cellData.data.visitDate).toLocaleDateString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
  ), []);

  const columns = [
    { dataField: 'firstName', caption: 'Ad Soyad', minWidth: 200, cellRender: nameRender },
    { dataField: 'companyName', caption: 'Firma', minWidth: 250 },
    { dataField: 'purpose', caption: 'Ziyaret Nedeni', minWidth: 200 },
    { dataField: 'visitDate', caption: 'Ziyaret Tarihi', dataType: 'date', width: 180, cellRender: dateRender }
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <PageHeader 
        title="Ziyaretçi Listesi" 
        description="Firmamıza gelen ziyaretçilerin kaydı ve takibi." 
        className="shrink-0 mb-2"
        actions={
          <FfButton 
            variant="primary" 
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={handleOpenDrawer}
          >
            Yeni Ziyaretçi Ekle
          </FfButton>
        }
      />
      
      <div className="flex-1 min-h-0 bg-surface-base rounded-xl shadow-soft border border-surface-muted overflow-hidden flex flex-col">
        <FfDataGrid 
          queryKey={['visitors']}
          fetchFn={visitorService.getVisitors}
          columns={columns}
          pageSize={15}
        />
      </div>

      <FfDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Yeni Ziyaretçi Kaydı"
        subtitle="Kuruma giriş yapan ziyaretçinin bilgilerini doldurunuz."
        size="md"
        footer={
          <>
            <FfButton variant="ghost" onClick={() => setIsDrawerOpen(false)} disabled={createMutation.isPending}>İptal</FfButton>
            <FfButton 
               variant="primary" 
               leftIcon={<Save className="h-4 w-4" />}
               onClick={methods.handleSubmit(onSubmit)}
               isLoading={createMutation.isPending}
            >
              Kaydet
            </FfButton>
          </>
        }
      >
        <FormProvider {...methods}>
          <form className="flex flex-col gap-6" onSubmit={(e) => e.preventDefault()}>
            
            {actionError && (
               <div className="p-3 bg-status-danger/10 text-status-danger border border-status-danger/20 rounded-md text-sm">
                 {actionError}
               </div>
            )}

            <FormSection>
              <FfTextField 
                name="firstName"
                label="Ad"
                required
                className="col-span-full md:col-span-1"
              />
              <FfTextField 
                name="lastName"
                label="Soyad"
                required
                className="col-span-full md:col-span-1"
              />
              <FfTextField 
                name="companyName"
                label="Firma Adı"
                required
                className="col-span-full"
              />
              <FfDateBox 
                name="visitDate"
                label="Ziyaret Tarihi/Saati"
                required
                className="col-span-full"
              />
              <FfTextField 
                name="purpose"
                label="Ziyaret Nedeni"
                required
                className="col-span-full"
              />
            </FormSection>

          </form>
        </FormProvider>
      </FfDrawer>
    </div>
  );
};
