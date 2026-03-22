import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboard.service';
import { queryKeys } from '@/lib/query-keys';

// ─── Dashboard Queries ───────────────────────────────

export const useDashboardStats = () =>
  useQuery({
    queryKey: queryKeys.dashboard.stats,
    queryFn: () => dashboardService.getOverviewStats(),
  });

export const useDeptChart = () =>
  useQuery({
    queryKey: queryKeys.dashboard.deptChart,
    queryFn: () => dashboardService.getFormsByDepartmentChart(),
  });

export const useStatusChart = () =>
  useQuery({
    queryKey: queryKeys.dashboard.statusChart,
    queryFn: () => dashboardService.getFormsByStatusChart(),
  });

export const useRecentLogs = () =>
  useQuery({
    queryKey: queryKeys.dashboard.recentLogs,
    queryFn: () => dashboardService.getRecentActivityLogs(),
  });

export const useUrgentApprovals = () =>
  useQuery({
    queryKey: queryKeys.dashboard.urgentApprovals,
    queryFn: () => dashboardService.getUrgentPendingApprovals(),
  });
