import { useEffect } from 'react';
import { Settings, RefreshCcw } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

export default function Maintenance() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useEffect(() => {
    // If the user is an admin, they shouldn't be trapped here
    if (user?.roles?.includes('Admin') || user?.roles?.includes('SystemAdmin')) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleRetry = async () => {
    try {
      // Just make a dummy request to check if maintenance is over
      // If it's over, it will succeed (200), if not it will 503 again
      await api.get('/auth/me'); 
      navigate('/');
    } catch (e) {
      // Still in maintenance
    }
  };

  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 bg-brand-primary/10 rounded-full animate-ping"></div>
          <div className="relative bg-surface-base rounded-full p-4 border border-surface-muted shadow-sm">
            <Settings className="w-12 h-12 text-brand-primary animate-[spin_3s_linear_infinite]" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-black tracking-tight text-brand-dark">
            Bakım Molası
          </h1>
          <p className="text-brand-gray/80 font-medium">
            Sistemimizde planlı bir bakım ve iyileştirme çalışması yapıyoruz. Daha iyi bir deneyim için kısa süreliğine hizmet veremiyoruz.
          </p>
        </div>

        <div className="pt-8">
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 bg-brand-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-brand-secondary transition-all hover:scale-105 active:scale-95 shadow-md shadow-brand-primary/20"
          >
            <RefreshCcw className="w-5 h-5" />
            Tekrar Dene
          </button>
        </div>

        <div className="pt-4 border-t border-surface-muted mt-8 flex flex-col items-center gap-2">
           <p className="text-xs text-brand-gray">Yetkili misiniz?</p>
           <Link to="/auth/login" className="text-sm font-bold text-brand-primary hover:underline">
             Yönetici Girişi Yapın
           </Link>
        </div>
      </div>
    </div>
  );
}
