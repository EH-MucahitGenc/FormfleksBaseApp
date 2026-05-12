import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService, type UpdateUserRequest } from '@/services/admin.service';
import { queryKeys } from '@/lib/query-keys';
import { notify } from '@/lib/notifications';

// ─── Users ───────────────────────────────────────────

export const useUsers = () =>
  useQuery({
    queryKey: queryKeys.admin.users,
    queryFn: adminService.getUsers,
  });

export const useUpdateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserRequest }) =>
      adminService.updateUser(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.users });
      notify.updated('Kullanıcı');
    },
  });
};

export const useDeleteUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminService.deleteUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.users });
      notify.deleted('Kullanıcı');
    },
  });
};

// ─── Roles ───────────────────────────────────────────

export const useRoles = () =>
  useQuery({
    queryKey: queryKeys.admin.roles,
    queryFn: adminService.getRoles,
  });

export const useCreateRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminService.createRole,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.roles });
      notify.created('Rol');
    },
  });
};

export const useUpdateRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof adminService.updateRole>[1] }) =>
      adminService.updateRole(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.roles });
      notify.updated('Rol');
    },
  });
};

export const useDeleteRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminService.deleteRole(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.roles });
      notify.deleted('Rol');
    },
  });
};


