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

// ─── Departments ─────────────────────────────────────

export const useDepartments = () =>
  useQuery({
    queryKey: queryKeys.admin.departments,
    queryFn: adminService.getDepartments,
  });

export const useCreateDepartment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminService.createDepartment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.departments });
      notify.created('Departman');
    },
  });
};

export const useUpdateDepartment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof adminService.updateDepartment>[1] }) =>
      adminService.updateDepartment(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.departments });
      notify.updated('Departman');
    },
  });
};

export const useDeleteDepartment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminService.deleteDepartment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.departments });
      notify.deleted('Departman');
    },
  });
};
