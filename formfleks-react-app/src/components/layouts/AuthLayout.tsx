import React from 'react';
import { Outlet } from 'react-router-dom';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-surface-ground flex items-center justify-center relative overflow-hidden p-4">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#f8fafc] via-[#e2e8f0] to-[#cbd5e1] opacity-100"></div>
      <div className="absolute top-1/4 -left-32 w-[600px] h-[600px] bg-brand-primary rounded-full mix-blend-multiply filter blur-[150px] opacity-20 animate-pulse" style={{ animationDuration: '8s' }}></div>
      <div className="absolute bottom-1/4 -right-32 w-[600px] h-[600px] bg-brand-accent rounded-full mix-blend-multiply filter blur-[130px] opacity-15 animate-pulse delay-1000" style={{ animationDuration: '10s' }}></div>
      
      {/* Central Premium Card */}
      <div className="relative z-10 w-full max-w-[480px] bg-surface-base/80 backdrop-blur-xl shadow-[0_32px_80px_-12px_rgba(0,0,0,0.15)] border border-white/60 rounded-3xl overflow-hidden flex flex-col transform transition-all duration-700 mt-[-5%] sm:mt-0">
        
        {/* Logo Header */}
        <div className="bg-gradient-to-b from-white to-surface-hover/30 px-8 pt-12 pb-8 flex flex-col items-center justify-center border-b border-surface-muted/40 relative">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-primary via-brand-accent to-brand-primary"></div>
           
           <div className="mb-5 bg-surface-base p-3.5 rounded-2xl shadow-soft border border-surface-muted/50 transition-transform hover:scale-105 duration-300">
             <img src="/logo.svg" alt="Formfleks Logo" className="w-auto h-12 object-contain" />
           </div>
           
           <h2 className="text-xl text-center font-black tracking-tight text-brand-dark">Kurumsal Form ve Onay Platformu</h2>
           <p className="text-sm text-brand-gray/80 mt-1.5 font-semibold tracking-wide uppercase">Süreç Yönetimi</p>
        </div>

        {/* Form Content Area */}
        <div className="px-8 py-8 md:px-10 bg-surface-base">
          <Outlet />
        </div>
      </div>
      
      {/* Global Footer */}
      <div className="absolute bottom-8 left-0 right-0 text-center text-brand-gray/50 text-[11px] z-10 font-bold tracking-widest uppercase">
        &copy; {new Date().getFullYear()} Formfleks Yazılım Geliştirme.
      </div>
    </div>
  );
};
