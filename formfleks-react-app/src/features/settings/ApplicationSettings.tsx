import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { PageHeader, FfButton, PageContainer, GlassCard } from '@/components/ui/index';
import { PremiumInput, PremiumCheckbox } from '@/components/forms';
import toast from 'react-hot-toast';
import { settingsService, type AppSettingsDto, type EmailSettingsDto, type JwtSettingsDto, type WorkflowSettingsDto, type LdapSettingsDto } from '@/services/settings.service';
import { Save, Server, Mail, ShieldAlert, CheckCircle, RefreshCcw, Key, GitMerge } from 'lucide-react';

export const ApplicationSettings: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'app' | 'email' | 'jwt' | 'workflow'>('app');
  const [testEmailStatus, setTestEmailStatus] = useState<{ loading: boolean; success?: boolean; error?: string }>({ loading: false });

  // -- QUERIES --
  const { data: appData, isLoading: appLoading } = useQuery({ queryKey: ['app-settings'], queryFn: () => settingsService.getAppSettings() });
  const { data: emailData, isLoading: emailLoading } = useQuery({ queryKey: ['email-settings'], queryFn: () => settingsService.getEmailSettings() });
  const { data: jwtData, isLoading: jwtLoading } = useQuery({ queryKey: ['jwt-settings'], queryFn: () => settingsService.getJwtSettings() });
  const { data: ldapData, isLoading: ldapLoading } = useQuery({ queryKey: ['ldap-settings'], queryFn: () => settingsService.getLdapSettings() });
  const { data: workflowData, isLoading: workflowLoading } = useQuery({ queryKey: ['workflow-settings'], queryFn: () => settingsService.getWorkflowSettings() });

  // -- MUTATIONS --
  const appMutation = useMutation({
    mutationFn: (data: AppSettingsDto) => settingsService.updateAppSettings(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['app-settings'] }); toast.success('Genel ayarlar kaydedildi.'); },
  });

  const emailMutation = useMutation({
    mutationFn: (data: EmailSettingsDto) => settingsService.updateEmailSettings(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['email-settings'] }); toast.success('E-posta ayarları kaydedildi.'); },
  });

  const jwtMutation = useMutation({
    mutationFn: (data: JwtSettingsDto) => settingsService.updateJwtSettings(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['jwt-settings'] }); toast.success('JWT ayarları kaydedildi.'); },
  });

  const ldapMutation = useMutation({
    mutationFn: (data: LdapSettingsDto) => settingsService.updateLdapSettings(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ldap-settings'] }); toast.success('Active Directory ayarları kaydedildi.'); },
  });

  const workflowMutation = useMutation({
    mutationFn: (data: WorkflowSettingsDto) => settingsService.updateWorkflowSettings(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['workflow-settings'] }); toast.success('İş akışı kuralları kaydedildi.'); },
  });

  const handleTestEmail = async (email: string) => {
    setTestEmailStatus({ loading: true });
    try {
      await settingsService.testEmailConnection(email);
      setTestEmailStatus({ loading: false, success: true });
      setTimeout(() => setTestEmailStatus({ loading: false }), 4000);
    } catch (e: any) {
      setTestEmailStatus({ loading: false, success: false, error: e.message || 'Bağlantı hatası' });
    }
  };

  if (appLoading || emailLoading || jwtLoading || workflowLoading || ldapLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Sistem Ayarları"
        description="Uygulama genel davranışlarını, güvenlik, e-posta ve iş akışı kurallarını yapılandırın."
        breadcrumbs={[
          { label: 'Anasayfa', href: '/' },
          { label: 'Ayarlar', href: '#' },
          { label: 'Sistem' }
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Nav */}
        <div className="lg:col-span-1">
          <div className="bg-surface-base rounded-xl shadow-sm border border-surface-muted overflow-hidden flex flex-col">
            <button
              onClick={() => setActiveTab('app')}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors text-left border-l-4 ${
                activeTab === 'app' ? 'bg-brand-primary/5 text-brand-primary border-brand-primary' : 'bg-transparent text-brand-gray border-transparent hover:bg-surface-muted/50 hover:text-brand-dark'
              }`}
            >
              <Server className={`h-5 w-5 ${activeTab === 'app' ? 'text-brand-primary' : 'text-brand-gray/70'}`} />
              Genel Ayarlar
            </button>
            <button
              onClick={() => setActiveTab('email')}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors text-left border-l-4 ${
                activeTab === 'email' ? 'bg-brand-primary/5 text-brand-primary border-brand-primary' : 'bg-transparent text-brand-gray border-transparent hover:bg-surface-muted/50 hover:text-brand-dark'
              }`}
            >
              <Mail className={`h-5 w-5 ${activeTab === 'email' ? 'text-brand-primary' : 'text-brand-gray/70'}`} />
              E-Posta (SMTP)
            </button>
            <button
              onClick={() => setActiveTab('jwt')}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors text-left border-l-4 ${
                activeTab === 'jwt' ? 'bg-brand-primary/5 text-brand-primary border-brand-primary' : 'bg-transparent text-brand-gray border-transparent hover:bg-surface-muted/50 hover:text-brand-dark'
              }`}
            >
              <Key className={`h-5 w-5 ${activeTab === 'jwt' ? 'text-brand-primary' : 'text-brand-gray/70'}`} />
              Güvenlik & Oturum
            </button>
            <button
              onClick={() => setActiveTab('workflow')}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors text-left border-l-4 ${
                activeTab === 'workflow' ? 'bg-brand-primary/5 text-brand-primary border-brand-primary' : 'bg-transparent text-brand-gray border-transparent hover:bg-surface-muted/50 hover:text-brand-dark'
              }`}
            >
              <GitMerge className={`h-5 w-5 ${activeTab === 'workflow' ? 'text-brand-primary' : 'text-brand-gray/70'}`} />
              İş Akışı Kuralları
            </button>
          </div>
        </div>

        {/* Content Pane */}
        <div className="lg:col-span-3">
          {activeTab === 'app' && appData && <AppForm data={appData} mutation={appMutation} />}
          {activeTab === 'email' && emailData && <EmailForm data={emailData} mutation={emailMutation} onTest={handleTestEmail} testStatus={testEmailStatus} />}
          {activeTab === 'jwt' && (
            <div className="space-y-6">
              {jwtData && <JwtForm data={jwtData} mutation={jwtMutation} />}
              {ldapData && <LdapForm data={ldapData} mutation={ldapMutation} />}
            </div>
          )}
          {activeTab === 'workflow' && workflowData && <WorkflowForm data={workflowData} mutation={workflowMutation} />}
        </div>
      </div>
    </PageContainer>
  );
};

// ==========================================
// SUB FORMS
// ==========================================

const AppForm = ({ data, mutation }: { data: AppSettingsDto, mutation: any }) => {
  const { control, handleSubmit } = useForm<AppSettingsDto>({ defaultValues: data });

  return (
    <GlassCard noPadding className="overflow-hidden">
      <div className="p-6 md:p-8 space-y-6">
        <h3 className="text-lg font-bold text-brand-dark mb-4 border-b pb-2">Genel Ayarlar</h3>
        {mutation.isSuccess && <div className="p-3 bg-status-success/10 text-status-success border border-status-success/20 rounded-lg flex items-center gap-2 text-sm font-medium"><CheckCircle className="h-4 w-4" /> Ayarlar başarıyla kaydedildi.</div>}

        <form id="app-settings-form" onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Controller name="siteName" control={control} rules={{ required: 'Zorunlu alan' }} render={({ field, fieldState }) => <PremiumInput label="Sistem Adı" error={fieldState.error?.message} {...field} />} />
            <Controller name="siteUrl" control={control} rules={{ required: 'Zorunlu alan' }} render={({ field, fieldState }) => <PremiumInput label="Sistem URL Adresi" type="url" error={fieldState.error?.message} {...field} />} />
            <Controller name="supportEmail" control={control} rules={{ required: 'Zorunlu alan' }} render={({ field, fieldState }) => <PremiumInput label="Destek E-Postası" type="email" error={fieldState.error?.message} {...field} />} />
            <Controller name="maxUploadSizeMb" control={control} rules={{ required: 'Zorunlu alan', min: 1 }} render={({ field, fieldState }) => <PremiumInput label="Maksimum Dosya Boyutu (MB)" type="number" error={fieldState.error?.message} {...field} />} />
            <div className="md:col-span-2">
              <Controller name="allowedFileTypes" control={control} rules={{ required: 'Zorunlu alan' }} render={({ field, fieldState }) => <PremiumInput label="İzin Verilen Dosya Tipleri (Virgülle ayırın)" helperText="Örn: .pdf,.jpg,.png" error={fieldState.error?.message} {...field} />} />
            </div>
          </div>
          <div className="pt-4 space-y-4 border-t">
            <h4 className="text-sm font-bold text-brand-dark">Gelişmiş Seçenekler</h4>
            <Controller name="enableUserRegistration" control={control} render={({ field }) => <PremiumCheckbox label="Harici kullanıcı kaydına izin ver" checked={field.value} onChange={field.onChange} />} />
            <Controller name="maintenanceMode" control={control} render={({ field }) => <PremiumCheckbox label="Bakım modunu aktifleştir (Kullanıcı girişini kapatır)" checked={field.value} onChange={field.onChange} />} />
          </div>
        </form>
      </div>
      <div className="px-6 py-4 bg-surface-muted/30 border-t border-surface-muted flex justify-end">
        <FfButton form="app-settings-form" type="submit" variant="primary" leftIcon={<Save className="h-4 w-4" />} isLoading={mutation.isPending}>Kaydet</FfButton>
      </div>
    </GlassCard>
  );
};

const EmailForm = ({ data, mutation, onTest, testStatus }: { data: EmailSettingsDto, mutation: any, onTest: (email: string) => void, testStatus: any }) => {
  const { control, handleSubmit } = useForm<EmailSettingsDto>({ defaultValues: data });
  const [testEmail, setTestEmail] = useState(data.smtp.defaultFrom);

  return (
    <GlassCard noPadding className="overflow-hidden">
      <div className="p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between border-b pb-2 mb-4">
          <h3 className="text-lg font-bold text-brand-dark">SMTP Konfigürasyonu</h3>
        </div>
        {mutation.isSuccess && <div className="p-3 bg-status-success/10 text-status-success border border-status-success/20 rounded-lg flex items-center gap-2 text-sm font-medium"><CheckCircle className="h-4 w-4" /> Ayarlar başarıyla kaydedildi.</div>}

        <form id="email-settings-form" onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
          <div className="mb-4 bg-brand-primary/5 p-4 rounded-lg border border-brand-primary/20">
            <Controller name="enabled" control={control} render={({ field }) => <PremiumCheckbox label="E-Posta Gönderimini Aktifleştir" checked={field.value} onChange={field.onChange} />} />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Controller name="smtp.host" control={control} rules={{ required: 'Zorunlu alan' }} render={({ field, fieldState }) => <PremiumInput label="SMTP Sunucusu" error={fieldState.error?.message} {...field} />} />
            <Controller name="smtp.port" control={control} rules={{ required: 'Zorunlu alan' }} render={({ field, fieldState }) => <PremiumInput label="SMTP Portu" type="number" error={fieldState.error?.message} {...field} />} />
            
            <Controller name="smtp.username" control={control} rules={{ required: 'Zorunlu alan' }} render={({ field, fieldState }) => <PremiumInput label="Kullanıcı Adı" error={fieldState.error?.message} {...field} />} />
            <Controller name="smtp.password" control={control} render={({ field, fieldState }) => <PremiumInput label="Şifre" type="password" placeholder="Değiştirmeyecekseniz boş bırakın" error={fieldState.error?.message} {...field} />} />
            
            <Controller name="smtp.defaultFrom" control={control} rules={{ required: 'Zorunlu alan' }} render={({ field, fieldState }) => <PremiumInput label="Gönderici Adresi" type="email" error={fieldState.error?.message} {...field} />} />
            <div className="flex items-end pb-2">
              <Controller name="smtp.enableSsl" control={control} render={({ field }) => <PremiumCheckbox label="SSL/TLS Güvenliği" checked={field.value} onChange={field.onChange} />} />
            </div>

            <Controller name="smtp.timeoutSeconds" control={control} render={({ field, fieldState }) => <PremiumInput label="Zaman Aşımı (sn)" type="number" error={fieldState.error?.message} {...field} />} />
            <Controller name="smtp.retryCount" control={control} render={({ field, fieldState }) => <PremiumInput label="Hata Durumunda Tekrar Deneme" type="number" error={fieldState.error?.message} {...field} />} />
          </div>
        </form>

        <div className="mt-8 pt-6 border-t">
          <h4 className="text-sm font-bold text-brand-dark mb-2">Bağlantı Testi</h4>
          <div className="flex gap-3">
            <PremiumInput label="" className="flex-1" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="Test edilecek e-posta" />
            <FfButton variant="outline" leftIcon={<RefreshCcw className="h-4 w-4" />} onClick={() => onTest(testEmail)} isLoading={testStatus.loading} disabled={!testEmail}>Test Gönder</FfButton>
          </div>
          {testStatus.success && <div className="mt-3 text-sm text-status-success flex items-center gap-1.5"><CheckCircle className="h-4 w-4" /> Başarılı!</div>}
          {testStatus.error && <div className="mt-3 text-sm text-status-danger flex items-center gap-1.5"><ShieldAlert className="h-4 w-4" /> {testStatus.error}</div>}
        </div>
      </div>
      <div className="px-6 py-4 bg-surface-muted/30 border-t border-surface-muted flex justify-end">
        <FfButton form="email-settings-form" type="submit" variant="primary" leftIcon={<Save className="h-4 w-4" />} isLoading={mutation.isPending}>Kaydet</FfButton>
      </div>
    </GlassCard>
  );
};

const JwtForm = ({ data, mutation }: { data: JwtSettingsDto, mutation: any }) => {
  const { control, handleSubmit } = useForm<JwtSettingsDto>({ defaultValues: data });

  return (
    <GlassCard noPadding className="overflow-hidden">
      <div className="p-6 md:p-8 space-y-6">
        <h3 className="text-lg font-bold text-brand-dark mb-4 border-b pb-2">Güvenlik & Oturum (JWT)</h3>
        {mutation.isSuccess && <div className="p-3 bg-status-success/10 text-status-success border border-status-success/20 rounded-lg flex items-center gap-2 text-sm font-medium"><CheckCircle className="h-4 w-4" /> Ayarlar başarıyla kaydedildi.</div>}

        <form id="jwt-settings-form" onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <Controller name="accessTokenMinutes" control={control} rules={{ required: 'Zorunlu alan', min: 1 }} render={({ field, fieldState }) => <PremiumInput label="Access Token Süresi (Dakika)" type="number" helperText="1440 dakika = 1 Gün" error={fieldState.error?.message} {...field} />} />
            <Controller name="refreshTokenDays" control={control} rules={{ required: 'Zorunlu alan', min: 1 }} render={({ field, fieldState }) => <PremiumInput label="Refresh Token Süresi (Gün)" type="number" helperText="Kullanıcının yeniden giriş yapmadan oturumu uzatabileceği süre." error={fieldState.error?.message} {...field} />} />
          </div>
        </form>
      </div>
      <div className="px-6 py-4 bg-surface-muted/30 border-t border-surface-muted flex justify-end">
        <FfButton form="jwt-settings-form" type="submit" variant="primary" leftIcon={<Save className="h-4 w-4" />} isLoading={mutation.isPending}>Kaydet</FfButton>
      </div>
    </GlassCard>
  );
};

const LdapForm = ({ data, mutation }: { data: LdapSettingsDto, mutation: any }) => {
  const { control, handleSubmit, watch } = useForm<LdapSettingsDto>({ defaultValues: data });
  const isActive = watch('isActive');

  return (
    <GlassCard noPadding className="overflow-hidden">
      <div className="p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between border-b pb-2 mb-4">
          <h3 className="text-lg font-bold text-brand-dark">Active Directory (LDAP)</h3>
        </div>
        {mutation.isSuccess && <div className="p-3 bg-status-success/10 text-status-success border border-status-success/20 rounded-lg flex items-center gap-2 text-sm font-medium"><CheckCircle className="h-4 w-4" /> LDAP Ayarları başarıyla kaydedildi.</div>}

        <form id="ldap-settings-form" onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
          <div className="mb-4 bg-brand-primary/5 p-4 rounded-lg border border-brand-primary/20">
            <Controller name="isActive" control={control} render={({ field }) => <PremiumCheckbox label="Windows Active Directory Girişini Aktifleştir" checked={field.value} onChange={field.onChange} />} />
          </div>

          {isActive && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in zoom-in duration-300">
              <Controller name="host" control={control} rules={{ required: 'Zorunlu alan' }} render={({ field, fieldState }) => <PremiumInput label="LDAP Sunucu IP/Host" placeholder="192.168.1.10" error={fieldState.error?.message} {...field} />} />
              <Controller name="port" control={control} rules={{ required: 'Zorunlu alan' }} render={({ field, fieldState }) => <PremiumInput label="Port" type="number" placeholder="389" error={fieldState.error?.message} {...field} />} />
              
              <Controller name="domain" control={control} rules={{ required: 'Zorunlu alan' }} render={({ field, fieldState }) => <PremiumInput label="Domain Adı" placeholder="erkurtholding.com.tr" error={fieldState.error?.message} {...field} />} />
              <div className="flex items-end pb-2">
                <Controller name="useSsl" control={control} render={({ field }) => <PremiumCheckbox label="LDAPS (Güvenli Bağlantı)" checked={field.value} onChange={field.onChange} />} />
              </div>

              <div className="md:col-span-2">
                <Controller name="baseDn" control={control} rules={{ required: 'Zorunlu alan' }} render={({ field, fieldState }) => <PremiumInput label="Base DN" placeholder="DC=erkurtholding,DC=com,DC=tr" error={fieldState.error?.message} {...field} />} />
              </div>

              <div className="md:col-span-2 mt-4 pt-4 border-t">
                <h4 className="text-sm font-bold text-brand-dark mb-4">Servis Hesabı (Kullanıcı Arama İçin)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Controller name="serviceUserName" control={control} render={({ field, fieldState }) => <PremiumInput label="Kullanıcı Adı" placeholder="svc_formfleks" error={fieldState.error?.message} {...field} />} />
                  <Controller name="servicePassword" control={control} render={({ field, fieldState }) => <PremiumInput label="Şifre" type="password" placeholder="Şifreyi giriniz" error={fieldState.error?.message} {...field} />} />
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
      <div className="px-6 py-4 bg-surface-muted/30 border-t border-surface-muted flex justify-end">
        <FfButton form="ldap-settings-form" type="submit" variant="primary" leftIcon={<Save className="h-4 w-4" />} isLoading={mutation.isPending}>Kaydet</FfButton>
      </div>
    </GlassCard>
  );
};

const WorkflowForm = ({ data, mutation }: { data: WorkflowSettingsDto, mutation: any }) => {
  const { control, handleSubmit } = useForm<WorkflowSettingsDto>({ defaultValues: data });

  return (
    <GlassCard noPadding className="overflow-hidden">
      <div className="p-6 md:p-8 space-y-6">
        <h3 className="text-lg font-bold text-brand-dark mb-4 border-b pb-2">İş Akışı & Hatırlatıcı Kuralları</h3>
        {mutation.isSuccess && <div className="p-3 bg-status-success/10 text-status-success border border-status-success/20 rounded-lg flex items-center gap-2 text-sm font-medium"><CheckCircle className="h-4 w-4" /> Ayarlar başarıyla kaydedildi.</div>}

        <form id="workflow-settings-form" onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <Controller name="reminderCheckIntervalHours" control={control} rules={{ required: 'Zorunlu alan', min: 1 }} render={({ field, fieldState }) => <PremiumInput label="Hatırlatıcı Kontrol Döngüsü (Saat)" type="number" helperText="Arka plan servisinin geciken onayları tarama sıklığı (Örn: 12)." error={fieldState.error?.message} {...field} />} />
            <Controller name="pendingApprovalThresholdHours" control={control} rules={{ required: 'Zorunlu alan', min: 1 }} render={({ field, fieldState }) => <PremiumInput label="Gecikme Eşiği (Saat)" type="number" helperText="Bir onayın 'gecikmiş' sayılması için beklemesi gereken saat (Örn: 24)." error={fieldState.error?.message} {...field} />} />
          </div>
        </form>
      </div>
      <div className="px-6 py-4 bg-surface-muted/30 border-t border-surface-muted flex justify-end">
        <FfButton form="workflow-settings-form" type="submit" variant="primary" leftIcon={<Save className="h-4 w-4" />} isLoading={mutation.isPending}>Kaydet</FfButton>
      </div>
    </GlassCard>
  );
};
