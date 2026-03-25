import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { PageHeader, FfButton, PageContainer, GlassCard } from '@/components/ui/index';
import { PremiumInput, PremiumSelect, PremiumCheckbox } from '@/components/forms';
import { settingsService, type UserProfileDto } from '@/services/settings.service';
import { Save, User, Lock, Bell, Camera, CheckCircle } from 'lucide-react';

export const UserProfile: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'info' | 'security' | 'preferences'>('info');

  const { data, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => settingsService.getUserProfile()
  });

  const profileMutation = useMutation({
    mutationFn: (updateData: Partial<UserProfileDto>) => settingsService.updateUserProfile(updateData),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-profile'] })
  });

  if (isLoading || !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Hesabım"
        description="Kişisel bilgilerinizi, şifrenizi ve bildirim tercihlerinizi yönetin."
        breadcrumbs={[
          { label: 'Anasayfa', href: '/' },
          { label: 'Hesap & Profil' }
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Avatar Card */}
          <div className="bg-surface-base rounded-xl shadow-sm border border-surface-muted p-6 flex flex-col items-center text-center">
            <div className="relative group mb-4">
              <div className="h-24 w-24 rounded-full bg-brand-primary/10 text-brand-primary font-bold text-3xl flex items-center justify-center border-4 border-white shadow-md">
                {data.firstName.charAt(0)}{data.lastName.charAt(0)}
              </div>
              <button className="absolute bottom-0 right-0 bg-surface-base p-1.5 rounded-full shadow border text-brand-gray hover:text-brand-primary transition-colors">
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <h3 className="font-bold text-brand-dark text-lg">{data.firstName} {data.lastName}</h3>
            <p className="text-sm text-brand-gray mb-1">{data.title}</p>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-surface-muted text-brand-dark">
              {data.departmentName}
            </span>
          </div>

          <div className="bg-surface-base rounded-xl shadow-sm border border-surface-muted overflow-hidden flex flex-col">
            <button
              onClick={() => setActiveTab('info')}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors text-left border-l-4 ${
                activeTab === 'info'
                  ? 'bg-brand-primary/5 text-brand-primary border-brand-primary'
                  : 'bg-transparent text-brand-gray border-transparent hover:bg-surface-muted/50 hover:text-brand-dark'
              }`}
            >
              <User className={`h-5 w-5 ${activeTab === 'info' ? 'text-brand-primary' : 'text-brand-gray/70'}`} />
              Kişisel Bilgiler
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors text-left border-l-4 ${
                activeTab === 'security'
                  ? 'bg-brand-primary/5 text-brand-primary border-brand-primary'
                  : 'bg-transparent text-brand-gray border-transparent hover:bg-surface-muted/50 hover:text-brand-dark'
              }`}
            >
              <Lock className={`h-5 w-5 ${activeTab === 'security' ? 'text-brand-primary' : 'text-brand-gray/70'}`} />
              Güvenlik ve Şifre
            </button>
            <button
              onClick={() => setActiveTab('preferences')}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors text-left border-l-4 ${
                activeTab === 'preferences'
                  ? 'bg-brand-primary/5 text-brand-primary border-brand-primary'
                  : 'bg-transparent text-brand-gray border-transparent hover:bg-surface-muted/50 hover:text-brand-dark'
              }`}
            >
              <Bell className={`h-5 w-5 ${activeTab === 'preferences' ? 'text-brand-primary' : 'text-brand-gray/70'}`} />
              Tercihler & Bildirimler
            </button>
          </div>
        </div>

        {/* Content Pane */}
        <div className="lg:col-span-3">
          {activeTab === 'info' && <ProfileInfoForm data={data} mutation={profileMutation} />}
          {activeTab === 'security' && <SecurityForm />}
          {activeTab === 'preferences' && <PreferencesForm data={data} mutation={profileMutation} />}
        </div>
      </div>
    </PageContainer>
  );
};

// ================== Subforms ==================

const ProfileInfoForm = ({ data, mutation }: { data: UserProfileDto, mutation: any }) => {
  const { control, handleSubmit } = useForm<UserProfileDto>({ defaultValues: data });
  return (
    <GlassCard noPadding className="overflow-hidden">
      <div className="p-6 md:p-8 space-y-6">
        <h3 className="text-lg font-bold text-brand-dark mb-4 border-b pb-2">Kişisel Bilgiler</h3>
        {mutation.isSuccess && (
          <div className="p-3 bg-status-success/10 text-status-success border border-status-success/20 rounded-lg flex items-center gap-2 text-sm font-medium">
            <CheckCircle className="h-4 w-4" /> Profil bilgileriniz başarıyla güncellendi.
          </div>
        )}
        <form id="profile-info-form" onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Controller name="firstName" control={control} rules={{ required: 'Zorunlu alan' }} render={({ field, fieldState }) => (
              <PremiumInput label="Adınız" error={fieldState.error?.message} {...field} />
            )} />
            <Controller name="lastName" control={control} rules={{ required: 'Zorunlu alan' }} render={({ field, fieldState }) => (
              <PremiumInput label="Soyadınız" error={fieldState.error?.message} {...field} />
            )} />
            <div className="md:col-span-2">
              <Controller name="email" control={control} render={({ field }) => (
                <PremiumInput label="Kurumsal E-Posta" disabled helperText="E-Posta adresinizi değiştirmek için sistem yöneticisine başvurun." {...field} />
              )} />
            </div>
            <Controller name="phoneNumber" control={control} render={({ field }) => (
              <PremiumInput label="Telefon Numarası" {...field} />
            )} />
            <Controller name="title" control={control} render={({ field }) => (
              <PremiumInput label="Ünvan" disabled {...field} />
            )} />
          </div>
        </form>
      </div>
      <div className="px-6 py-4 bg-surface-muted/30 border-t flex justify-end">
        <FfButton form="profile-info-form" type="submit" variant="primary" leftIcon={<Save className="h-4 w-4" />} isLoading={mutation.isPending}>
          Bilgilerimi Kaydet
        </FfButton>
      </div>
    </GlassCard>
  );
};

const PreferencesForm = ({ data, mutation }: { data: UserProfileDto, mutation: any }) => {
  const { control, handleSubmit } = useForm<UserProfileDto>({ defaultValues: data });
  return (
    <GlassCard noPadding className="overflow-hidden">
      <div className="p-6 md:p-8 space-y-6">
        <h3 className="text-lg font-bold text-brand-dark mb-4 border-b pb-2">Sistem Tercihleri ve Bildirimler</h3>
        {mutation.isSuccess && (
          <div className="p-3 bg-status-success/10 text-status-success border border-status-success/20 rounded-lg flex items-center gap-2 text-sm font-medium">
            <CheckCircle className="h-4 w-4" /> Tercihleriniz kaydedildi.
          </div>
        )}
        <form id="preferences-form" onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Controller name="language" control={control} render={({ field }) => (
              <PremiumSelect label="Uygulama Dili" {...field}>
                <option value="tr">Türkçe</option>
                <option value="en">English (US)</option>
              </PremiumSelect>
            )} />
            <Controller name="theme" control={control} render={({ field }) => (
              <PremiumSelect label="Görünüm Teması" {...field}>
                <option value="light">Açık Tema (Light)</option>
                <option value="dark">Koyu Tema (Dark)</option>
                <option value="system">Sistem Varsayılanı</option>
              </PremiumSelect>
            )} />
          </div>
          <div className="pt-4 mt-6 border-t space-y-4">
            <h4 className="text-sm font-bold text-brand-dark">Bildirim Seçenekleri</h4>
            <div className="p-4 bg-surface-muted/20 border rounded-lg space-y-4">
              <Controller name="emailNotifications" control={control} render={({ field }) => (
                <PremiumCheckbox label="E-Posta bildirimleri al" helperText="Onay talepleri ve süreç hatırlatmaları e-posta olarak gönderilir." checked={field.value} onChange={field.onChange} />
              )} />
            </div>
          </div>
        </form>
      </div>
      <div className="px-6 py-4 bg-surface-muted/30 border-t flex justify-end">
        <FfButton form="preferences-form" type="submit" variant="primary" leftIcon={<Save className="h-4 w-4" />} isLoading={mutation.isPending}>
          Tercihleri Kaydet
        </FfButton>
      </div>
    </GlassCard>
  );
};

const SecurityForm = () => {
  const { control, handleSubmit, reset } = useForm({ defaultValues: { currentPass: '', newPass: '', confirmPass: '' }});
  const passMutation = useMutation({
    mutationFn: async (d: any) => settingsService.changePassword(d.currentPass, d.newPass),
    onSuccess: () => reset()
  });

  const onSubmit = (d: any) => {
    if (d.newPass !== d.confirmPass) {
      alert("Yeni şifreler eşleşmiyor.");
      return;
    }
    passMutation.mutate(d);
  };

  return (
    <GlassCard noPadding className="overflow-hidden">
      <div className="p-6 md:p-8 space-y-6">
        <h3 className="text-lg font-bold text-brand-dark mb-4 border-b pb-2">Şifre Değiştir</h3>
        {passMutation.isSuccess && (
          <div className="p-3 bg-status-success/10 text-status-success border border-status-success/20 rounded-lg flex items-center gap-2 text-sm font-medium">
            <CheckCircle className="h-4 w-4" /> Şifreniz başarıyla değiştirildi.
          </div>
        )}
        <form id="security-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-sm">
          <Controller name="currentPass" control={control} rules={{ required: 'Zorunlu alan' }} render={({ field, fieldState }) => (
            <PremiumInput label="Mevcut Şifre" type="password" error={fieldState.error?.message} {...field} />
          )} />
          <div className="pt-4 space-y-6">
            <Controller name="newPass" control={control} rules={{ required: 'Zorunlu alan', minLength: { value: 6, message: 'En az 6 karakter olmalıdır' } }} render={({ field, fieldState }) => (
              <PremiumInput label="Yeni Şifre" type="password" error={fieldState.error?.message} {...field} />
            )} />
            <Controller name="confirmPass" control={control} rules={{ required: 'Zorunlu alan' }} render={({ field, fieldState }) => (
              <PremiumInput label="Yeni Şifre (Tekrar)" type="password" error={fieldState.error?.message} {...field} />
            )} />
          </div>
        </form>
      </div>
      <div className="px-6 py-4 bg-surface-muted/30 border-t flex justify-end">
        <FfButton form="security-form" type="submit" variant="primary" leftIcon={<Lock className="h-4 w-4" />} isLoading={passMutation.isPending}>
          Şifreyi Güncelle
        </FfButton>
      </div>
    </GlassCard>
  );
};
