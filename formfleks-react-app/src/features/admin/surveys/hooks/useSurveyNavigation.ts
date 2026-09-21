import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import { useAuthStore } from '@/store/useAuthStore';

interface SurveyNavigation {
  canDesign: boolean;
  canPublish: boolean;
  canManage: boolean;
  canViewResults: boolean;
}

export function useSurveyNavigation() {
  const { user, isAuthenticated, token } = useAuthStore();
  const enabled = !!user?.id && isAuthenticated && !!token;
  const query = useQuery({
    queryKey: ['surveyNavigation', user?.id],
    queryFn: async () => (await apiClient.get<SurveyNavigation>('/admin/surveys/campaigns/navigation-access')).data,
    enabled,
    staleTime: 10000,
    refetchInterval: 30000,
    retry: 1
  });
  // Never fall back to a role name or cached privileges after a failed check.
  const access = enabled && !query.isError ? query.data : undefined;
  return { ...query, access, canOpenCenter: !!(access?.canDesign || access?.canPublish || access?.canManage) };
}
