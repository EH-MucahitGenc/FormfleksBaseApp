import { create } from 'zustand';
import { type AppSettingsDto } from '@/services/settings.service';
import { systemAdminService } from '@/services/system-admin.service';

interface SettingsState {
  appSettings: AppSettingsDto | null;
  isLoading: boolean;
  fetchSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  appSettings: null,
  isLoading: false,
  fetchSettings: async () => {
    set({ isLoading: true });
    try {
      // Direct call to system admin service to get AppSettings
      const data: any = await systemAdminService.getSystemSetting<any>('AppSettings');
      if (data && Object.keys(data).length > 0) {
        set({
          appSettings: {
            siteName: data.SiteName || '',
            siteUrl: data.SiteUrl || '',
            supportEmail: data.SupportEmail || '',
            maxUploadSizeMb: data.MaxUploadSizeMb || 25,
            allowedFileTypes: data.AllowedFileTypes || '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg',
            enableUserRegistration: data.EnableUserRegistration || false,
            maintenanceMode: data.MaintenanceMode || false
          }
        });
      } else {
        // Fallback
        set({
          appSettings: {
            siteName: 'Formfleks Kurumsal',
            siteUrl: 'http://localhost:3001',
            supportEmail: 'bt.destek@erkurtholding.com',
            maxUploadSizeMb: 25,
            allowedFileTypes: '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg',
            enableUserRegistration: false,
            maintenanceMode: false
          }
        });
      }
    } catch (error) {
      console.error('Failed to fetch AppSettings:', error);
    } finally {
      set({ isLoading: false });
    }
  }
}));
