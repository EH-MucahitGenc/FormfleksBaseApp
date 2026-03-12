export interface AppSettingsDto {
  siteName: string;
  siteUrl: string;
  supportEmail: string;
  maxUploadSizeMb: number;
  allowedFileTypes: string;
  enableUserRegistration: boolean;
  maintenanceMode: boolean;
}

export interface EmailSettingsDto {
  smtpServer: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string; // usually masked or omitted in GET
  enableSsl: boolean;
  senderAddress: string;
  senderName: string;
}

export interface UserProfileDto {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  departmentName?: string;
  title?: string;
  profileImageUrl?: string;
  language: string;
  theme: 'light' | 'dark' | 'system';
  emailNotifications: boolean;
}

class SettingsService {
  // --- App & Email Settings (Admin/System Level) ---
  async getAppSettings(): Promise<AppSettingsDto> {
    return new Promise((resolve) => setTimeout(() => resolve({
      siteName: 'Formfleks Kurumsal',
      siteUrl: 'https://formfleks.erkurtholding.com',
      supportEmail: 'bt.destek@erkurtholding.com',
      maxUploadSizeMb: 25,
      allowedFileTypes: '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg',
      enableUserRegistration: false,
      maintenanceMode: false
    }), 400));
  }

  async updateAppSettings(_data: AppSettingsDto): Promise<boolean> {
    return new Promise((resolve) => setTimeout(() => resolve(true), 600));
  }

  async getEmailSettings(): Promise<EmailSettingsDto> {
    return new Promise((resolve) => setTimeout(() => resolve({
      smtpServer: 'smtp.office365.com',
      smtpPort: 587,
      smtpUser: 'no-reply@erkurtholding.com',
      smtpPass: '******',
      enableSsl: true,
      senderAddress: 'no-reply@erkurtholding.com',
      senderName: 'Formfleks Sistem'
    }), 400));
  }

  async updateEmailSettings(_data: EmailSettingsDto): Promise<boolean> {
    return new Promise((resolve) => setTimeout(() => resolve(true), 600));
  }

  async testEmailConnection(_email: string): Promise<boolean> {
    return new Promise((resolve) => setTimeout(() => resolve(true), 800));
  }

  // --- User Profile (Current User Level) ---
  async getUserProfile(): Promise<UserProfileDto> {
    return new Promise((resolve) => setTimeout(() => resolve({
      userId: 'mock-user-1',
      firstName: 'Mücahit',
      lastName: 'Genç',
      email: 'mucahit.genc@erkurtholding.com',
      departmentName: 'Bilgi Teknolojileri',
      title: 'Full Stack Developer',
      profileImageUrl: '',
      language: 'tr',
      theme: 'light',
      emailNotifications: true
    }), 400));
  }

  async updateUserProfile(_data: Partial<UserProfileDto>): Promise<boolean> {
    return new Promise((resolve) => setTimeout(() => resolve(true), 600));
  }

  async changePassword(_currentPass: string, _newPass: string): Promise<boolean> {
    return new Promise((resolve) => setTimeout(() => resolve(true), 800));
  }
}

export const settingsService = new SettingsService();
