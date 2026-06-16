import { systemAdminService } from './system-admin.service';

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
  enabled: boolean;
  smtp: {
    host: string;
    port: number;
    enableSsl: boolean;
    username: string;
    password?: string;
    defaultFrom: string;
    timeoutSeconds: number;
    retryCount: number;
  }
}

export interface JwtSettingsDto {
  accessTokenMinutes: number;
  refreshTokenDays: number;
}

export interface WorkflowSettingsDto {
  approvalReminderTime: string;
  pendingApprovalThresholdHours: number;
  draftReminderTime: string;
  draftAutoDeleteThresholdDays: number;
  workflowErrorNotificationEmails: string;
}

export interface LdapSettingsDto {
  isActive: boolean;
  host: string;
  port: number;
  useSsl: boolean;
  domain: string;
  baseDn: string;
  serviceUserName?: string;
  servicePassword?: string;
}

export interface IntegrationSettingsDto {
  personnelSyncTime: string;
  personnelSyncErrorEmail: string;
}

class SettingsService {
  
  async getAppSettings(): Promise<AppSettingsDto> {
    const data: any = await systemAdminService.getSystemSetting<any>('AppSettings');
    if (data && Object.keys(data).length > 0) {
      return {
        siteName: data.SiteName || '',
        siteUrl: data.SiteUrl || '',
        supportEmail: data.SupportEmail || '',
        maxUploadSizeMb: data.MaxUploadSizeMb || 25,
        allowedFileTypes: data.AllowedFileTypes || '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg',
        enableUserRegistration: data.EnableUserRegistration || false,
        maintenanceMode: data.MaintenanceMode || false
      };
    }
    
    return {
      siteName: 'Formfleks Kurumsal',
      siteUrl: 'http://localhost:3001',
      supportEmail: 'bt.destek@erkurtholding.com',
      maxUploadSizeMb: 25,
      allowedFileTypes: '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg',
      enableUserRegistration: false,
      maintenanceMode: false
    };
  }

  async updateAppSettings(data: AppSettingsDto): Promise<boolean> {
    const payload = {
      SiteName: data.siteName,
      SiteUrl: data.siteUrl,
      SupportEmail: data.supportEmail,
      MaxUploadSizeMb: data.maxUploadSizeMb,
      AllowedFileTypes: data.allowedFileTypes,
      EnableUserRegistration: data.enableUserRegistration,
      MaintenanceMode: data.maintenanceMode
    };
    return systemAdminService.updateSystemSetting('AppSettings', payload);
  }

  async getEmailSettings(): Promise<EmailSettingsDto> {
    const data: any = await systemAdminService.getSystemSetting<any>('EmailSettings');
    if (data && Object.keys(data).length > 0) {
      return {
        enabled: data.Enabled,
        smtp: {
          host: data.Smtp?.Host || '',
          port: data.Smtp?.Port || 587,
          enableSsl: data.Smtp?.EnableSsl || false,
          username: data.Smtp?.Username || '',
          password: data.Smtp?.Password || '',
          defaultFrom: data.Smtp?.DefaultFrom || '',
          timeoutSeconds: data.Smtp?.TimeoutSeconds || 30,
          retryCount: data.Smtp?.RetryCount || 3
        }
      };
    }
    
    return {
      enabled: false,
      smtp: {
        host: 'smtp.office365.com',
        port: 587,
        enableSsl: true,
        username: 'no-reply@erkurtholding.com',
        defaultFrom: 'no-reply@erkurtholding.com',
        timeoutSeconds: 30,
        retryCount: 3
      }
    };
  }

  async updateEmailSettings(data: EmailSettingsDto): Promise<boolean> {
    const payload = {
      Enabled: data.enabled,
      Smtp: {
        Host: data.smtp.host,
        Port: Number(data.smtp.port),
        Username: data.smtp.username,
        Password: data.smtp.password,
        DefaultFrom: data.smtp.defaultFrom,
        EnableSsl: data.smtp.enableSsl,
        TimeoutSeconds: Number(data.smtp.timeoutSeconds),
        RetryCount: Number(data.smtp.retryCount)
      }
    };
    return systemAdminService.updateSystemSetting('EmailSettings', payload);
  }

  async getJwtSettings(): Promise<JwtSettingsDto> {
    const accMin = await systemAdminService.getSystemSetting<number>('Jwt:AccessTokenMinutes');
    const refDays = await systemAdminService.getSystemSetting<number>('Jwt:RefreshTokenDays');
    
    if (accMin && refDays) {
      return {
        accessTokenMinutes: accMin,
        refreshTokenDays: refDays
      };
    }
    
    return {
      accessTokenMinutes: 1440,
      refreshTokenDays: 2
    };
  }

  async updateJwtSettings(data: JwtSettingsDto): Promise<boolean> {
    await systemAdminService.updateSystemSetting('Jwt:AccessTokenMinutes', Number(data.accessTokenMinutes));
    await systemAdminService.updateSystemSetting('Jwt:RefreshTokenDays', Number(data.refreshTokenDays));
    return true;
  }

  async getWorkflowSettings(): Promise<WorkflowSettingsDto> {
    const data: any = await systemAdminService.getSystemSetting<any>('WorkflowRules');
    if (data && Object.keys(data).length > 0) {
      return {
        approvalReminderTime: data.ApprovalReminderTime || '10:00,15:00',
        pendingApprovalThresholdHours: data.PendingApprovalThresholdHours || 24,
        draftReminderTime: data.DraftReminderTime || '09:00',
        draftAutoDeleteThresholdDays: data.DraftAutoDeleteThresholdDays || 7,
        workflowErrorNotificationEmails: data.WorkflowErrorNotificationEmails || ''
      };
    }
    
    return {
      approvalReminderTime: '10:00,15:00',
      pendingApprovalThresholdHours: 24,
      draftReminderTime: '09:00',
      draftAutoDeleteThresholdDays: 7,
      workflowErrorNotificationEmails: ''
    };
  }

  async updateWorkflowSettings(data: WorkflowSettingsDto): Promise<boolean> {
    const payload = {
      ApprovalReminderTime: data.approvalReminderTime,
      PendingApprovalThresholdHours: Number(data.pendingApprovalThresholdHours),
      DraftReminderTime: data.draftReminderTime,
      DraftAutoDeleteThresholdDays: Number(data.draftAutoDeleteThresholdDays),
      WorkflowErrorNotificationEmails: data.workflowErrorNotificationEmails
    };
    return systemAdminService.updateSystemSetting('WorkflowRules', payload);
  }

  async getLdapSettings(): Promise<LdapSettingsDto> {
    const data: any = await systemAdminService.getSystemSetting<any>('LdapSettings');
    if (data && Object.keys(data).length > 0) {
      return {
        isActive: data.IsActive || false,
        host: data.Host || '',
        port: data.Port || 389,
        useSsl: data.UseSsl || false,
        domain: data.Domain || '',
        baseDn: data.BaseDn || '',
        serviceUserName: data.ServiceUserName || '',
        servicePassword: data.ServicePassword || ''
      };
    }
    
    return {
      isActive: false,
      host: '',
      port: 389,
      useSsl: false,
      domain: '',
      baseDn: '',
      serviceUserName: '',
      servicePassword: ''
    };
  }

  async updateLdapSettings(data: LdapSettingsDto): Promise<boolean> {
    const payload = {
      IsActive: data.isActive,
      Host: data.host,
      Port: data.port,
      UseSsl: data.useSsl,
      Domain: data.domain,
      BaseDn: data.baseDn,
      ServiceUserName: data.serviceUserName,
      ServicePassword: data.servicePassword
    };
    return systemAdminService.updateSystemSetting('LdapSettings', payload);
  }

  async getIntegrationSettings(): Promise<IntegrationSettingsDto> {
    const data: any = await systemAdminService.getSystemSetting<any>('IntegrationSettings');
    if (data && Object.keys(data).length > 0) {
      return {
        personnelSyncTime: data.PersonnelSyncTime || '02:00',
        personnelSyncErrorEmail: data.PersonnelSyncErrorEmail || ''
      };
    }
    
    return {
      personnelSyncTime: '02:00',
      personnelSyncErrorEmail: ''
    };
  }

  async updateIntegrationSettings(data: IntegrationSettingsDto): Promise<boolean> {
    const payload = {
      PersonnelSyncTime: data.personnelSyncTime,
      PersonnelSyncErrorEmail: data.personnelSyncErrorEmail
    };
    return systemAdminService.updateSystemSetting('IntegrationSettings', payload);
  }

  async testEmailConnection(_email: string): Promise<boolean> {
    // Backend API could implement a test endpoint, but for now we simulate
    return new Promise((resolve) => setTimeout(() => resolve(true), 800));
  }
}

export const settingsService = new SettingsService();
