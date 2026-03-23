import React, { useEffect, useState } from 'react';
import { FfModal, FfButton } from '@/components/ui';
import { useForm, Controller } from 'react-hook-form';
import { FfSelectBox, FfDateBox, FfTextBox } from '@/components/dev-extreme';
import { CreateUserDelegationRequest } from '@/services/delegation.service';
import { useCreateDelegation } from '../hooks/useDelegations';
import { adminService } from '@/services/admin.service';

interface CreateDelegationModalProps {
  onClose: () => void;
}

export const CreateDelegationModal: React.FC<CreateDelegationModalProps> = ({ onClose }) => {
  const { control, handleSubmit, watch, formState: { errors } } = useForm<CreateUserDelegationRequest>({
    defaultValues: {
      delegateeUserId: '',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000).toISOString(),
      reason: ''
    }
  });

  const createMutation = useCreateDelegation();
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    adminService.getUsers().then(res => setUsers(res)).catch(() => {});
  }, []);

  const onSubmit = (data: CreateUserDelegationRequest) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  return (
    <FfModal
      isOpen={true}
      onClose={onClose}
      title="Yeni Vekalet Ekle"
    >
      <p className="text-sm text-brand-gray mb-6">Belirttiğiniz tarihler arasında form onaylarınız seçtiğiniz vekile yönlendirilecektir.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Controller
          name="delegateeUserId"
          control={control}
          rules={{ required: 'Lütfen bir vekil seçin' }}
          render={({ field }) => (
            <FfSelectBox
              label="Vekil (Devralan Kullanıcı)"
              items={users}
              displayExpr="adi"
              valueExpr="id"
              value={field.value}
              onValueChanged={(e: any) => field.onChange(e.value)}
              error={errors.delegateeUserId?.message}
            />
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <Controller
            name="startDate"
            control={control}
            rules={{ required: 'Başlangıç Tarihi zorunludur' }}
            render={({ field }) => {
              // @ts-ignore
              return <FfDateBox
                label="Başlangıç Tarihi"
                value={field.value}
                onValueChanged={(e: any) => field.onChange(e.value)}
                error={errors.startDate?.message}
                componentProps={{ type: "datetime" }}
              />;
            }}
          />

          <Controller
            name="endDate"
            control={control}
            rules={{ required: 'Bitiş Tarihi zorunludur' }}
            render={({ field }) => {
              // @ts-ignore
              return <FfDateBox
                label="Bitiş Tarihi"
                value={field.value}
                onValueChanged={(e: any) => field.onChange(e.value)}
                error={errors.endDate?.message}
                componentProps={{ type: "datetime", min: watch('startDate') }}
              />;
            }}
          />
        </div>

        <Controller
          name="reason"
          control={control}
          render={({ field }) => (
            <FfTextBox
              label="Gerekçe (Opsiyonel)"
              placeholder="Örn: Yıllık İzin, Raporlu vb."
              value={field.value}
              onValueChanged={(e: any) => field.onChange(e.value)}
            />
          )}
        />

        <div className="flex justify-end gap-3 mt-6">
          <FfButton type="button" variant="outline" onClick={onClose}>
            İptal
          </FfButton>
          <FfButton type="submit" variant="primary" isLoading={createMutation.isPending}>
            Kaydet
          </FfButton>
        </div>
      </form>
    </FfModal>
  );
};
