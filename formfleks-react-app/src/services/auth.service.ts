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

    const { token, refreshToken, username: responseUsername, roles } = result;

    // Map AD user properties to React Store expected format
    const mockUser: User = {
      id: responseUsername || username, // Typically backend returns user GUID, fallback to AD username
      email: `${username}@formfleks.com`, // Just a placeholder if they didn't provide email
      firstName: username,
      lastName: '',
      roles: roles || [],
      avatarUrl: `https://ui-avatars.com/api/?name=${username.substring(0,2)}&background=f6894c&color=fff`
    };
    
    return {
      token,
      refreshToken,
      user: mockUser
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
