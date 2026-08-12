import { Outlet } from 'react-router-dom';
import { Search, Moon, Sun } from 'lucide-react';
import { useState, useEffect } from 'react';
import { DynamicSidebar } from './DynamicSidebar';
import { NotificationBell } from './NotificationBell';

export const MainLayout: React.FC = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() =>
    typeof window !== 'undefined' && window.localStorage.getItem('theme') === 'dark'
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    const nextMode = !isDarkMode;
    localStorage.setItem('theme', nextMode ? 'dark' : 'light');
    setIsDarkMode(nextMode);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-premium-mesh">
      <DynamicSidebar
        isSidebarOpen={isSidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      <div className="flex min-w-0 flex-1 flex-col bg-transparent">
        <header className="relative z-10 shrink-0 border-b border-surface-muted/80 bg-surface-base/80 backdrop-blur-sm glass-glow">
          <div className="flex h-14 w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-1 items-center gap-4">
              <div className="group relative hidden w-full max-w-[420px] md:block">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-gray transition-colors group-focus-within:text-brand-primary" />
                <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-surface-muted bg-surface-base px-2 py-0.5 text-[11px] font-medium text-brand-gray/80 xl:inline-flex">
                  Ctrl + K
                </span>
                <input
                  type="text"
                  placeholder="Platformda ara..."
                  className="w-full rounded-lg border border-surface-muted bg-surface-ground py-2 pl-9 pr-20 text-sm text-brand-dark outline-none transition-all focus:border-brand-primary focus:bg-surface-base focus:ring-2 focus:ring-brand-primary/10"
                />
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 rounded-xl border border-surface-muted/80 bg-surface-base px-2 py-1">
              <button
                onClick={toggleDarkMode}
                className="rounded-lg p-2 text-brand-gray transition-colors hover:bg-surface-hover hover:text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                title={isDarkMode ? 'Aydınlık Moda Geç' : 'Karanlık Moda Geç'}
              >
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <NotificationBell />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="w-full px-1 py-1 md:px-2">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
