import { api } from '@/lib/api';

export interface UserLocationRoleDto {
  id: string;
  userId: string;
  userFullName: string;
  userEmail: string;
  roleId: string;
  roleName: string;
  locationName: string | null;
  isGlobalManager: boolean;
  isActive: boolean;
}

export interface CreateLocationRolePayload {
  userId: string;
  roleId: string;
  locationNames: string[];
  isGlobalManager: boolean;
  isActive: boolean;
}

export interface UpdateLocationRolePayload {
  id: string;
  locationName: string | null;
  isGlobalManager: boolean;
  isActive: boolean;
}

export const locationRolesService = {
  getAll: async (): Promise<UserLocationRoleDto[]> => {
    const { data } = await api.get('/admin/user-location-roles');
    return data;
  },

  getDistinctLocations: async (): Promise<string[]> => {
    const { data } = await api.get('/admin/user-location-roles/distinct-locations');
    return data;
  },

  create: async (payload: CreateLocationRolePayload): Promise<{ id: string }> => {
    const { data } = await api.post('/admin/user-location-roles', payload);
    return data;
  },

  update: async (id: string, payload: UpdateLocationRolePayload): Promise<boolean> => {
    await api.put(`/admin/user-location-roles/${id}`, payload);
    return true;
  },

  delete: async (id: string): Promise<boolean> => {
    await api.delete(`/admin/user-location-roles/${id}`);
    return true;
  }
};
