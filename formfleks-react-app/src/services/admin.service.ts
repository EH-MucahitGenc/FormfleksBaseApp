import { apiClient } from '@/lib/axios';

export interface AdminUserDto {
  id: string;
  name: string;
  email: string;
  roles: string[];
  isActive: boolean;
  avatarUrl?: string;
}

export interface AdminRoleDto {
  id: string;
  code: string;
  name: string;
  active: boolean;
}

export interface PermissionDto {
  id: string;
  name: string;
  description: string;
}

// User Action DTOs
export interface UpdateUserRequest {
  displayName: string;
  roleIds?: string[];
  isActive?: boolean;
}

// Role Action DTOs
export interface CreateRoleCommand {
  code: string;
  name: string;
  active: boolean;
}
export type UpdateRoleCommand = CreateRoleCommand;



export const adminService = {
  // --- USERS ---
  getUsers: async (): Promise<AdminUserDto[]> => {
    const { data } = await apiClient.get<AdminUserDto[]>('/admin/users');
    return data;
  },
  
  updateUser: async (id: string, req: UpdateUserRequest): Promise<void> => {
    await apiClient.put(`/admin/users/${id}`, req);
  },
  
  deleteUser: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/users/${id}`);
  },

  // --- ROLES ---
  getRoles: async (): Promise<AdminRoleDto[]> => {
    const { data } = await apiClient.get<AdminRoleDto[]>('/admin/roles');
    return data;
  },

  createRole: async (req: CreateRoleCommand): Promise<void> => {
    await apiClient.post('/admin/roles', req);
  },

  updateRole: async (id: string, req: UpdateRoleCommand): Promise<void> => {
    await apiClient.put(`/admin/roles/${id}`, req);
  },

  deleteRole: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/roles/${id}`);
  },

  // --- PERMISSIONS ---
  getPermissions: async (): Promise<PermissionDto[]> => {
    const { data } = await apiClient.get<PermissionDto[]>('/admin/permissions');
    return data;
  },

  getRolePermissions: async (roleId: string): Promise<string[]> => {
    const { data } = await apiClient.get<string[]>(`/admin/roles/${roleId}/permissions`);
    return data;
  },

  updateRolePermissions: async (roleId: string, permissions: string[]): Promise<void> => {
    await apiClient.put(`/admin/roles/${roleId}/permissions`, permissions);
  },
};
