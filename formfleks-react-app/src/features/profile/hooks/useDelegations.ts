import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { delegationService } from '@/services/delegation.service';
import type { CreateUserDelegationRequest } from '@/services/delegation.service';
import toast from 'react-hot-toast';

export const useDelegations = () => {
  return useQuery({
    queryKey: ['my-delegations'],
    queryFn: () => delegationService.getMyDelegations(),
  });
};

export const useCreateDelegation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserDelegationRequest) => delegationService.createDelegation(data),
    onSuccess: () => {
      toast.success('Vekalet başarıyla oluşturuldu');
      queryClient.invalidateQueries({ queryKey: ['my-delegations'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Vekalet oluşturulurken bir hata oluştu');
    }
  });
};

export const useTerminateDelegation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => delegationService.terminateDelegation(id),
    onSuccess: () => {
      toast.success('Vekalet başarıyla sonlandırıldı');
      queryClient.invalidateQueries({ queryKey: ['my-delegations'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Vekalet sonlandırılırken bir hata oluştu');
    }
  });
};
