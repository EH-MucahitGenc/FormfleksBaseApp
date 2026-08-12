import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { FfButton, PageContainer, GlassCard } from '@/components/ui/index';
import { PremiumInput, PremiumCheckbox } from '@/components/forms';
import toast from 'react-hot-toast';
import { settingsService, type AppSettingsDto, type EmailSettingsDto, type JwtSettingsDto, type WorkflowSettingsDto, type LdapSettingsDto } from '@/services/settings.service';
import { apiClient } from '@/lib/axios';
import { Save, Mail, ShieldAlert, CheckCircle, RefreshCcw, GitMerge, Settings2, SlidersHorizontal, ChevronRight, Activity, Cable, LockKeyhole } from 'lucide-react';

type SettingsTab = 'app' | 'email' | 'jwt' | 'workflow' | 'integration';

const settingsTabs: Array<{
  id: SettingsTab;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'app', label: 'Genel Ayarlar', description: 'Kimlik, adres ve dosya politikaları', icon: SlidersHorizontal },
  { id: 'email', label: 'E-Posta (SMTP)', description: 'Gönderim kanalı ve bağlantı testi', icon: Mail },
  { id: 'jwt', label: 'Güvenlik & Oturum', description: 'JWT ve Active Directory erişimi', icon: LockKeyhole },
  { id: 'workflow', label: 'İş Akışı Kuralları', description: 'Hatırlatıcı ve taslak yönetimi', icon: GitMerge },
  { id: 'integration', label: 'Entegrasyonlar', description: 'IFS zamanlama ve tetikleyiciler', icon: Cable },
];

export const ApplicationSettings: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<SettingsTab>('app');
  const [testEmailStatus, setTestEmailStatus] = useState<{ loading: boolean; success?: boolean; error?: string }>({ loading: false });

  // -- QUERIES --
  const { data: appData, isLoading: appLoading } = useQuery({ queryKey: ['app-settings'], queryFn: () => settingsService.getAppSettings() });
  const { data: emailData, isLoading: emailLoading } = useQuery({ queryKey: ['email-settings'], queryFn: () => settingsService.getEmailSettings() });
  const { data: jwtData, isLoading: jwtLoading } = useQuery({ queryKey: ['jwt-settings'], queryFn: () => settingsService.getJwtSettings() });
  const { data: ldapData, isLoading: ldapLoading } = useQuery({ queryKey: ['ldap-settings'], queryFn: () => settingsService.getLdapSettings() });
  const { data: workflowData, isLoading: workflowLoading } = useQuery({ queryKey: ['workflow-settings'], queryFn: () => settingsService.getWorkflowSettings() });
  const { data: integrationData, isLoading: integrationLoading } = useQuery({ queryKey: ['integration-settings'], queryFn: () => settingsService.getIntegrationSettings() });

  // -- MUTATIONS --
  const appMutation = useMutation({
    mutationFn: (data: any) => settingsService.updateAppSettings(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['app-settings'] }); toast.success('Genel ayarlar kaydedildi.'); },
  });

  const emailMutation = useMutation({
    mutationFn: (data: any) => settingsService.updateEmailSettings(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['email-settings'] }); toast.success('E-posta ayarları kaydedildi.'); },
  });

  const jwtMutation = useMutation({
    mutationFn: (data: any) => settingsService.updateJwtSettings(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['jwt-settings'] }); toast.success('JWT ayarları kaydedildi.'); },
  });

  const ldapMutation = useMutation({
    mutationFn: (data: any) => settingsService.updateLdapSettings(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ldap-settings'] }); toast.success('Active Directory ayarları kaydedildi.'); },
  });

  const workflowMutation = useMutation({
    mutationFn: (data: any) => settingsService.updateWorkflowSettings(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['workflow-settings'] }); toast.success('İş akışı kuralları kaydedildi.'); },
  });

  const integrationMutation = useMutation({
    mutationFn: (data: any) => settingsService.updateIntegrationSettings(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['integration-settings'] }); toast.success('Entegrasyon ayarları kaydedildi.'); },
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

  if (appLoading || emailLoading || jwtLoading || workflowLoading || ldapLoading || integrationLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="flex flex-col items-center rounded-[24px] border border-[#eee7e2] bg-white px-10 py-8 shadow-[0_24px_60px_-42px_rgba(33,26,23,0.5)]">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#fff0e8] text-[#f36c2f]">
            <RefreshCcw className="h-5 w-5 animate-spin" />
          </div>
          <p className="mt-4 text-sm font-black text-[#352c28]">Ayarlar hazırlanıyor</p>
          <p className="mt-1 text-[11px] font-semibold text-[#92857e]">Yapılandırma güvenli biçimde yükleniyor.</p>
        </div>
      </div>
    );
  }

  const activeSetting = settingsTabs.find((tab) => tab.id === activeTab) ?? settingsTabs[0];
  const ActiveSettingIcon = activeSetting.icon;

  return (
    <PageContainer className="ff-settings-page" maxWidth="full">
      <section className="relative overflow-hidden rounded-[28px] border border-[#f0dfd4] bg-[linear-gradient(118deg,#fff7f1_0%,#ffffff_58%,#eef9f6_100%)] px-5 py-5 shadow-[0_24px_65px_-44px_rgba(33,26,23,0.46)] sm:px-7 sm:py-6">
        <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full border border-emerald-100/60" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#ffd9c7] bg-white/80 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#e76228] shadow-sm">
              <Settings2 className="h-3.5 w-3.5" />
              Sistem kontrol merkezi
            </div>
            <h1 className="text-[30px] font-black leading-tight tracking-[-0.045em] text-[#211a17] sm:text-[36px]">Sistem Ayarları</h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[#756963]">
              Uygulama davranışlarını, güvenlik katmanlarını ve operasyon kurallarını tek bir kontrollü alanda yönetin.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <div className="rounded-2xl border border-white bg-white/80 px-4 py-3 shadow-sm backdrop-blur-xl">
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#998c84]">Yapılandırma</p>
              <p className="mt-1 text-sm font-black text-[#332a26]">5 yönetim alanı</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 shadow-sm backdrop-blur-xl">
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-emerald-700/70">Sistem durumu</p>
              <p className="mt-1 flex items-center gap-2 text-sm font-black text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" />Yapılandırılabilir</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
        {/* Sidebar Nav */}
        <aside className="lg:sticky lg:top-5 lg:self-start">
          <div className="overflow-x-auto rounded-[22px] border border-[#e9e3df] bg-white p-2 shadow-[0_18px_50px_-40px_rgba(33,26,23,0.44)] lg:overflow-visible">
            <div className="flex min-w-max gap-2 lg:min-w-0 lg:flex-col">
              {settingsTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`group flex w-[230px] items-center gap-3 rounded-[17px] px-3 py-3 text-left transition-all lg:w-full ${isActive ? 'bg-[#211a17] text-white shadow-[0_14px_28px_rgba(33,26,23,0.18)]' : 'text-[#695d57] hover:bg-[#faf7f4] hover:text-[#2f2723]'}`}
                  >
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${isActive ? 'bg-[#ff7138] text-white' : 'bg-[#f5f2f0] text-[#8a7d76] group-hover:bg-[#fff0e8] group-hover:text-[#f36c2f]'}`}>
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-black">{tab.label}</span>
                      <span className={`mt-1 block truncate text-[9px] font-semibold ${isActive ? 'text-white/55' : 'text-[#9b8e87]'}`}>{tab.description}</span>
                    </span>
                    <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${isActive ? 'text-[#ff9b70]' : 'text-[#c4bab4] group-hover:translate-x-0.5'}`} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 hidden rounded-[20px] border border-[#e9e3df] bg-[#faf9f8] p-4 lg:block">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#8d8079]"><Activity className="h-3.5 w-3.5 text-[#f36c2f]" />Değişiklik politikası</div>
            <p className="mt-2 text-[10px] font-semibold leading-4 text-[#8a7d76]">Her modül ayrı kaydedilir. Değişiklikler yalnızca ilgili ayar grubunu etkiler.</p>
          </div>
        </aside>

        {/* Content Pane */}
        <div className="ff-settings-content min-w-0">
          <div className="mb-3 flex items-center gap-3 rounded-[20px] border border-[#e9e3df] bg-white px-4 py-3 shadow-[0_14px_40px_-38px_rgba(33,26,23,0.46)]">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#fff0e8] text-[#f36c2f]"><ActiveSettingIcon className="h-4.5 w-4.5" /></span>
            <div className="min-w-0">
              <p className="text-sm font-black text-[#332a26]">{activeSetting.label}</p>
              <p className="mt-0.5 truncate text-[10px] font-semibold text-[#90837c]">{activeSetting.description}</p>
            </div>
          </div>
          {activeTab === 'app' && appData && <AppForm data={appData} mutation={appMutation} />}
          {activeTab === 'email' && emailData && <EmailForm data={emailData} mutation={emailMutation} onTest={handleTestEmail} testStatus={testEmailStatus} />}
          {activeTab === 'jwt' && (
            <div className="space-y-6">
              {jwtData && <JwtForm data={jwtData} mutation={jwtMutation} />}
              {ldapData && <LdapForm data={ldapData} mutation={ldapMutation} />}
            </div>
          )}
          {activeTab === 'workflow' && workflowData && <WorkflowForm data={workflowData} mutation={workflowMutation} />}
          {activeTab === 'integration' && integrationData && <IntegrationForm data={integrationData} mutation={integrationMutation} />}
        </div>
      </div>
    </PageContainer>
  );
};

// ==========================================
// SUB FORMS
// ==========================================

const IntegrationForm = ({ data, mutation }: { data: any, mutation: any }) => {
  const { control, handleSubmit } = useForm<any>({ defaultValues: data });
  const [triggerLoading, setTriggerLoading] = useState(false);

  const handleTestProbation = async () => {
    try {
      setTriggerLoading(true);
      const res = await apiClient.post('/admin/integrations/trigger-probation-test');
      toast.success(res.data?.message || 'Tetiklendi!');
    } catch (e: any) {
      toast.error('Hata: ' + (e.response?.data?.error || e.message));
    } finally {
      setTriggerLoading(false);
    }
  };

  return (
    <GlassCard noPadding className="ff-settings-card overflow-hidden">
      <div className="p-6 md:p-8 space-y-6">
        <h3 className="text-lg font-bold text-brand-dark mb-4 border-b pb-2">Dış Sistem Entegrasyonları</h3>
        {mutation.isSuccess && <div className="p-3 bg-status-success/10 text-status-success border border-status-success/20 rounded-lg flex items-center gap-2 text-sm font-medium"><CheckCircle className="h-4 w-4" /> Ayarlar başarıyla kaydedildi.</div>}

        <form id="integration-settings-form" onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Controller 
              name="personnelSyncTime" 
              control={control} 
              rules={{ required: 'Zorunlu alan', pattern: { value: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, message: 'Geçerli bir saat giriniz (Örn: 02:00)' } }} 
              render={({ field, fieldState }) => (
                <PremiumInput 
                  label="Personel Senkronizasyon Saati" 
                  type="time" 
                  helperText="Sistemin her gün Oracle'dan personelleri çekeceği tam saat (Türkiye Saati)." 
                  error={fieldState.error?.message} 
                  {...field} 
                />
              )} 
            />
            <Controller 
              name="personnelSyncErrorEmail" 
              control={control} 
              render={({ field, fieldState }) => (
                <PremiumInput 
                  label="Hata Bildirim E-Postası" 
                  type="text" 
                  placeholder="bt@sirket.com, destek@sirket.com" 
                  helperText="Oracle bağlantısında bir kopukluk olursa haber verilecek yetkililer (virgülle ayrılabilir)." 
                  error={fieldState.error?.message} 
                  {...field} 
                />
              )} 
            />
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-surface-muted">
          <h4 className="text-md font-semibold text-brand-dark mb-2 flex items-center gap-2">
             <RefreshCcw className="h-5 w-5 text-brand-primary" />
             Manuel Tetikleyiciler (Test & Debug)
          </h4>
          <p className="text-sm text-brand-gray mb-4">Sadece 2. veya 6. ayı gelmiş olan personeller için otomatik değerlendirme formlarını hemen şimdi oluşturun.</p>
          <FfButton type="button" variant="outline" onClick={handleTestProbation} isLoading={triggerLoading}>
            2/6 Ay Deneme Süresi Kontrolünü Tetikle
          </FfButton>
        </div>
      </div>
      <div className="px-6 py-4 bg-surface-muted/30 border-t border-surface-muted flex justify-end">
        <FfButton form="integration-settings-form" type="submit" variant="primary" leftIcon={<Save className="h-4 w-4" />} isLoading={mutation.isPending}>Kaydet</FfButton>
      </div>
    </GlassCard>
  );
};

const AppForm = ({ data, mutation }: { data: AppSettingsDto, mutation: any }) => {
  const { control, handleSubmit } = useForm<AppSettingsDto>({ defaultValues: data });

  return (
    <GlassCard noPadding className="ff-settings-card overflow-hidden">
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
    <GlassCard noPadding className="ff-settings-card overflow-hidden">
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
    <GlassCard noPadding className="ff-settings-card overflow-hidden">
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
    <GlassCard noPadding className="ff-settings-card overflow-hidden">
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
    <GlassCard noPadding className="ff-settings-card overflow-hidden">
      <div className="p-6 md:p-8 space-y-6">
        <h3 className="text-lg font-bold text-brand-dark mb-4 border-b pb-2">İş Akışı & Hatırlatıcı Kuralları</h3>
        {mutation.isSuccess && <div className="p-3 bg-status-success/10 text-status-success border border-status-success/20 rounded-lg flex items-center gap-2 text-sm font-medium"><CheckCircle className="h-4 w-4" /> Ayarlar başarıyla kaydedildi.</div>}

        <form id="workflow-settings-form" onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <Controller 
              name="approvalReminderTime" 
              control={control} 
              rules={{ required: 'Zorunlu alan', pattern: { value: /^([01]?[0-9]|2[0-3]):[0-5][0-9](,\s*([01]?[0-9]|2[0-3]):[0-5][0-9])*$/, message: 'Geçerli saatler giriniz (Örn: 10:00 veya 10:00,15:00)' } }} 
              render={({ field, fieldState }) => <PremiumInput label="Onay Hatırlatma Saatleri" placeholder="10:00,15:00" helperText="Sistemin gecikmiş onayları tarayıp hatırlatma atacağı saatler (Virgülle ayırabilirsiniz)." error={fieldState.error?.message} {...field} />} 
            />
            <Controller name="pendingApprovalThresholdHours" control={control} rules={{ required: 'Zorunlu alan', min: 1 }} render={({ field, fieldState }) => <PremiumInput label="Onay Gecikme Eşiği (Saat)" type="number" helperText="Bir onayın 'gecikmiş' sayılması için beklemesi gereken saat (Örn: 24)." error={fieldState.error?.message} {...field} />} />
            
            <div className="pt-4 mt-2 border-t border-surface-muted">
              <h4 className="text-sm font-bold text-brand-dark mb-4">Hata Bildirimleri</h4>
              <Controller 
                name="workflowErrorNotificationEmails" 
                control={control} 
                render={({ field, fieldState }) => (
                  <PremiumInput 
                    label="Onay Hataları Bildirim E-Postası" 
                    type="text" 
                    placeholder="ornek1@sirket.com, ornek2@sirket.com" 
                    helperText="Formlarda akış hatası (hiyerarşik kopukluk vb.) oluştuğunda bildirilecek yetkili adresleri." 
                    error={fieldState.error?.message} 
                    {...field} 
                  />
                )} 
              />
            </div>
            
            <div className="pt-4 mt-2 border-t border-surface-muted">
              <h4 className="text-sm font-bold text-brand-dark mb-4">Taslak Form Yönetimi</h4>
              <div className="grid grid-cols-1 gap-6">
                <Controller 
                  name="draftReminderTime" 
                  control={control} 
                  rules={{ required: 'Zorunlu alan', pattern: { value: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, message: 'Geçerli bir saat giriniz (Örn: 09:00)' } }} 
                  render={({ field, fieldState }) => <PremiumInput label="Taslak Hatırlatma Saati" type="time" helperText="Sistemin her gün taslak formları kontrol edeceği tam saat." error={fieldState.error?.message} {...field} />} 
                />
                <Controller name="draftAutoDeleteThresholdDays" control={control} rules={{ required: 'Zorunlu alan', min: 1 }} render={({ field, fieldState }) => <PremiumInput label="Taslak Otomatik Temizleme Süresi (Gün)" type="number" helperText="Taslak formların oluşturulduğu tarihten itibaren kaç gün sonra otomatik olarak silineceği (Örn: 7)." error={fieldState.error?.message} {...field} />} />
              </div>
            </div>
          </div>
        </form>
      </div>
      <div className="px-6 py-4 bg-surface-muted/30 border-t border-surface-muted flex justify-end">
        <FfButton form="workflow-settings-form" type="submit" variant="primary" leftIcon={<Save className="h-4 w-4" />} isLoading={mutation.isPending}>Kaydet</FfButton>
      </div>
    </GlassCard>
  );
};
