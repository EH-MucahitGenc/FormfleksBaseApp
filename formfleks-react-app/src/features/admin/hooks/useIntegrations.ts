import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { integrationsService } from '@/services/integrations.service';
import toast from 'react-hot-toast';

export const usePersonnelStats = () => {
  return useQuery({
    queryKey: ['personnelStats'],
    queryFn: () => integrationsService.getPersonnelStats(),
    refetchInterval: 60000 // Refetch every minute
  });
};

export const useSyncLogs = (page = 1, pageSize = 10) => {
  return useQuery({
    queryKey: ['syncLogs', page, pageSize],
    queryFn: () => integrationsService.getSyncLogs(page, pageSize),
    placeholderData: keepPreviousData
  });
};

export const usePersonnels = (page = 1, pageSize = 100, searchTerm?: string, isActive?: boolean) => {
  return useQuery({
    queryKey: ['qdmsPersonnels', page, pageSize, searchTerm, isActive],
    queryFn: () => integrationsService.getPersonnels(page, pageSize, searchTerm, isActive),
    placeholderData: keepPreviousData
  });
};

export const useTriggerSync = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => integrationsService.triggerSyncPersonnel(),
    onSuccess: (data) => {
      toast.success(data.message || 'Senkronizasyon başarıyla tamamlandı.');
      // Refresh stats & logs
      queryClient.invalidateQueries({ queryKey: ['personnelStats'] });
      queryClient.invalidateQueries({ queryKey: ['syncLogs'] });
      queryClient.invalidateQueries({ queryKey: ['qdmsPersonnels'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Senkronizasyon sırasında hata oluştu.');
    }
  });
};
