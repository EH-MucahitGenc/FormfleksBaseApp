import React, { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { z } from 'zod';
import { AlertCircle, ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react';
import { FfTextField } from '@/components/dev-extreme/FfFormLayout';
import { FfButton } from '@/components/ui/index';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../store/useAuthStore';

const loginSchema = z.object({
  username: z.string().min(1, 'Kullanıcı adı zorunludur'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
});

type LoginInputs = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';
  const setCredentials = useAuthStore((state) => state.setCredentials);

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL || '/api'}/public/system-status`);
        setIsMaintenance(Boolean(response.data?.maintenanceMode));
      } catch (error) {
        console.error('Could not fetch system status', error);
      }
    };

    checkMaintenance();
  }, []);

  const methods = useForm<LoginInputs>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = async (data: LoginInputs) => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const response = await authService.login(data.username, data.password);
      setCredentials(response.user, response.token, response.refreshToken);
      navigate(from, { replace: true });
    } catch (error: any) {
      setErrorMsg(error.message || 'Sunucu bağlantı hatası oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ff-login-panel animate-in fade-in slide-in-from-bottom-3 flex w-full flex-col duration-500">
      <div className="ff-login-heading mb-7">
        <div className="mb-5 flex items-center justify-between">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#fff0e8] text-[#f36c2f] shadow-[inset_0_0_0_1px_rgba(255,122,61,0.10)]">
            <LockKeyhole className="h-5 w-5" />
          </span>
          <span className="rounded-full bg-[#f5f3f1] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-[#81746d]">
            Kurumsal erişim
          </span>
        </div>
        <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#f36c2f]">Tekrar hoş geldiniz</p>
        <h1 className="text-[32px] font-black leading-tight tracking-[-0.045em] text-[#211a17]">Çalışma alanınıza giriş yapın.</h1>
        <p className="mt-3 max-w-[360px] text-sm font-medium leading-6 text-[#756963]">
          Formlarınız, onay akışlarınız ve bekleyen işleriniz kaldığı yerden hazır.
        </p>
      </div>

      {isMaintenance && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="text-sm font-black text-red-700">Sistem bakım modunda</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-red-600/80">Şu anda yalnızca Admin yetkisine sahip kullanıcılar giriş yapabilir.</p>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-3.5">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <p className="text-sm font-semibold text-red-700">{errorMsg}</p>
        </div>
      )}

      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <FfTextField
            name="username"
            label="Kullanıcı Adı"
            placeholder="ad.soyad"
            autoComplete="username"
            required
          />

          <div className="relative">
            <FfTextField
              name="password"
              label="Şifre"
              placeholder="••••••••"
              mode={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-3 top-8 z-[5] grid h-8 w-8 place-items-center rounded-lg text-[#8b7e77] transition-colors hover:bg-[#fff0e8] hover:text-[#f36c2f]"
              aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <FfButton
            type="submit"
            variant="primary"
            size="lg"
            className="group mt-1 h-[52px] w-full text-[15px] font-black shadow-[0_16px_34px_rgba(255,113,56,0.25)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(255,113,56,0.32)]"
            isLoading={isSubmitting}
          >
            <span className="flex items-center justify-center gap-2">
              Oturum Aç
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </FfButton>
        </form>
      </FormProvider>

      <div className="ff-login-security mt-6 flex items-center gap-3 rounded-2xl border border-[#ebe6e2] bg-[#faf9f8] px-4 py-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
          <ShieldCheck className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[11px] font-black text-[#332a26]">Kimliğiniz kurum içinde doğrulanır</p>
          <p className="mt-0.5 text-[10px] font-semibold text-[#8b7e77]">Formfleks parola bilginizi saklamaz.</p>
        </div>
      </div>
    </div>
  );
};
