import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { PageHeader, FfButton, PageContainer, GlassCard } from '@/components/ui/index';
import { PremiumInput, PremiumCheckbox } from '@/components/forms';
import toast from 'react-hot-toast';
import { settingsService, type AppSettingsDto, type EmailSettingsDto } from '@/services/settings.service';
import { Save, Server, Mail, ShieldAlert, CheckCircle, RefreshCcw } from 'lucide-react';

export const ApplicationSettings: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'app' | 'email'>('app');
  const [testEmailStatus, setTestEmailStatus] = useState<{ loading: boolean; success?: boolean; error?: string }>({ loading: false });

  // -- APP SETTINGS QUERY --
  const { data: appData, isLoading: appLoading } = useQuery({
    queryKey: ['app-settings'],
    queryFn: () => settingsService.getAppSettings()
  });

  // -- EMAIL SETTINGS QUERY --
  const { data: emailData, isLoading: emailLoading } = useQuery({
    queryKey: ['email-settings'],
    queryFn: () => settingsService.getEmailSettings()
  });

  const appMutation = useMutation({
    mutationFn: (data: AppSettingsDto) => settingsService.updateAppSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appSettings'] });
      toast.success('Genel ayarlar başarıyla kaydedildi.');
    },
  });

  const emailMutation = useMutation({
    mutationFn: (data: EmailSettingsDto) => settingsService.updateEmailSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailSettings'] });
      toast.success('E-posta ayarları başarıyla kaydedildi.');
    },
  });

  // -- TEST EMAIL MUTATION --
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

  if (appLoading || emailLoading) {
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
        description="Uygulama genel davranışlarını ve e-posta konfigürasyonlarını yapılandırın."
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
                activeTab === 'app'
                  ? 'bg-brand-primary/5 text-brand-primary border-brand-primary'
                  : 'bg-transparent text-brand-gray border-transparent hover:bg-surface-muted/50 hover:text-brand-dark'
              }`}
            >
              <Server className={`h-5 w-5 ${activeTab === 'app' ? 'text-brand-primary' : 'text-brand-gray/70'}`} />
              Genel Ayarlar
            </button>
            <button
              onClick={() => setActiveTab('email')}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors text-left border-l-4 ${
                activeTab === 'email'
                  ? 'bg-brand-primary/5 text-brand-primary border-brand-primary'
                  : 'bg-transparent text-brand-gray border-transparent hover:bg-surface-muted/50 hover:text-brand-dark'
              }`}
            >
              <Mail className={`h-5 w-5 ${activeTab === 'email' ? 'text-brand-primary' : 'text-brand-gray/70'}`} />
              E-Posta (SMTP)
            </button>
          </div>
        </div>

        {/* Content Pane */}
        <div className="lg:col-span-3">
          {activeTab === 'app' && appData && (
            <AppForm data={appData} mutation={appMutation} />
          )}

          {activeTab === 'email' && emailData && (
            <EmailForm 
              data={emailData} 
              mutation={emailMutation} 
              onTest={handleTestEmail}
              testStatus={testEmailStatus}
            />
          )}
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

  const onSubmit = (formData: AppSettingsDto) => {
    mutation.mutate(formData);
  };

  return (
    <GlassCard noPadding className="overflow-hidden">
      <div className="p-6 md:p-8 space-y-6">
        <h3 className="text-lg font-bold text-brand-dark mb-4 border-b pb-2">Genel Ayarlar</h3>
        
        {mutation.isSuccess && (
          <div className="p-3 bg-status-success/10 text-status-success border border-status-success/20 rounded-lg flex items-center gap-2 text-sm font-medium">
            <CheckCircle className="h-4 w-4" /> Ayarlar başarıyla kaydedildi.
          </div>
        )}

        <form id="app-settings-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Controller
              name="siteName"
              control={control}
              rules={{ required: 'Zorunlu alan' }}
              render={({ field, fieldState }) => (
                <PremiumInput label="Sistem Adı" error={fieldState.error?.message} {...field} />
              )}
            />
            <Controller
              name="siteUrl"
              control={control}
              rules={{ required: 'Zorunlu alan' }}
              render={({ field, fieldState }) => (
                <PremiumInput label="Sistem URL Adresi" type="url" error={fieldState.error?.message} {...field} />
              )}
            />
            <Controller
              name="supportEmail"
              control={control}
              rules={{ required: 'Zorunlu alan' }}
              render={({ field, fieldState }) => (
                <PremiumInput label="Destek & İletişim E-Postası" type="email" error={fieldState.error?.message} {...field} />
              )}
            />
            <Controller
              name="maxUploadSizeMb"
              control={control}
              rules={{ required: 'Zorunlu alan', min: 1 }}
              render={({ field, fieldState }) => (
                <PremiumInput label="Maksimum Dosya Boyutu (MB)" type="number" error={fieldState.error?.message} {...field} />
              )}
            />
            <div className="md:col-span-2">
              <Controller
                name="allowedFileTypes"
                control={control}
                rules={{ required: 'Zorunlu alan' }}
                render={({ field, fieldState }) => (
                  <PremiumInput label="İzin Verilen Dosya Tipleri (Virgülle ayırın)" helperText="Örn: .pdf,.jpg,.png" error={fieldState.error?.message} {...field} />
                )}
              />
            </div>
          </div>

          <div className="pt-4 space-y-4">
            <h4 className="text-sm font-bold text-brand-dark">Gelişmiş Seçenekler</h4>
            <div className="p-4 bg-surface-muted/20 border rounded-lg space-y-4">
              <Controller
                name="enableUserRegistration"
                control={control}
                render={({ field }) => (
                  <PremiumCheckbox label="Harici kullanıcı kaydına izin ver" checked={field.value} onChange={field.onChange} />
                )}
              />
              <Controller
                name="maintenanceMode"
                control={control}
                render={({ field }) => (
                  <PremiumCheckbox label="Bakım modunu aktifleştir (Kullanıcı girişini kapatır)" helperText="Sadece adminler giriş yapabilir" checked={field.value} onChange={field.onChange} />
                )}
              />
            </div>
          </div>
        </form>
      </div>
      
      <div className="px-6 py-4 bg-surface-muted/30 border-t border-surface-muted flex justify-end">
        <FfButton 
          form="app-settings-form"
          type="submit"
          variant="primary"
          leftIcon={<Save className="h-4 w-4" />}
          isLoading={mutation.isPending}
        >
          Değişiklikleri Kaydet
        </FfButton>
      </div>
    </GlassCard>
  );
};

const EmailForm = ({ data, mutation, onTest, testStatus }: { data: EmailSettingsDto, mutation: any, onTest: (email: string) => void, testStatus: any }) => {
  const { control, handleSubmit } = useForm<EmailSettingsDto>({ defaultValues: data });
  const [testEmail, setTestEmail] = useState(data.senderAddress);

  const onSubmit = (formData: EmailSettingsDto) => {
    mutation.mutate(formData);
  };

  return (
    <GlassCard noPadding className="overflow-hidden">
      <div className="p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between border-b pb-2 mb-4">
          <h3 className="text-lg font-bold text-brand-dark">SMTP Konfigürasyonu</h3>
          {data.smtpServer && <span className="flex items-center gap-1.5 text-xs font-semibold text-status-success bg-status-success/10 px-2 py-1 rounded-full"><Server className="h-3 w-3" /> Konfigürasyon Mevcut</span>}
        </div>

        {mutation.isSuccess && (
          <div className="p-3 bg-status-success/10 text-status-success border border-status-success/20 rounded-lg flex items-center gap-2 text-sm font-medium">
            <CheckCircle className="h-4 w-4" /> E-Posta ayarları başarıyla kaydedildi.
          </div>
        )}

        <form id="email-settings-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <Controller
                name="smtpServer"
                control={control}
                rules={{ required: 'Zorunlu alan' }}
                render={({ field, fieldState }) => (
                  <PremiumInput label="SMTP Sunucusu" helperText="Örn: smtp.office365.com" error={fieldState.error?.message} {...field} />
                )}
              />
            </div>
            <Controller
              name="smtpPort"
              control={control}
              rules={{ required: 'Zorunlu alan' }}
              render={({ field, fieldState }) => (
                <PremiumInput label="SMTP Portu" type="number" error={fieldState.error?.message} {...field} />
              )}
            />
            <div className="flex items-end pb-2">
              <Controller
                name="enableSsl"
                control={control}
                render={({ field }) => (
                  <PremiumCheckbox label="SSL / TLS Güvenliği Kullan" checked={field.value} onChange={field.onChange} />
                )}
              />
            </div>
            
            <Controller
              name="smtpUser"
              control={control}
              rules={{ required: 'Zorunlu alan' }}
              render={({ field, fieldState }) => (
                <PremiumInput label="Kullanıcı Adı" type="text" error={fieldState.error?.message} {...field} />
              )}
            />
            <Controller
              name="smtpPass"
              control={control}
              render={({ field, fieldState }) => (
                <PremiumInput label="Parola / Uygulama Şifresi" type="password" placeholder="Değiştirmeyecekseniz boş bırakın" error={fieldState.error?.message} {...field} />
              )}
            />

            <div className="md:col-span-2 pt-4 border-t">
              <h4 className="text-sm font-bold text-brand-dark mb-4">Giden E-Posta Ayarları</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Controller
                  name="senderAddress"
                  control={control}
                  rules={{ required: 'Zorunlu alan' }}
                  render={({ field, fieldState }) => (
                    <PremiumInput label="Gönderici E-Posta Adresi" type="email" error={fieldState.error?.message} {...field} />
                  )}
                />
                <Controller
                  name="senderName"
                  control={control}
                  rules={{ required: 'Zorunlu alan' }}
                  render={({ field, fieldState }) => (
                    <PremiumInput label="Gönderici Görünen Ad" helperText="Örn: Formfleks Sistem" error={fieldState.error?.message} {...field} />
                  )}
                />
              </div>
            </div>
          </div>
        </form>

        {/* Test Section */}
        <div className="mt-8 pt-6 border-t">
          <h4 className="text-sm font-bold text-brand-dark mb-2">Bağlantı Testi</h4>
          <p className="text-xs text-brand-gray mb-4">Mevcut ayarların çalıştığından emin olmak için yapılandırmayı test edin.</p>
          
          <div className="flex gap-3">
            <PremiumInput
              label=""
              className="flex-1"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Test e-postası alacak adres"
            />
            <FfButton 
              variant="outline" 
              leftIcon={<RefreshCcw className="h-4 w-4" />}
              onClick={() => onTest(testEmail)}
              isLoading={testStatus.loading}
              disabled={!testEmail}
            >
              Test Gönder
            </FfButton>
          </div>
          
          {testStatus.success && (
            <div className="mt-3 text-sm font-medium text-status-success flex items-center gap-1.5"><CheckCircle className="h-4 w-4" /> Test başarıyla gönderildi! Lütfen e-postanızı kontrol edin.</div>
          )}
          {testStatus.error && (
            <div className="mt-3 text-sm font-medium text-status-danger flex items-center gap-1.5"><ShieldAlert className="h-4 w-4" /> {testStatus.error}</div>
          )}
        </div>
      </div>

      <div className="px-6 py-4 bg-surface-muted/30 border-t border-surface-muted flex justify-end">
        <FfButton 
          form="email-settings-form"
          type="submit"
          variant="primary"
          leftIcon={<Save className="h-4 w-4" />}
          isLoading={mutation.isPending}
        >
          Konfigürasyonu Kaydet
        </FfButton>
      </div>
    </GlassCard>
  );
};
