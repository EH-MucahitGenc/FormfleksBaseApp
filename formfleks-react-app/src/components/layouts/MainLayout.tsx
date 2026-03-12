import { Outlet } from 'react-router-dom';
import { Search, Bell } from 'lucide-react';
import { useState } from 'react';
import { DynamicSidebar } from './DynamicSidebar';

// ----------------------------------------------------------------------
// Main Application Layout
// ----------------------------------------------------------------------
export const MainLayout: React.FC = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen w-full bg-surface-ground overflow-hidden">
      
      {/* Sidebar */}
      <DynamicSidebar 
        isSidebarOpen={isSidebarOpen} 
        setSidebarOpen={setSidebarOpen} 
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-surface-ground">
        
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-surface-muted flex items-center justify-between px-6 shrink-0 relative z-10 shadow-sm">
          {/* Left: Mobile Toggle & Global Search */}
          <div className="flex items-center gap-4 flex-1">
            <div className="relative max-w-md w-full hidden md:block group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-gray group-focus-within:text-brand-primary transition-colors" />
              <input 
                type="text" 
                placeholder="Platformda ara (Ekranlar, Formlar, Kullanıcılar)..." 
                className="w-full pl-9 pr-4 py-2 bg-surface-muted border-transparent rounded-lg text-sm focus:bg-white focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all outline-none text-brand-dark"
              />
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3 shrink-0">
            <button className="relative p-2 text-brand-gray hover:bg-surface-muted rounded-full transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-status-danger rounded-full ring-2 ring-white"></span>
            </button>
          </div>
        </header>

        {/* Page Content Rendered Here */}
        <main className="flex-1 overflow-y-auto w-full p-4 md:p-6 lg:p-8">
           <Outlet />
        </main>
      </div>
      
    </div>
  );
};
