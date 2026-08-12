import React from 'react';
import { Outlet } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  FileCheck2,
  FileText,
  GitBranch,
  GripVertical,
  Layers3,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';

const workflowSteps = [
  { label: 'Form yayına alındı', meta: 'Tek tıkla kullanımda', state: 'complete' },
  { label: 'Rol bazlı onay', meta: 'Doğru kişiye otomatik atanır', state: 'active' },
  { label: 'Süreç tamamlanır', meta: 'Anlık bildirim ve kayıt', state: 'waiting' },
];

export const AuthLayout: React.FC = () => {
  return (
    <main className="ff-auth-shell relative min-h-screen overflow-hidden bg-[#f2f4f7] text-[#201a17] lg:h-screen">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(255,122,61,0.16),transparent_28%),radial-gradient(circle_at_78%_88%,rgba(14,165,133,0.10),transparent_24%),linear-gradient(140deg,#fffaf6_0%,#f4f6f8_48%,#e9eef4_100%)]" />
      <div className="ff-auth-grid absolute inset-0 opacity-50" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1660px] lg:h-screen lg:grid-cols-[minmax(0,1fr)_480px]">
        <section className="relative hidden min-h-screen overflow-hidden px-10 py-10 lg:flex lg:h-screen xl:px-16 xl:py-12">
          <div className="relative z-10 flex w-full flex-col">
            <header className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#201a17] text-white shadow-[0_12px_30px_rgba(32,26,23,0.18)]">
                  <Layers3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-black tracking-[-0.02em]">Formfleks Workspace</p>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8b7e77]">Süreç tasarım merkezi</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/90 bg-white/70 px-3 py-2 shadow-sm backdrop-blur-xl">
                <span className="ff-auth-live-dot h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-black text-emerald-700">Sistem hazır</span>
              </div>
            </header>

            <div className="my-auto grid items-center gap-8 xl:grid-cols-[minmax(280px,0.72fr)_minmax(520px,1.28fr)]">
              <div className="relative z-10 max-w-[500px]">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#ff7a3d]/20 bg-white/75 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#df5e22] shadow-sm backdrop-blur-md">
                  <Sparkles className="h-3.5 w-3.5" />
                  Formdan karara
                </div>
                <h1 className="max-w-[560px] text-[clamp(3rem,4.4vw,5.4rem)] font-black leading-[0.92] tracking-[-0.065em] text-[#211a17]">
                  İşler beklemez.
                  <span className="mt-2 block bg-gradient-to-r from-[#ff6f32] via-[#ef814e] to-[#0aa47f] bg-clip-text text-transparent">
                    Akışa dönüşür.
                  </span>
                </h1>
                <p className="mt-7 max-w-[470px] text-base font-medium leading-7 text-[#756963]">
                  Formunu tasarla, karar rotasını kur ve doğru kişiye ulaştır. Formfleks, operasyonu tek bir kontrollü çalışma alanında toplar.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-2 text-xs font-black text-[#625650]">
                  {['Tasarla', 'Yayına al', 'Onaya sun'].map((label, index) => (
                    <React.Fragment key={label}>
                      <span className="rounded-full border border-white bg-white/75 px-4 py-2 shadow-sm backdrop-blur-md">{label}</span>
                      {index < 2 && <ArrowRight className="h-3.5 w-3.5 text-[#ff7a3d]" />}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <div className="relative mx-auto h-[590px] w-full max-w-[720px]">
                <div className="ff-auth-orbit absolute left-1/2 top-1/2 h-[540px] w-[540px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#ff7a3d]/10" />
                <div className="absolute left-1/2 top-1/2 h-[410px] w-[410px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40 blur-2xl" />

                <div className="ff-auth-form-card absolute left-0 top-[70px] w-[430px] overflow-hidden rounded-[28px] border border-white/90 bg-white/88 shadow-[0_34px_80px_-24px_rgba(55,37,28,0.30)] backdrop-blur-2xl">
                  <div className="flex items-center justify-between border-b border-[#eee8e3] px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#fff0e8] text-[#f36c2f]">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f36c2f]">Form Studio</p>
                        <p className="text-sm font-black">Akıllı Talep Formu</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-700">Canlı</span>
                  </div>

                  <div className="space-y-3 p-5">
                    {[
                      ['Akıllı Alanlar', 'Veri kaynağından otomatik dolar'],
                      ['Koşullu Kurallar', 'Yanıta göre form şekillenir'],
                      ['Kurumsal Kontrol', 'Zorunlu alanlar anında doğrulanır'],
                    ].map(([label, value], index) => (
                      <div key={label} className="ff-auth-field flex items-center gap-3 rounded-2xl border border-[#ece6e1] bg-[#fbfaf9] p-3" style={{ animationDelay: `${180 + index * 120}ms` }}>
                        <GripVertical className="h-4 w-4 text-[#c4b9b2]" />
                        <div className="flex-1">
                          <p className="text-[9px] font-black uppercase tracking-[0.13em] text-[#a2948c]">{label}</p>
                          <p className="mt-1 text-xs font-extrabold text-[#332a26]">{value}</p>
                        </div>
                        <Check className="h-4 w-4 text-emerald-600" />
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-[#8b7e77]">
                        <Users className="h-3.5 w-3.5" />
                        3 onay adımı
                      </div>
                      <div className="flex items-center gap-2 rounded-xl bg-[#ff7138] px-4 py-2.5 text-[11px] font-black text-white shadow-[0_10px_24px_rgba(255,113,56,0.25)]">
                        Akışa gönder
                        <Send className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="ff-auth-connector absolute left-[390px] top-[268px] h-[2px] w-[100px] bg-gradient-to-r from-[#ff7a3d] to-[#11a47f]">
                  <span className="absolute -top-[3px] h-2 w-2 rounded-full bg-white shadow-[0_0_0_2px_#ff7a3d]" />
                  <span className="ff-auth-flow-dot absolute -top-1 h-2.5 w-2.5 rounded-full bg-[#ff7a3d] shadow-[0_0_0_5px_rgba(255,122,61,0.12)]" />
                </div>

                <div className="ff-auth-workflow-card absolute bottom-[44px] right-0 w-[330px] overflow-hidden rounded-[26px] border border-white/90 bg-[#20332e]/95 text-white shadow-[0_34px_80px_-24px_rgba(20,58,48,0.36)] backdrop-blur-2xl">
                  <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-[#65e3bd]">
                        <GitBranch className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#72d8b8]">Onay rotası</p>
                        <p className="text-sm font-black">Dinamik Onay Akışı</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-white/50">3 adım</span>
                  </div>

                  <div className="space-y-1 p-4">
                    {workflowSteps.map((step, index) => (
                      <div key={step.label} className="relative flex gap-3 rounded-2xl px-2 py-2.5">
                        {index < workflowSteps.length - 1 && <span className="absolute left-[21px] top-9 h-6 w-px bg-white/15" />}
                        <span className={`relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border ${step.state === 'complete' ? 'border-emerald-400/30 bg-emerald-400/15 text-emerald-300' : step.state === 'active' ? 'ff-auth-active-step border-[#ff9667] bg-[#ff7a3d] text-white' : 'border-white/15 bg-white/5 text-white/35'}`}>
                          {step.state === 'complete' ? <Check className="h-3.5 w-3.5" /> : index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-black ${step.state === 'waiting' ? 'text-white/45' : 'text-white'}`}>{step.label}</p>
                          <p className="mt-0.5 text-[10px] font-semibold text-white/40">{step.meta}</p>
                        </div>
                        {step.state === 'active' && <span className="self-center rounded-full bg-[#ff7a3d]/15 px-2 py-1 text-[9px] font-black text-[#ffad88]">Bekliyor</span>}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="ff-auth-publish-card absolute right-[26px] top-[34px] flex items-center gap-3 rounded-2xl border border-white/90 bg-white/90 px-4 py-3 shadow-[0_18px_40px_rgba(35,46,43,0.13)] backdrop-blur-xl">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                    <FileCheck2 className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-emerald-700">Yayın durumu</p>
                    <p className="text-xs font-black">Kullanıma hazır</p>
                  </div>
                </div>
              </div>
            </div>

            <footer className="flex items-center justify-between border-t border-[#dcdfe3]/70 pt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#9a8f89]">
              <span>Kurumsal form ve onay platformu</span>
              <span>© {new Date().getFullYear()} Formfleks</span>
            </footer>
          </div>
        </section>

        <aside className="relative z-20 flex min-h-screen items-center justify-center border-white/80 bg-white/62 px-4 py-4 shadow-[-20px_0_70px_rgba(26,37,48,0.06)] backdrop-blur-2xl sm:px-7 lg:h-screen lg:border-l lg:px-8 lg:py-5 xl:px-10">
          <div className="w-full max-w-[430px]">
            <div className="ff-auth-brand-row mb-5 flex items-center justify-between lg:mb-8">
              <div className="flex items-center gap-2.5">
                <img src="/erkurtlogo.svg" alt="Erkurt Holding" className="h-7 w-auto object-contain" />
                <span className="h-5 w-px bg-[#ded8d3]" />
                <img src="/logo.svg" alt="Formfleks" className="h-8 w-auto object-contain" />
              </div>
              <div className="hidden items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50/80 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-700 min-[440px]:flex">
                <ShieldCheck className="h-3 w-3" />
                Güvenli
              </div>
            </div>

            <div className="mb-5 rounded-[24px] border border-[#ffe1d2] bg-[linear-gradient(135deg,#fff7f2,#ffffff_62%,#effbf7)] p-4 lg:hidden">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#ff7a3d] text-white shadow-[0_10px_20px_rgba(255,122,61,0.22)]">
                  <GitBranch className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#e9652b]">Formfleks Workspace</p>
                  <p className="mt-0.5 text-sm font-black">Tasarla · Yayınla · Onaya sun</p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
            </div>

            <div className="ff-auth-login-card rounded-[32px] border border-white bg-white/92 p-6 shadow-[0_34px_90px_-28px_rgba(35,30,27,0.30)] backdrop-blur-xl sm:p-8">
              <Outlet />
            </div>

            <div className="mt-6 flex items-center justify-center gap-2 text-[10px] font-bold text-[#9c918b]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Active Directory ile korunan kurumsal erişim
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
};
