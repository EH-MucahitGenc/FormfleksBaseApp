import { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LogOut, LayoutDashboard, FileText, Settings, Building2, 
  Users, LayoutTemplate, Route, 
  ChevronLeft, Shield, CheckSquare, User, Activity, UserCheck 
} from 'lucide-react';
import { cn } from '@/components/ui';
import { useAuthStore } from '@/store/useAuthStore';
import { authService } from '@/services/auth.service';
import { useNavigationStore } from '@/store/useNavigationStore';

export const NavItem = ({ to, icon: Icon, label, isCollapsed }: { to: string, icon: any, label: string, isCollapsed: boolean }) => (
  <NavLink
    to={to}
    className={({ isActive }) => cn(
      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group",
      isActive 
        ? "bg-brand-primary/10 text-brand-primary font-semibold sidebar-active-indicator" 
        : "text-brand-gray hover:bg-brand-primary/10 hover:text-brand-primary"
    )}
    title={isCollapsed ? label : undefined}
  >
    <Icon className={cn("shrink-0", isCollapsed ? "h-6 w-6 mx-auto" : "h-5 w-5")} />
    {!isCollapsed && <span className="font-medium text-sm whitespace-nowrap">{label}</span>}
  </NavLink>
);

export const DynamicSidebar = ({ 
  isSidebarOpen, 
  setSidebarOpen 
}: { 
  isSidebarOpen: boolean; 
  setSidebarOpen: (val: boolean) => void 
}) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { authorizedForms, isLoading, fetchAuthorizedForms } = useNavigationStore();
  
  const userRoles = user?.roles || [];
  const isAdmin = userRoles.includes('Admin') || userRoles.includes('ADMIN') || userRoles.includes('admin');
  const isHR = userRoles.includes('IK') || userRoles.includes('HR') || userRoles.includes('HumanResources');
  const canSeeDesigners = isAdmin || isHR;

  // Open the forms section automatically if we are currently viewing a form
  const [isFormsExpanded, setIsFormsExpanded] = useState(() => location.pathname.includes('/forms/d/'));
  const [formSearch, setFormSearch] = useState('');

  const filteredForms = authorizedForms.filter(f => f.name.toLocaleLowerCase('tr-TR').includes(formSearch.toLocaleLowerCase('tr-TR')));

  useEffect(() => {
    fetchAuthorizedForms();
  }, [fetchAuthorizedForms]);

  const handleLogout = async () => {
    await authService.logout();
    navigate('/auth/login', { replace: true });
  };



  return (
    <aside 
      className={cn(
        "bg-surface-base border-r border-surface-muted flex flex-col transition-all duration-300 ease-in-out relative z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]",
        isSidebarOpen ? "w-64" : "w-20"
      )}
    >
      {/* Sidebar Header / Logo */}
      <div className="h-16 flex items-center justify-center border-b border-surface-muted px-4 shrink-0">
        <div className="flex items-center justify-center w-full h-full py-4 text-brand-dark overflow-hidden whitespace-nowrap">
          <img 
            src="/logo.svg" 
            alt="Formfleks Logo" 
            className={cn("object-contain transition-all duration-300", isSidebarOpen ? "h-8 w-auto px-2" : "h-6 w-auto")} 
          />
        </div>
      </div>

      {/* Sidebar Navigation */}
      <div className="flex-1 overflow-y-auto py-6 px-3 flex flex-col gap-1.5 scrollbar-thin">
        <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" isCollapsed={!isSidebarOpen} />
        <NavItem to="/approvals" icon={CheckSquare} label="Onaylarım" isCollapsed={!isSidebarOpen} />
        
        {/* Dynamic Forms Section (Collapsible) */}
        {!isSidebarOpen && <div className="mt-2 mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-brand-gray/50 text-center">Formlar</div>}
        
        <div className="flex flex-col gap-1">
          <button 
            onClick={() => {
              if (!isSidebarOpen) setSidebarOpen(true);
              setIsFormsExpanded(!isFormsExpanded);
            }}
            className={cn(
              "flex items-center justify-between px-3 py-2.5 rounded-lg transition-all group w-full",
              isFormsExpanded && isSidebarOpen ? "bg-brand-primary/5 text-brand-primary" : "text-brand-gray hover:bg-brand-primary/10 hover:text-brand-primary"
            )}
            title={!isSidebarOpen ? "Kurumsal Formlar" : undefined}
          >
            <div className="flex items-center gap-3">
               <FileText className={cn("shrink-0", !isSidebarOpen ? "h-6 w-6 mx-auto text-brand-primary" : "h-5 w-5")} />
               {isSidebarOpen && <span className="font-medium text-sm whitespace-nowrap">Kurumsal Formlar</span>}
            </div>
            {isSidebarOpen && <ChevronLeft className={cn("h-4 w-4 transition-transform text-brand-gray/50", isFormsExpanded ? "-rotate-90" : "")} />}
          </button>
          
          {isFormsExpanded && isSidebarOpen && (
            <div className="flex flex-col gap-1 mt-1 pl-4 bg-surface-muted/30 py-2 rounded-lg border-l-2 border-brand-primary/20 ml-2">
              <div className="px-3 mb-2">
                <input
                  type="text"
                  placeholder="Formlarda ara..."
                  className="w-full bg-white border border-surface-muted rounded-md px-2 py-1.5 text-xs focus:outline-none focus:border-brand-primary transition-colors placeholder:text-brand-gray/50"
                  value={formSearch}
                  onChange={(e) => setFormSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()} // Prevent sidebar toggle if clicked inside
                />
              </div>
              {isLoading ? (
                <div className="px-3 animate-pulse flex flex-col gap-3 py-2">
                   <div className="h-4 bg-surface-muted rounded-md w-3/4"></div>
                   <div className="h-4 bg-surface-muted rounded-md w-1/2"></div>
                </div>
              ) : filteredForms.length === 0 ? (
                <div className="text-xs text-brand-gray/60 px-4 py-2 italic font-medium">Form bulunamadı.</div>
              ) : (
                filteredForms.map(form => (
                  <NavLink
                    key={form.code}
                    to={`/forms/d/${form.code}`}
                    className={({ isActive }: any) => cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm",
                      isActive 
                        ? "bg-brand-primary/10 text-brand-primary font-semibold" 
                        : "text-brand-gray hover:bg-surface-hover hover:text-brand-dark"
                    )}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-current opacity-50"></div>
                    <span className="truncate">{form.name}</span>
                  </NavLink>
                ))
              )}
            </div>
          )}
        </div>
        
        {canSeeDesigners && (
          <>
            <div className="mt-4 mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-brand-gray/50 hidden md:block">Sistem & Araçlar</div>
            <NavItem to="/admin/form-designer" icon={LayoutTemplate} label="Form Tasarımcısı" isCollapsed={!isSidebarOpen} />
            <NavItem to="/admin/workflow-designer" icon={Route} label="Onay Rotaları" isCollapsed={!isSidebarOpen} />
          </>
        )}

        {isAdmin && (
          <>
            <div className="mt-4 mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-brand-gray/50 hidden md:block">Yönetim</div>
            <NavItem to="/users" icon={Users} label="Kullanıcılar" isCollapsed={!isSidebarOpen} />
            <NavItem to="/admin/roles" icon={Shield} label="Yetki Rolleri" isCollapsed={!isSidebarOpen} />
            <NavItem to="/admin/departments" icon={Building2} label="Departmanlar" isCollapsed={!isSidebarOpen} />
            <NavItem to="/admin/personnel-sync" icon={Users} label="Personel Senkronizasyonu" isCollapsed={!isSidebarOpen} />
            <NavItem to="/admin/audit-logs" icon={Activity} label="Sistem Logları" isCollapsed={!isSidebarOpen} />
          </>
        )}
        
        <div className="mt-auto pt-4 border-t border-surface-muted">
          <NavItem to="/settings/profile" icon={User} label="Profilim" isCollapsed={!isSidebarOpen} />
          <NavItem to="/settings/delegations" icon={UserCheck} label="Vekalet Devri" isCollapsed={!isSidebarOpen} />
          <NavItem to="/admin/system-settings" icon={Settings} label="Sistem Ayarları" isCollapsed={!isSidebarOpen} />
        </div>
      </div>

      {/* Sidebar Footer / User Profile */}
      <div className="p-4 border-t border-surface-muted">
        <div className={cn("flex items-center gap-3", !isSidebarOpen && "justify-center")}>
          <div className="h-10 w-10 shrink-0 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-sm uppercase">
            {user?.firstName?.charAt(0) || 'M'}{user?.lastName?.charAt(0) || 'G'}
          </div>
          {isSidebarOpen && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <span className="text-sm font-semibold text-brand-dark truncate">
                {user ? `${user.firstName} ${user.lastName}` : 'Kullanıcı'}
              </span>
              <span className="text-xs text-brand-gray truncate">
                {user?.roles?.[0] || 'Kullanıcı'}
              </span>
            </div>
          )}
          {isSidebarOpen && (
            <button 
              onClick={() => navigate('/settings/profile')}
              className="p-1.5 text-brand-gray hover:text-brand-primary hover:bg-brand-primary/10 rounded-md transition-colors"
              title="Profilim"
            >
              <User className="h-4 w-4" />
            </button>
          )}
          {isSidebarOpen && (
            <button 
              onClick={handleLogout}
              className="p-1.5 text-brand-gray hover:text-status-danger hover:bg-status-danger/10 rounded-md transition-colors ml-1"
              title="Çıkış Yap"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Sidebar Toggle Button */}
      <button 
        onClick={() => setSidebarOpen(!isSidebarOpen)}
        className="absolute -right-3 top-20 bg-surface-base border border-surface-muted shadow-sm rounded-full p-1 text-brand-gray hover:text-brand-primary transition-colors flex items-center justify-center z-30"
      >
        <ChevronLeft className={cn("h-4 w-4 transition-transform", !isSidebarOpen && "rotate-180")} />
      </button>
    </aside>
  );
};
