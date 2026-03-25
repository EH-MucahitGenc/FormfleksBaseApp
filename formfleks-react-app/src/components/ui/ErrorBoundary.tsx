import React, { Component, type ErrorInfo } from 'react';
import { ShieldAlert, RefreshCcw, Home } from 'lucide-react';
import { FfButton } from '@/components/ui/index';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface-ground flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full bg-surface-base rounded-2xl shadow-xl border border-status-danger/20 p-8 text-center animate-in zoom-in-95 duration-300">
            <div className="mx-auto w-16 h-16 bg-status-danger/10 text-status-danger rounded-full flex items-center justify-center mb-6">
              <ShieldAlert className="h-8 w-8" />
            </div>
            
            <h1 className="text-2xl font-black text-brand-dark mb-2 tracking-tight">
              Beklenmedik Bir Hata Oluştu
            </h1>
            
            <p className="text-brand-gray text-sm mb-6 leading-relaxed">
              İşleminiz sırasında teknik bir sorunla karşılaştık. Lütfen sayfayı yenileyin veya ana sayfaya dönün. Sorun devam ederse sistem yöneticisine başvurun.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <div className="mb-6 p-4 bg-surface-muted/50 rounded-lg text-left overflow-auto border text-xs text-status-danger font-mono max-h-32">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <FfButton 
                variant="outline" 
                onClick={() => window.location.reload()}
                leftIcon={<RefreshCcw className="h-4 w-4" />}
              >
                Sayfayı Yenile
              </FfButton>
              <FfButton 
                variant="primary" 
                onClick={() => window.location.href = '/'}
                leftIcon={<Home className="h-4 w-4" />}
              >
                Ana Sayfaya Dön
              </FfButton>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
