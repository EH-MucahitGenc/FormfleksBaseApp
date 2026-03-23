import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formService } from '@/services/form.service';
import { systemAdminService } from '@/services/system-admin.service';
import { queryKeys } from '@/lib/query-keys';
import { notify } from '@/lib/notifications';

// ─── Queries ─────────────────────────────────────────

export const useMyRequests = () =>
  useQuery({
    queryKey: queryKeys.forms.myRequests,
    queryFn: () => formService.getMyRequests(),
  });

export const usePendingApprovals = () =>
  useQuery({
    queryKey: queryKeys.forms.pendingApprovals,
    queryFn: () => formService.getPendingApprovals(),
  });

export const useFormDefinition = (formCode?: string) =>
  useQuery({
    queryKey: queryKeys.forms.template(formCode || 'default'),
    queryFn: () => systemAdminService.getTemplateDetailed(formCode || 'IT_REQ'),
    enabled: !!formCode,
  });

export const useFormDetail = (id: string) =>
  useQuery({
    queryKey: queryKeys.forms.detail(id),
    queryFn: () => formService.getRequestDetailed(id),
    enabled: !!id,
  });

// ─── Mutations ───────────────────────────────────────

export const useSubmitForm = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => formService.submitForm(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.forms.myRequests });
      notify.success('Form talebiniz başarıyla gönderildi.');
    },
    onError: (error: any) => {
      notify.error(error?.response?.data?.message || 'Form gönderilirken bir hata oluştu.');
    },
  });
};

export const useSaveDraft = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => formService.saveDraft(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.forms.myRequests });
      notify.success('Form taslak olarak başarıyla kaydedildi.');
    },
    onError: (error: any) => {
      notify.error(error?.response?.data?.message || 'Taslak kaydedilirken bir hata oluştu.');
    },
  });
};

export const useApprovalAction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: formService.executeApprovalAction,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.forms.pendingApprovals });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.urgentApprovals });

      if (variables.actionType === 1) notify.approved();
      else if (variables.actionType === 2) notify.rejected();
      else notify.returned();
    },
    onError: (error: any) => {
      notify.error(error?.response?.data?.message || 'İşlem sırasında bir hata oluştu.');
    },
  });
};
