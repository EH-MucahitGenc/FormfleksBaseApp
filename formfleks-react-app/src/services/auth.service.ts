import { apiClient } from '@/lib/axios';
import { useAuthStore, type User } from '@/store/useAuthStore';

interface LoginResponse {
  token: string;
  refreshToken: string;
  user: User;
}

/**
 * @service authService
 * @description Kullanıcı girişi (Login), çıkışı (Logout) ve mevcut kullanıcı bilgilerini getirme işlemlerini (Authentication) yöneten API servis nesnesi.
 */
export const authService = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    // C# endpoint'i ApiCallResult sarmalayıcısını (wrapper) kullanır
    const response = await apiClient.post('/auth/ad-login', { 
      username, 
      password 
    });
    
    // API, veriyi { success, data } içinde değil, doğrudan JSON olarak döner.
    const result = response.data;
    
    // Eğer API başarısız olursa 4xx/5xx döner ve Axios otomatik olarak hata fırlatır.
    // Eğer buraya ulaştıysak, işlem başarılı demektir.
    if (!result || !result.token) {
       throw new Error('Geçersiz sunucu yanıtı: Token alınamadı.');
    }

    const { token, refreshToken, username: responseUsername, roles, permissions, userId, firstName, lastName } = result;

    // Arka yüzden (Backend) gelen gerçek kimlik bilgilerini kullan
    const authenticUser: User = {
      id: userId || responseUsername || username,
      email: `${username}@formfleks.com`,
      firstName: firstName || username,
      lastName: lastName || '',
      roles: roles || [],
      permissions: permissions || [],
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
      // Gelecek geliştirme: await apiClient.post('/auth/logout');
    } finally {
      useAuthStore.getState().logout();
    }
  },

  getCurrentUser: async () => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  }
};
