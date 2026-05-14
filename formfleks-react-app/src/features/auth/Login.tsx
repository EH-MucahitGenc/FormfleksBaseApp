import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form'; // Fixed the import
import { FfTextField } from '@/components/dev-extreme/FfFormLayout';
import { FfButton } from '@/components/ui/index';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../store/useAuthStore';

const loginSchema = z.object({
  username: z.string().min(1, 'Kullanıcı adı zorunludur'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır')
});

type LoginInputs = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const setCredentials = useAuthStore((state) => state.setCredentials);

  const methods = useForm<LoginInputs>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' }
  });

  const onSubmit = async (data: LoginInputs) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const response = await authService.login(data.username, data.password);
      
      // Save user to global state (Zustand persists to localStorage)
      setCredentials(response.user, response.token, response.refreshToken);
      
      // Wait a moment for Zustand to persist before redirecting
      navigate(from, { replace: true });
    } catch (error: any) {
       setErrorMsg(error.message || 'Sunucu bağlantı hatası oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full flex-col flex gap-7 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Form Context Title */}
      <div className="text-center">
        <h3 className="text-xl font-bold tracking-tight text-brand-dark">Kimlik Doğrulama</h3>
        <p className="text-sm text-brand-gray mt-1.5">
          Devam etmek için Active Directory kullanıcı adı ve şifrenizle giriş yapın.
        </p>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="bg-status-danger/10 border border-status-danger/20 rounded-xl p-3 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-status-danger shrink-0 mt-0.5" />
          <p className="text-sm text-status-danger font-semibold">{errorMsg}</p>
        </div>
      )}

      {/* Form */}
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="flex flex-col gap-5">
           <FfTextField 
             name="username" 
             label="Kullanıcı Adı" 
             placeholder="ad.soyad" 
             autoComplete="username"
             required 
           />

           {/* Password with eye icon */}
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
               onClick={() => setShowPassword(!showPassword)}
               className="absolute right-3 top-8 text-brand-gray hover:text-brand-primary transition-colors"
               style={{ zIndex: 5 }}
             >
               {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
             </button>
           </div>



           <FfButton 
             type="submit" 
             variant="primary" 
             size="lg" 
             className="w-full mt-4 h-12 text-[15px] font-bold shadow-md hover:shadow-lg transition-all"
             isLoading={isSubmitting}
           >
             Oturum Aç
           </FfButton>
        </form>
      </FormProvider>
    </div>
  );
};
