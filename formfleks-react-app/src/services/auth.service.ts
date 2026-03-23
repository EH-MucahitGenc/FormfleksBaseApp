import { apiClient } from '@/lib/axios';
import { useAuthStore, type User } from '@/store/useAuthStore';

interface LoginResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export const authService = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    // The C# endpoint uses ApiCallResult wrapper
    const response = await apiClient.post('/auth/ad-login', { 
      username, 
      password 
    });
    
    // The API returns the raw JSON directly, not wrapped in { success, data }
    const result = response.data;
    
    // If the API failed it would return 4xx/5xx and Axios would throw an error automatically. 
    // If we reach here, it's successful.
    if (!result || !result.token) {
       throw new Error('Geçersiz sunucu yanıtı: Token alınamadı.');
    }

    const { token, refreshToken, username: responseUsername, roles, userId, firstName, lastName } = result;

    // Use authentic backend Identity values
    const authenticUser: User = {
      id: userId || responseUsername || username,
      email: `${username}@formfleks.com`,
      firstName: firstName || username,
      lastName: lastName || '',
      roles: roles || [],
      avatarUrl: `https://ui-avatars.com/api/?name=${(firstName || username).substring(0,2)}&background=f6894c&color=fff`
    };
    
    return {
      token,
      refreshToken,
      user: authenticUser
    };
  },

  logout: async () => {
    try {
      // Future: await apiClient.post('/auth/logout');
    } finally {
      useAuthStore.getState().logout();
    }
  },

  getCurrentUser: async () => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  }
};
