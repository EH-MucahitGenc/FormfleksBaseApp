import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  BarChart2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Database,
  FilePlus2,
  FileText,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Route,
  Search,
  Settings,
  Shield,
  User,
  UserCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/components/ui';
import { useAuthStore } from '@/store/useAuthStore';
import { authService } from '@/services/auth.service';
import { useNavigationStore } from '@/store/useNavigationStore';

type NavItemDefinition = {
  to: string;
  icon: LucideIcon;
  label: string;
  end?: boolean;
};

type NavItemProps = NavItemDefinition & {
  isCollapsed: boolean;
};

type SidebarSectionKey = 'main' | 'forms' | 'reports' | 'design' | 'admin' | 'account';

const getInitials = (firstName?: string, lastName?: string) =>
  `${firstName?.charAt(0) || 'M'}${lastName?.charAt(0) || 'G'}`.toLocaleUpperCase('tr-TR');

const SidebarSection = ({
  label,
  isCollapsed,
  isOpen,
  onToggle,
  children,
}: {
  label: string;
  isCollapsed: boolean;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}) => {
  if (isCollapsed) {
    return (
      <section className="mt-3">
        <div className="mx-auto mb-2 h-px w-8 bg-surface-muted/70" />
        <div className="flex flex-col gap-1">{children}</div>
      </section>
    );
  }

  return (
    <section className="mt-4">
      <button
        type="button"
        onClick={onToggle}
        className="mb-1 flex w-full items-center justify-between rounded-md px-3 py-1 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-gray/55 transition-colors hover:bg-surface-muted/25 hover:text-brand-dark"
      >
        {label}
        <ChevronRight className={cn('h-3.5 w-3.5 text-brand-gray/45 transition-transform', isOpen && 'rotate-90')} />
      </button>
      {isOpen && (
        <div className="ml-3 flex flex-col gap-1 border-l border-surface-muted/70 pl-2">
          {children}
        </div>
      )}
    </section>
  );
};

const StaticSidebarSection = ({
  label,
  isCollapsed,
  children,
}: {
  label: string;
  isCollapsed: boolean;
  children: ReactNode;
}) => {
  if (isCollapsed) {
    return (
      <section className="mt-3">
        <div className="mx-auto mb-2 h-px w-8 bg-surface-muted/70" />
        <div className="flex flex-col gap-1">{children}</div>
      </section>
    );
  }

  return (
    <section className="mt-3">
      <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-gray/55">
        {label}
      </div>
      <div className="flex flex-col gap-1">
        {children}
      </div>
    </section>
  );
};

export const NavItem = ({ to, icon: Icon, label, isCollapsed, end }: NavItemProps) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      cn(
        'group relative flex min-h-9 items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
        isCollapsed && 'justify-center px-0',
        isActive
          ? 'bg-surface-muted/70 text-brand-dark font-semibold'
          : 'text-brand-gray hover:bg-surface-muted/35 hover:text-brand-dark'
      )
    }
    title={isCollapsed ? label : undefined}
  >
    {({ isActive }) => (
      <>
        {isActive && !isCollapsed && <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-brand-primary" />}
        <span
          className={cn(
            'flex shrink-0 items-center justify-center rounded-md transition-colors',
            isCollapsed ? 'h-9 w-9' : 'h-6 w-6',
            isActive ? 'text-brand-dark' : 'text-brand-gray group-hover:text-brand-dark'
          )}
        >
          <Icon className={cn(isCollapsed ? 'h-5 w-5' : 'h-4 w-4')} />
        </span>
        {!isCollapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
      </>
    )}
  </NavLink>
);

const QuickCreateButton = ({ isCollapsed, onClick }: { isCollapsed: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'group flex items-center rounded-lg border border-orange-100 bg-orange-50/55 text-brand-dark transition-colors hover:border-orange-200 hover:bg-orange-50',
      isCollapsed ? 'mx-auto h-9 w-9 justify-center' : 'w-full gap-2.5 px-3 py-2'
    )}
    title={isCollapsed ? 'Yeni Talep' : undefined}
  >
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-brand-primary shadow-soft">
      <FilePlus2 className="h-3.5 w-3.5" />
    </span>
    {!isCollapsed && (
      <span className="min-w-0 text-left">
        <span className="block text-[13px] font-semibold leading-tight">Yeni Talep</span>
        <span className="mt-0.5 block text-[11px] font-medium leading-tight text-brand-gray">Form akışını başlat</span>
      </span>
    )}
  </button>
);

export const DynamicSidebar = ({
  isSidebarOpen,
  setSidebarOpen,
}: {
  isSidebarOpen: boolean;
  setSidebarOpen: (val: boolean) => void;
}) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { authorizedForms, isLoading, fetchAuthorizedForms } = useNavigationStore();

  const userRoles = user?.roles || [];
  const userPermissions = user?.permissions || [];
  const isAdminRole = userRoles.some((role) => role.toLowerCase() === 'admin');

  const hasPermission = (code: string) => {
    if (isAdminRole) return true;
    return userPermissions.includes(code);
  };

  const canSeeHrReports = hasPermission('Reports.View');
  const canSeeFormDesigner = hasPermission('Forms.Design');
  const canSeeWorkflowDesigner = hasPermission('Workflows.Manage');
  const canSeeDesignersSection = canSeeHrReports || canSeeFormDesigner || canSeeWorkflowDesigner;

  const canSeeUsers = hasPermission('Users.Manage');
  const canSeeRoles = hasPermission('Roles.Manage');
  const canSeeSysSettings = hasPermission('System.Settings');
  const canSeeAuditLogs = hasPermission('System.AuditLogs');
  const canSeePersonnelSync = hasPermission('Personnel.Sync');
  const canSeeAdminSection = canSeeUsers || canSeeRoles || canSeeSysSettings || canSeeAuditLogs || canSeePersonnelSync || isAdminRole;

  const [isFormsExpanded, setIsFormsExpanded] = useState(() => location.pathname.includes('/forms/d/'));
  const [formSearch, setFormSearch] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<SidebarSectionKey, boolean>>({
    main: true,
    forms: true,
    reports: true,
    design: true,
    admin: true,
    account: true,
  });

  const filteredForms = useMemo(
    () => authorizedForms.filter((form) => form.name.toLocaleLowerCase('tr-TR').includes(formSearch.toLocaleLowerCase('tr-TR'))),
    [authorizedForms, formSearch]
  );

  const isFormsActive = location.pathname.startsWith('/forms');
  const userInitials = getInitials(user?.firstName, user?.lastName);

  useEffect(() => {
    fetchAuthorizedForms();
  }, [fetchAuthorizedForms]);

  useEffect(() => {
    if (location.pathname.includes('/forms/d/')) {
      setIsFormsExpanded(true);
    }
  }, [location.pathname]);

  const handleLogout = async () => {
    await authService.logout();
    navigate('/auth/login', { replace: true });
  };

  const coreItems: NavItemDefinition[] = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/approvals', icon: CheckSquare, label: 'Onaylarım' },
  ];

  const reportItems: NavItemDefinition[] = canSeeHrReports ? [{ to: '/hr/reports', icon: BarChart2, label: 'Form Analizleri' }] : [];

  const systemToolItems: NavItemDefinition[] = [
    ...(canSeeFormDesigner ? [{ to: '/admin/form-designer', icon: LayoutTemplate, label: 'Form Tasarımcısı' }] : []),
    ...(canSeeWorkflowDesigner ? [{ to: '/admin/workflow-designer', icon: Route, label: 'Onay Rotaları' }] : []),
  ];

  const adminItems: NavItemDefinition[] = [
    ...(canSeeUsers ? [{ to: '/users', icon: Users, label: 'Kullanıcılar' }] : []),
    ...(canSeeRoles ? [{ to: '/admin/roles', icon: Shield, label: 'Yetki Rolleri' }] : []),
    ...(canSeeRoles ? [{ to: '/admin/location-roles', icon: UserCheck, label: 'Lokasyon Yetkileri' }] : []),
    ...(canSeePersonnelSync ? [{ to: '/admin/personnel-sync', icon: Users, label: 'Personel Senkronizasyonu' }] : []),
    ...(canSeeAuditLogs ? [{ to: '/admin/audit-logs', icon: Activity, label: 'Sistem Logları' }] : []),
  ];

  const utilityItems: NavItemDefinition[] = [
    { to: '/settings/delegations', icon: UserCheck, label: 'Vekalet Devri' },
    ...(canSeeSysSettings ? [{ to: '/admin/integration-queries', icon: Database, label: 'Dış Veri Kaynakları' }] : []),
    ...(canSeeSysSettings ? [{ to: '/admin/system-settings', icon: Settings, label: 'Sistem Ayarları' }] : []),
  ];

  const renderItems = (items: NavItemDefinition[]) =>
    items.map((item) => <NavItem key={item.to} {...item} isCollapsed={!isSidebarOpen} />);

  const toggleSection = (section: SidebarSectionKey) => {
    setExpandedSections((current) => ({ ...current, [section]: !current[section] }));
  };

  return (
    <aside
      className={cn(
        'relative z-20 flex shrink-0 flex-col border-r border-surface-muted bg-surface-base shadow-sm transition-all duration-300 ease-in-out',
        isSidebarOpen ? 'w-[260px]' : 'w-[72px]'
      )}
    >
      <div className="relative flex h-16 shrink-0 items-center justify-between px-4">
        <NavLink to="/dashboard" className={cn('flex min-w-0 items-center gap-3 transition-opacity hover:opacity-80', !isSidebarOpen && 'mx-auto')}>
          {isSidebarOpen ? (
            <div className="flex min-w-0 items-center gap-3">
              <img src="/erkurtlogo.svg" alt="Erkurt Holding" className="h-5 w-auto shrink-0 object-contain" />
              <span className="h-4 w-px shrink-0 bg-surface-muted" />
              <img src="/logo.svg" alt="Formfleks Logo" className="h-5 w-auto shrink-0 object-contain" />
            </div>
          ) : (
            <img src="/logo.svg" alt="Formfleks Logo" className="h-6 w-auto object-contain" />
          )}
        </NavLink>

        <button
          type="button"
          onClick={() => setSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-5 z-30 flex h-6 w-6 items-center justify-center rounded-full border border-surface-muted bg-surface-base text-brand-gray shadow-sm transition-colors hover:bg-surface-hover hover:text-brand-dark"
          title={isSidebarOpen ? 'Sidebarı daralt' : 'Sidebarı genişlet'}
        >
          <ChevronLeft className={cn('h-3 w-3 transition-transform', !isSidebarOpen && 'rotate-180')} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin">
        <StaticSidebarSection label="Ana İşlemler" isCollapsed={!isSidebarOpen}>
          <div className={cn(isSidebarOpen && 'mb-1')}>
            <QuickCreateButton isCollapsed={!isSidebarOpen} onClick={() => navigate('/forms/create')} />
          </div>
          <nav className="flex flex-col gap-1">{renderItems(coreItems)}</nav>
        </StaticSidebarSection>

        <SidebarSection
          label="Kurumsal Formlar"
          isCollapsed={!isSidebarOpen}
          isOpen={expandedSections.forms}
          onToggle={() => toggleSection('forms')}
        >
          {isSidebarOpen ? (
            <button
              type="button"
              onClick={() => setIsFormsExpanded(!isFormsExpanded)}
              className={cn(
                'group relative flex min-h-9 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors',
                isFormsActive ? 'bg-surface-muted/70 text-brand-dark font-semibold' : 'text-brand-gray hover:bg-surface-muted/35 hover:text-brand-dark'
              )}
            >
              {isFormsActive && <span className="absolute left-0 h-5 w-0.5 rounded-full bg-brand-primary" />}
              <FileText className={cn('h-4 w-4 shrink-0', isFormsActive ? 'text-brand-dark' : 'text-brand-gray group-hover:text-brand-dark')} />
              <span className="min-w-0 flex-1 truncate">Form Kütüphanesi</span>
              <span className="rounded-full border border-surface-muted bg-surface-base px-2 py-0.5 text-[10px] font-semibold text-brand-gray">
                {authorizedForms.length}
              </span>
              <ChevronRight className={cn('h-3.5 w-3.5 text-brand-gray/60 transition-transform', isFormsExpanded && 'rotate-90')} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSidebarOpen(true);
                setIsFormsExpanded(true);
              }}
              className={cn(
                'mx-auto flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
                isFormsActive ? 'bg-surface-muted/70 text-brand-dark' : 'text-brand-gray hover:bg-surface-muted/35 hover:text-brand-dark'
              )}
              title="Kurumsal Formlar"
            >
              <FileText className="h-5 w-5" />
            </button>
          )}

          {isFormsExpanded && isSidebarOpen && (
            <div className="mt-2 rounded-lg border border-surface-muted/75 bg-surface-base p-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brand-gray/50" />
                <input
                  type="text"
                  placeholder="Formlarda ara..."
                  className="w-full rounded-md border border-surface-muted bg-surface-ground py-1.5 pl-8 pr-3 text-xs text-brand-dark shadow-sm outline-none transition-all placeholder:text-brand-gray/50 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20"
                  value={formSearch}
                  onChange={(event) => setFormSearch(event.target.value)}
                />
              </div>

              <div className="mt-2 flex max-h-[200px] flex-col gap-0.5 overflow-y-auto pr-1 scrollbar-thin">
                {isLoading ? (
                  <div className="space-y-2 px-2 py-2">
                    <div className="h-2 animate-pulse rounded-md bg-surface-muted" />
                    <div className="h-2 w-2/3 animate-pulse rounded-md bg-surface-muted" />
                  </div>
                ) : filteredForms.length === 0 ? (
                  <div className="px-3 py-2 text-[11px] italic text-brand-gray/60">Form bulunamadı.</div>
                ) : (
                  filteredForms.map((form) => (
                    <NavLink
                      key={form.code}
                      to={`/forms/d/${form.code}`}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-2 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors',
                          isActive ? 'bg-brand-primary/10 text-brand-primary' : 'text-brand-gray hover:bg-surface-muted/45 hover:text-brand-dark'
                        )
                      }
                    >
                      <span className="truncate">{form.name}</span>
                    </NavLink>
                  ))
                )}
              </div>
            </div>
          )}
        </SidebarSection>

        {canSeeDesignersSection && (
          <>
            {reportItems.length > 0 && (
              <SidebarSection
                label="Raporlama"
                isCollapsed={!isSidebarOpen}
                isOpen={expandedSections.reports}
                onToggle={() => toggleSection('reports')}
              >
                <nav className="flex flex-col gap-1">{renderItems(reportItems)}</nav>
              </SidebarSection>
            )}

            {systemToolItems.length > 0 && (
              <SidebarSection
                label="Tasarım & Akış"
                isCollapsed={!isSidebarOpen}
                isOpen={expandedSections.design}
                onToggle={() => toggleSection('design')}
              >
                <nav className="flex flex-col gap-1">{renderItems(systemToolItems)}</nav>
              </SidebarSection>
            )}
          </>
        )}

        {canSeeAdminSection && (
          <SidebarSection
            label="Yönetim"
            isCollapsed={!isSidebarOpen}
            isOpen={expandedSections.admin}
            onToggle={() => toggleSection('admin')}
          >
            <nav className="flex flex-col gap-1">{renderItems(adminItems)}</nav>
          </SidebarSection>
        )}

        <SidebarSection
          label="Hesap & Sistem"
          isCollapsed={!isSidebarOpen}
          isOpen={expandedSections.account}
          onToggle={() => toggleSection('account')}
        >
          <nav className="flex flex-col gap-1">{renderItems(utilityItems)}</nav>
        </SidebarSection>
      </div>

      <div className="shrink-0 border-t border-surface-muted bg-surface-base p-3">
        <div className={cn('flex items-center gap-2.5', !isSidebarOpen && 'justify-center')}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-primary text-[13px] font-semibold text-white shadow-sm">
            {userInitials}
          </div>

          {isSidebarOpen && (
            <>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold leading-tight text-brand-dark">
                  {user ? `${user.firstName} ${user.lastName}` : 'Kullanıcı'}
                </div>
                <div className="mt-0.5 truncate text-[11px] font-medium leading-tight text-brand-gray">
                  {user?.roles?.[0] || 'Kullanıcı'}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => navigate('/settings/delegations')}
                  className="rounded-md p-1.5 text-brand-gray transition-colors hover:bg-surface-muted/50 hover:text-brand-dark"
                  title="Vekalet Devri"
                >
                  <User className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-md p-1.5 text-brand-gray transition-colors hover:bg-red-50 hover:text-status-danger"
                  title="Çıkış Yap"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
};
