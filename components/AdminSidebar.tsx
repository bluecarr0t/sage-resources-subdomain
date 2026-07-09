'use client';

import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  Map,
  FileText,
  User,
  LogOut,
  X,
  Menu,
  Globe,
  Sun,
  Moon,
  ChevronsLeft,
  ChevronsRight,
  TentTree,
  MapPin,
  LayoutGrid,
  Calculator,
  Home,
  Bot,
  Wrench,
  ChevronDown,
  FileBarChart,
  Files,
  LineChart,
  Briefcase,
  Table2,
  ScrollText,
  Shield,
  Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSidebar } from '@/lib/sidebar-context';
import { supabase } from '@/lib/supabase';
import { DEFAULT_ADMIN_PATH, JOB_PIPELINE_ADMIN_PATH } from '@/lib/admin-ui';
import { isManagedUsersAdminEmail } from '@/lib/managed-users-admin';

const LOGO_LIGHT =
  'https://b0evzueuuq9l227n.public.blob.vercel-storage.com/admin-logos/sage-logo-light.png';
const LOGO_DARK =
  'https://b0evzueuuq9l227n.public.blob.vercel-storage.com/admin-logos/sage-logo-dark.png';

function getActivePageId(pathname: string): string {
  if (!pathname) return '';
  if (
    pathname.startsWith(JOB_PIPELINE_ADMIN_PATH) ||
    pathname.startsWith('/admin/active-jobs') ||
    pathname.startsWith('/admin/project-pipeline')
  ) {
    return 'job-pipeline';
  }
  if (pathname === '/map' || pathname.startsWith('/en/map')) return 'map';
  if (pathname.startsWith('/admin/client-map')) return 'client-map';
  if (pathname.startsWith('/admin/past-reports')) return 'past-reports';
  if (pathname.startsWith('/admin/glamping-properties')) return 'comps';
  if (pathname.startsWith('/admin/proximity-insights')) return 'proximity-insights';
  if (pathname.startsWith('/admin/market-report')) return 'market-report';
  if (pathname.startsWith('/admin/glamping-industry-overview')) return 'glamping-industry-overview';
  if (pathname.startsWith('/admin/rv-industry-overview')) return 'rv-industry-overview';
  if (pathname.startsWith('/admin/rv-site-setup') || pathname.startsWith('/admin/site-design')) return 'site-design';
  if (pathname.startsWith('/admin/site-builder')) return 'site-builder';
  if (pathname.startsWith('/admin/sage-ai')) return 'sage-ai';
  if (pathname.startsWith('/admin/audit-log')) return 'audit-log';
  if (pathname.startsWith('/admin/cost-explorer')) return 'cost-explorer';
  if (pathname.startsWith('/admin/sites-export')) return 'sites-export';
  if (pathname.startsWith('/admin/sage-data')) return 'sage-data';
  if (pathname.startsWith('/admin/users')) return 'managed-users';
  if (pathname.startsWith('/admin/account')) return 'account';
  if (pathname.startsWith('/admin/workload')) return 'pipeline-workload';
  if (pathname.startsWith('/admin/job-activity')) return 'job-activity';
  return '';
}

const REPORTS_PAGE_IDS = new Set([
  'past-reports',
  'market-report',
  'rv-industry-overview',
  'glamping-industry-overview',
]);

const TOOLS_PAGE_IDS = new Set([
  'proximity-insights',
  'cost-explorer',
  'site-design',
  'site-builder',
  'sage-ai',
  'sage-data',
]);

const ADMIN_PAGE_IDS = new Set(['managed-users', 'pipeline-workload', 'job-activity']);

function NavLink({
  href,
  label,
  icon: Icon,
  pageId,
  isActive,
  isCollapsed,
  showBeta,
  badgeCount = 0,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  pageId: string;
  isActive: boolean;
  isCollapsed?: boolean;
  showBeta?: boolean;
  badgeCount?: number;
}) {
  const tSidebar = useTranslations('admin.sidebar');
  const collapsed = isCollapsed ?? false;
  const collapsedTitle = collapsed
    ? badgeCount > 0
      ? `${label} (${badgeCount})`
      : showBeta
        ? `${label} (${tSidebar('beta')})`
        : label
    : undefined;

  const badge =
    badgeCount > 0 ? (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-semibold leading-5 text-white ${
          badgeCount > 9 ? 'min-w-[1.375rem]' : 'h-5 min-w-[1.25rem]'
        }`}
        aria-label={tSidebar('reviewTodoBadge', { count: badgeCount })}
      >
        {badgeCount > 99 ? '99+' : badgeCount}
      </span>
    ) : null;

  return (
    <Link
      href={href}
      data-page={pageId}
      title={collapsedTitle}
      className={`nav-item flex items-center ${collapsed ? 'justify-center px-2 py-2' : 'space-x-3 px-3 py-2'} rounded-md transition-colors duration-150 ease-out group ${
        isActive
          ? 'bg-neutral-100/90 dark:bg-neutral-900/60 text-neutral-900 dark:text-neutral-100 font-medium'
          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100/70 dark:hover:bg-neutral-900/40 hover:text-neutral-900 dark:hover:text-neutral-100'
      }`}
    >
      <span className="relative inline-flex shrink-0">
        <Icon
          className={`w-5 h-5 flex-shrink-0 ${
            isActive ? 'text-neutral-700 dark:text-neutral-200' : 'text-neutral-500 dark:text-neutral-500 group-hover:text-neutral-700 dark:group-hover:text-neutral-300'
          }`}
        />
        {collapsed && badge ? (
          <span className="absolute -right-1.5 -top-1.5">{badge}</span>
        ) : null}
      </span>
      {!collapsed && (
        <span className="text-sm inline-flex items-center gap-1.5 min-w-0 flex-1">
          <span className="truncate">{label}</span>
          {showBeta ? (
            <span className="shrink-0 rounded-full border border-orange-200/90 bg-orange-100 px-1 py-px text-[8px] font-semibold uppercase leading-none tracking-wide text-orange-900 dark:border-orange-800/80 dark:bg-orange-950/80 dark:text-orange-200">
              {tSidebar('beta')}
            </span>
          ) : null}
          {badge}
        </span>
      )}
    </Link>
  );
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const { setTheme, resolvedTheme } = useTheme();
  const { isCollapsed, toggleCollapsed } = useSidebar();
  const [userEmail, setUserEmail] = useState<string>('Loading...');
  const [userRole, setUserRole] = useState<'admin' | 'author' | null>(null);
  const [jobPipelineReviewTodoCount, setJobPipelineReviewTodoCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const activePageId = getActivePageId(pathname || '');
  const reportsSectionActive = REPORTS_PAGE_IDS.has(activePageId);
  const toolsSectionActive = TOOLS_PAGE_IDS.has(activePageId);
  const adminSectionActive = ADMIN_PAGE_IDS.has(activePageId);
  const [reportsMenuOpen, setReportsMenuOpen] = useState(() => reportsSectionActive);
  const [reportsFlyoutOpen, setReportsFlyoutOpen] = useState(false);
  const reportsFlyoutRef = useRef<HTMLDivElement>(null);
  const reportsSubmenuRef = useRef<HTMLDivElement>(null);
  const prevReportsSectionActiveRef = useRef<boolean | null>(null);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(() => toolsSectionActive);
  const [toolsFlyoutOpen, setToolsFlyoutOpen] = useState(false);
  const toolsFlyoutRef = useRef<HTMLDivElement>(null);
  const toolsSubmenuRef = useRef<HTMLDivElement>(null);
  /** Previous `toolsSectionActive` after each toolsSectionActive effect run (null = not yet mounted). */
  const prevToolsSectionActiveRef = useRef<boolean | null>(null);
  const [adminMenuOpen, setAdminMenuOpen] = useState(() => adminSectionActive);
  const [adminFlyoutOpen, setAdminFlyoutOpen] = useState(false);
  const adminFlyoutRef = useRef<HTMLDivElement>(null);
  const adminSubmenuRef = useRef<HTMLDivElement>(null);
  const prevAdminSectionActiveRef = useRef<boolean | null>(null);

  const showCollapsed = isDesktop && isCollapsed;
  const showManagedUsersAdminNav = isManagedUsersAdminEmail(userEmail);
  const isLoggedInManagedUser =
    userEmail !== 'Loading...' &&
    userEmail !== 'Not logged in' &&
    userEmail !== 'Error loading user';
  const showAdminNav = isLoggedInManagedUser;
  const tSidebar = useTranslations('admin.sidebar');
  const tAccount = useTranslations('admin.account');
  const userRoleLabel =
    userRole === 'admin' ? tAccount('roleAdmin') : userRole === 'author' ? tAccount('roleAuthor') : '';
  const isAccountPage = activePageId === 'account';

  useEffect(() => {
    const prev = prevReportsSectionActiveRef.current;
    prevReportsSectionActiveRef.current = reportsSectionActive;

    if (prev === null) {
      if (reportsSectionActive) setReportsMenuOpen(true);
      return;
    }

    if (reportsSectionActive) {
      if (!prev) setReportsMenuOpen(true);
      return;
    }

    if (prev) setReportsMenuOpen(false);
  }, [reportsSectionActive]);

  useEffect(() => {
    const prev = prevToolsSectionActiveRef.current;
    prevToolsSectionActiveRef.current = toolsSectionActive;

    if (prev === null) {
      if (toolsSectionActive) setToolsMenuOpen(true);
      return;
    }

    if (toolsSectionActive) {
      if (!prev) setToolsMenuOpen(true);
      return;
    }

    if (prev) setToolsMenuOpen(false);
  }, [toolsSectionActive]);

  useEffect(() => {
    const prev = prevAdminSectionActiveRef.current;
    prevAdminSectionActiveRef.current = adminSectionActive;

    if (prev === null) {
      if (adminSectionActive) setAdminMenuOpen(true);
      return;
    }

    if (adminSectionActive) {
      if (!prev) setAdminMenuOpen(true);
      return;
    }

    if (prev) setAdminMenuOpen(false);
  }, [adminSectionActive]);

  useLayoutEffect(() => {
    if (!reportsMenuOpen || showCollapsed || !reportsSubmenuRef.current) return;
    reportsSubmenuRef.current.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [reportsMenuOpen, showCollapsed]);

  useLayoutEffect(() => {
    if (!toolsMenuOpen || showCollapsed || !toolsSubmenuRef.current) return;
    toolsSubmenuRef.current.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [toolsMenuOpen, showCollapsed]);

  useLayoutEffect(() => {
    if (!adminMenuOpen || showCollapsed || !adminSubmenuRef.current) return;
    adminSubmenuRef.current.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [adminMenuOpen, showCollapsed]);

  useEffect(() => {
    if (!showCollapsed) {
      setReportsFlyoutOpen(false);
      setToolsFlyoutOpen(false);
      setAdminFlyoutOpen(false);
    }
  }, [showCollapsed]);

  useEffect(() => {
    if (!reportsFlyoutOpen || !showCollapsed) return;
    const close = (e: MouseEvent) => {
      if (reportsFlyoutRef.current && !reportsFlyoutRef.current.contains(e.target as Node)) {
        setReportsFlyoutOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [reportsFlyoutOpen, showCollapsed]);

  useEffect(() => {
    if (!toolsFlyoutOpen || !showCollapsed) return;
    const close = (e: MouseEvent) => {
      if (toolsFlyoutRef.current && !toolsFlyoutRef.current.contains(e.target as Node)) {
        setToolsFlyoutOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [toolsFlyoutOpen, showCollapsed]);

  useEffect(() => {
    if (!adminFlyoutOpen || !showCollapsed) return;
    const close = (e: MouseEvent) => {
      if (adminFlyoutRef.current && !adminFlyoutRef.current.contains(e.target as Node)) {
        setAdminFlyoutOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [adminFlyoutOpen, showCollapsed]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = () => setIsDesktop(mq.matches);
    handler(); // set initial
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
          setUserEmail(session.user.email);
          try {
            const res = await fetch('/api/admin/account', { credentials: 'include' });
            if (res.ok) {
              const body = (await res.json()) as { role?: 'admin' | 'author' };
              if (body.role === 'admin' || body.role === 'author') {
                setUserRole(body.role);
              }
            }
          } catch {
            // Role label falls back to author
          }
        } else {
          setUserEmail('Not logged in');
          setUserRole(null);
        }
      } catch {
        setUserEmail('Error loading user');
        setUserRole(null);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (!userEmail || userEmail === 'Loading...' || userEmail === 'Not logged in') {
      return undefined;
    }

    let cancelled = false;

    const loadReviewTodoCount = async () => {
      try {
        const res = await fetch('/api/admin/project-pipeline/review-todos', {
          credentials: 'include',
        });
        if (!res.ok) return;
        const body = (await res.json()) as { count?: number };
        if (!cancelled) {
          setJobPipelineReviewTodoCount(
            typeof body.count === 'number' && body.count > 0 ? body.count : 0
          );
        }
      } catch {
        // Ignore — badge is best-effort
      }
    };

    void loadReviewTodoCount();
    const interval = window.setInterval(loadReviewTodoCount, 60_000);
    const onTodosChanged = () => void loadReviewTodoCount();
    window.addEventListener('project-pipeline-review-todos-changed', onTodosChanged);
    window.addEventListener('focus', onTodosChanged);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('project-pipeline-review-todos-changed', onTodosChanged);
      window.removeEventListener('focus', onTodosChanged);
    };
  }, [userEmail]);

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to logout?')) return;
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore
    }
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const isDark = mounted && resolvedTheme === 'dark';
  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');

  return (
    <>
      {/* Mobile overlay - dims content when sidebar open */}
      <div
        id="sidebarOverlay"
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300 ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={toggleSidebar}
        aria-hidden="true"
      />

      <aside
        id="sidebar"
        className={`fixed inset-y-0 left-0 z-50 bg-white dark:bg-neutral-950 border-r border-neutral-200/75 dark:border-neutral-800 transition-all duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } w-64 ${isCollapsed ? 'lg:w-20' : ''}`}
      >
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          {/* Header - Logo area */}
          <div
            className={`relative flex shrink-0 items-center justify-center border-b border-neutral-200/75 dark:border-neutral-800 py-0 ${showCollapsed ? 'pt-8' : ''}`}
          >
            <Link
              href={DEFAULT_ADMIN_PATH}
              className={`flex items-center justify-center ${showCollapsed ? 'w-11 h-11' : 'w-36 h-36'}`}
            >
              <Image
                src={isDark ? LOGO_DARK : LOGO_LIGHT}
                alt="Sage Outdoor Advisory"
                width={showCollapsed ? 44 : 144}
                height={showCollapsed ? 44 : 144}
                className={`object-contain ${showCollapsed ? 'w-11 h-11' : 'w-36 h-36'}`}
                priority
              />
            </Link>
            <button
              onClick={toggleSidebar}
              className="absolute top-1 right-1 p-2 rounded-md hover:bg-neutral-100/90 dark:hover:bg-neutral-900/50 lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
            <button
              onClick={toggleCollapsed}
              className="absolute top-1 right-1 p-2 rounded-md hover:bg-neutral-100/90 dark:hover:bg-neutral-900/50 hidden lg:flex items-center justify-center"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <ChevronsRight className="w-5 h-5 text-neutral-500 dark:text-neutral-500" />
              ) : (
                <ChevronsLeft className="w-5 h-5 text-neutral-500 dark:text-neutral-500" />
              )}
            </button>
          </div>

          {/* Navigation — min-h-0 so flex-1 can shrink and overflow-y-auto scrolls when Tools expands */}
          <nav className="relative z-10 min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-4 pb-32 pt-2">
            <div className="py-2">
              <NavLink
                href={JOB_PIPELINE_ADMIN_PATH}
                label={tSidebar('projectPipeline')}
                icon={Briefcase}
                pageId="job-pipeline"
                isActive={activePageId === 'job-pipeline'}
                isCollapsed={showCollapsed}
                badgeCount={jobPipelineReviewTodoCount}
              />
            </div>

            {/* INTERNAL section */}
            <div className="py-2">
              {!showCollapsed && (
                <div className="px-3 py-2 text-[10px] font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-[0.16em]">
                  Internal
                </div>
              )}
              <div className={`space-y-1 ${showCollapsed ? '' : 'ml-4'}`}>
                <a
                  href="https://data.sageoutdooradvisory.com/camp/login"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-page="web-scraper"
                  title={showCollapsed ? 'Web Scraper' : undefined}
                  className={`nav-item flex items-center ${showCollapsed ? 'justify-center px-2 py-2' : 'space-x-3 px-3 py-2'} rounded-md transition-colors duration-150 ease-out group text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100/70 dark:hover:bg-neutral-900/40 hover:text-neutral-900 dark:hover:text-neutral-100`}
                >
                  <Globe
                    className="w-5 h-5 flex-shrink-0 text-neutral-500 dark:text-neutral-500 group-hover:text-neutral-700 dark:group-hover:text-neutral-300"
                  />
                  {!showCollapsed && <span className="text-sm">Web Scraper</span>}
                </a>
                <NavLink
                  href="/admin/client-map"
                  label="Client Map"
                  icon={Map}
                  pageId="client-map"
                  isActive={activePageId === 'client-map'}
                  isCollapsed={showCollapsed}
                />
                <NavLink
                  href="/admin/glamping-properties"
                  label={tSidebar('properties')}
                  icon={TentTree}
                  pageId="comps"
                  isActive={activePageId === 'comps'}
                  isCollapsed={showCollapsed}
                />
                {/* Report Builder hidden from menu — page still accessible via direct URL */}
                {!showCollapsed ? (
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setReportsMenuOpen((o) => !o)}
                      className={`nav-item flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors duration-150 ease-out ${
                        reportsSectionActive
                          ? 'bg-neutral-100/90 dark:bg-neutral-900/60 text-neutral-900 dark:text-neutral-100 font-medium'
                          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100/70 dark:hover:bg-neutral-900/40 hover:text-neutral-900 dark:hover:text-neutral-100'
                      }`}
                      aria-expanded={reportsMenuOpen}
                      aria-controls="admin-reports-submenu"
                      id="admin-reports-trigger"
                    >
                      <Files
                        className={`h-5 w-5 flex-shrink-0 ${
                          reportsSectionActive
                            ? 'text-neutral-700 dark:text-neutral-200'
                            : 'text-neutral-500 dark:text-neutral-500'
                        }`}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate text-sm">{tSidebar('reports')}</span>
                      <ChevronDown
                        className={`h-4 w-4 flex-shrink-0 text-neutral-400 transition-transform duration-200 ${
                          reportsMenuOpen ? 'rotate-180' : ''
                        }`}
                        aria-hidden
                      />
                    </button>
                    {reportsMenuOpen ? (
                      <div
                        ref={reportsSubmenuRef}
                        id="admin-reports-submenu"
                        role="region"
                        aria-labelledby="admin-reports-trigger"
                        className="ml-3 space-y-1 border-l border-neutral-200/80 py-0.5 pl-3 dark:border-neutral-800"
                      >
                        <NavLink
                          href="/admin/past-reports"
                          label={tSidebar('pastReports')}
                          icon={FileText}
                          pageId="past-reports"
                          isActive={activePageId === 'past-reports'}
                          isCollapsed={false}
                        />
                        <NavLink
                          href="/admin/market-report"
                          label={tSidebar('marketReport')}
                          icon={FileBarChart}
                          pageId="market-report"
                          isActive={activePageId === 'market-report'}
                          isCollapsed={false}
                        />
                        <NavLink
                          href="/admin/rv-industry-overview"
                          label={tSidebar('rvIndustryOverview')}
                          icon={LineChart}
                          pageId="rv-industry-overview"
                          isActive={activePageId === 'rv-industry-overview'}
                          isCollapsed={false}
                        />
                        <NavLink
                          href="/admin/glamping-industry-overview"
                          label={tSidebar('glampingIndustryOverview')}
                          icon={LineChart}
                          pageId="glamping-industry-overview"
                          isActive={activePageId === 'glamping-industry-overview'}
                          isCollapsed={false}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="relative flex justify-center" ref={reportsFlyoutRef}>
                    <button
                      type="button"
                      onClick={() => setReportsFlyoutOpen((o) => !o)}
                      className={`nav-item flex items-center justify-center rounded-md px-2 py-2 transition-colors duration-150 ease-out ${
                        reportsSectionActive
                          ? 'bg-neutral-100/90 dark:bg-neutral-900/60 text-neutral-900 dark:text-neutral-100'
                          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100/70 dark:hover:bg-neutral-900/40 hover:text-neutral-900 dark:hover:text-neutral-100'
                      }`}
                      aria-expanded={reportsFlyoutOpen}
                      aria-haspopup="menu"
                      aria-label={tSidebar('reportsMenu')}
                      title={tSidebar('reports')}
                    >
                      <Files
                        className={`h-5 w-5 flex-shrink-0 ${
                          reportsSectionActive
                            ? 'text-neutral-700 dark:text-neutral-200'
                            : 'text-neutral-500 dark:text-neutral-500'
                        }`}
                      />
                    </button>
                    {reportsFlyoutOpen ? (
                      <div
                        role="menu"
                        aria-label={tSidebar('reportsMenu')}
                        className="absolute left-full top-0 z-[60] ml-1 min-w-[13.5rem] rounded-md border border-neutral-200/80 bg-white py-1 dark:border-neutral-800 dark:bg-neutral-950"
                      >
                        <Link
                          href="/admin/past-reports"
                          role="menuitem"
                          onClick={() => setReportsFlyoutOpen(false)}
                          className={`flex items-center gap-2 px-3 py-2 text-sm ${
                            activePageId === 'past-reports'
                              ? 'bg-neutral-100/90 font-medium text-neutral-900 dark:bg-neutral-900/60 dark:text-neutral-100'
                              : 'text-neutral-700 hover:bg-neutral-100/80 dark:text-neutral-200 dark:hover:bg-neutral-900/45'
                          }`}
                        >
                          <FileText className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                          {tSidebar('pastReports')}
                        </Link>
                        <Link
                          href="/admin/market-report"
                          role="menuitem"
                          onClick={() => setReportsFlyoutOpen(false)}
                          className={`flex items-center gap-2 px-3 py-2 text-sm ${
                            activePageId === 'market-report'
                              ? 'bg-neutral-100/90 font-medium text-neutral-900 dark:bg-neutral-900/60 dark:text-neutral-100'
                              : 'text-neutral-700 hover:bg-neutral-100/80 dark:text-neutral-200 dark:hover:bg-neutral-900/45'
                          }`}
                        >
                          <FileBarChart className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                          {tSidebar('marketReport')}
                        </Link>
                        <Link
                          href="/admin/rv-industry-overview"
                          role="menuitem"
                          onClick={() => setReportsFlyoutOpen(false)}
                          className={`flex items-center gap-2 px-3 py-2 text-sm ${
                            activePageId === 'rv-industry-overview'
                              ? 'bg-neutral-100/90 font-medium text-neutral-900 dark:bg-neutral-900/60 dark:text-neutral-100'
                              : 'text-neutral-700 hover:bg-neutral-100/80 dark:text-neutral-200 dark:hover:bg-neutral-900/45'
                          }`}
                        >
                          <LineChart className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                          {tSidebar('rvIndustryOverview')}
                        </Link>
                        <Link
                          href="/admin/glamping-industry-overview"
                          role="menuitem"
                          onClick={() => setReportsFlyoutOpen(false)}
                          className={`flex items-center gap-2 px-3 py-2 text-sm ${
                            activePageId === 'glamping-industry-overview'
                              ? 'bg-neutral-100/90 font-medium text-neutral-900 dark:bg-neutral-900/60 dark:text-neutral-100'
                              : 'text-neutral-700 hover:bg-neutral-100/80 dark:text-neutral-200 dark:hover:bg-neutral-900/45'
                          }`}
                        >
                          <LineChart className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                          {tSidebar('glampingIndustryOverview')}
                        </Link>
                      </div>
                    ) : null}
                  </div>
                )}
                {!showCollapsed ? (
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setToolsMenuOpen((o) => !o)}
                      className={`nav-item flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors duration-150 ease-out ${
                        toolsSectionActive
                          ? 'bg-neutral-100/90 dark:bg-neutral-900/60 text-neutral-900 dark:text-neutral-100 font-medium'
                          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100/70 dark:hover:bg-neutral-900/40 hover:text-neutral-900 dark:hover:text-neutral-100'
                      }`}
                      aria-expanded={toolsMenuOpen}
                      aria-controls="admin-tools-submenu"
                      id="admin-tools-trigger"
                    >
                      <Wrench
                        className={`h-5 w-5 flex-shrink-0 ${
                          toolsSectionActive
                            ? 'text-neutral-700 dark:text-neutral-200'
                            : 'text-neutral-500 dark:text-neutral-500'
                        }`}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate text-sm">{tSidebar('tools')}</span>
                      <ChevronDown
                        className={`h-4 w-4 flex-shrink-0 text-neutral-400 transition-transform duration-200 ${
                          toolsMenuOpen ? 'rotate-180' : ''
                        }`}
                        aria-hidden
                      />
                    </button>
                    {toolsMenuOpen ? (
                      <div
                        ref={toolsSubmenuRef}
                        id="admin-tools-submenu"
                        role="region"
                        aria-labelledby="admin-tools-trigger"
                        className="ml-3 space-y-1 border-l border-neutral-200/80 py-0.5 pl-3 dark:border-neutral-800"
                      >
                        <NavLink
                          href="/admin/sage-ai"
                          label={tSidebar('sageAi')}
                          icon={Bot}
                          pageId="sage-ai"
                          isActive={activePageId === 'sage-ai'}
                          isCollapsed={false}
                          showBeta
                        />
                        <NavLink
                          href="/admin/proximity-insights"
                          label={tSidebar('proximityInsights')}
                          icon={MapPin}
                          pageId="proximity-insights"
                          isActive={activePageId === 'proximity-insights'}
                          isCollapsed={false}
                        />
                        <NavLink
                          href="/admin/cost-explorer"
                          label={tSidebar('costExplorer')}
                          icon={Calculator}
                          pageId="cost-explorer"
                          isActive={activePageId === 'cost-explorer'}
                          isCollapsed={false}
                        />
                        <NavLink
                          href="/admin/rv-site-setup"
                          label={tSidebar('rvSiteSetup')}
                          icon={LayoutGrid}
                          pageId="site-design"
                          isActive={activePageId === 'site-design'}
                          isCollapsed={false}
                        />
                        <NavLink
                          href="/admin/site-builder"
                          label={tSidebar('siteBuilder')}
                          icon={Home}
                          pageId="site-builder"
                          isActive={activePageId === 'site-builder'}
                          isCollapsed={false}
                        />
                        <NavLink
                          href="/admin/sage-data"
                          label={tSidebar('sageDataResearch')}
                          icon={Table2}
                          pageId="sage-data"
                          isActive={activePageId === 'sage-data'}
                          isCollapsed={false}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="relative flex justify-center" ref={toolsFlyoutRef}>
                    <button
                      type="button"
                      onClick={() => setToolsFlyoutOpen((o) => !o)}
                      className={`nav-item flex items-center justify-center rounded-md px-2 py-2 transition-colors duration-150 ease-out ${
                        toolsSectionActive
                          ? 'bg-neutral-100/90 dark:bg-neutral-900/60 text-neutral-900 dark:text-neutral-100'
                          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100/70 dark:hover:bg-neutral-900/40 hover:text-neutral-900 dark:hover:text-neutral-100'
                      }`}
                      aria-expanded={toolsFlyoutOpen}
                      aria-haspopup="menu"
                      aria-label={tSidebar('tools')}
                      title={tSidebar('tools')}
                    >
                      <Wrench
                        className={`h-5 w-5 flex-shrink-0 ${
                          toolsSectionActive
                            ? 'text-neutral-700 dark:text-neutral-200'
                            : 'text-neutral-500 dark:text-neutral-500'
                        }`}
                      />
                    </button>
                    {toolsFlyoutOpen ? (
                      <div
                        role="menu"
                        aria-label={tSidebar('toolsMenu')}
                        className="absolute left-full top-0 z-[60] ml-1 min-w-[13.5rem] rounded-md border border-neutral-200/80 bg-white py-1 dark:border-neutral-800 dark:bg-neutral-950"
                      >
                        <Link
                          href="/admin/sage-ai"
                          role="menuitem"
                          onClick={() => setToolsFlyoutOpen(false)}
                          className={`flex items-center gap-2 px-3 py-2 text-sm ${
                            activePageId === 'sage-ai'
                              ? 'bg-neutral-100/90 font-medium text-neutral-900 dark:bg-neutral-900/60 dark:text-neutral-100'
                              : 'text-neutral-700 hover:bg-neutral-100/80 dark:text-neutral-200 dark:hover:bg-neutral-900/45'
                          }`}
                        >
                          <Bot className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                          <span className="inline-flex min-w-0 flex-1 items-center gap-1.5">
                            <span className="truncate">{tSidebar('sageAi')}</span>
                            <span className="shrink-0 rounded-full border border-orange-200/90 bg-orange-100 px-1 py-px text-[8px] font-semibold uppercase leading-none tracking-wide text-orange-900 dark:border-orange-800/80 dark:bg-orange-950/80 dark:text-orange-200">
                              {tSidebar('beta')}
                            </span>
                          </span>
                        </Link>
                        <Link
                          href="/admin/proximity-insights"
                          role="menuitem"
                          onClick={() => setToolsFlyoutOpen(false)}
                          className={`flex items-center gap-2 px-3 py-2 text-sm ${
                            activePageId === 'proximity-insights'
                              ? 'bg-neutral-100/90 font-medium text-neutral-900 dark:bg-neutral-900/60 dark:text-neutral-100'
                              : 'text-neutral-700 hover:bg-neutral-100/80 dark:text-neutral-200 dark:hover:bg-neutral-900/45'
                          }`}
                        >
                          <MapPin className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                          {tSidebar('proximityInsights')}
                        </Link>
                        <Link
                          href="/admin/cost-explorer"
                          role="menuitem"
                          onClick={() => setToolsFlyoutOpen(false)}
                          className={`flex items-center gap-2 px-3 py-2 text-sm ${
                            activePageId === 'cost-explorer'
                              ? 'bg-neutral-100/90 font-medium text-neutral-900 dark:bg-neutral-900/60 dark:text-neutral-100'
                              : 'text-neutral-700 hover:bg-neutral-100/80 dark:text-neutral-200 dark:hover:bg-neutral-900/45'
                          }`}
                        >
                          <Calculator className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                          {tSidebar('costExplorer')}
                        </Link>
                        <Link
                          href="/admin/rv-site-setup"
                          role="menuitem"
                          onClick={() => setToolsFlyoutOpen(false)}
                          className={`flex items-center gap-2 px-3 py-2 text-sm ${
                            activePageId === 'site-design'
                              ? 'bg-neutral-100/90 font-medium text-neutral-900 dark:bg-neutral-900/60 dark:text-neutral-100'
                              : 'text-neutral-700 hover:bg-neutral-100/80 dark:text-neutral-200 dark:hover:bg-neutral-900/45'
                          }`}
                        >
                          <LayoutGrid className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                          {tSidebar('rvSiteSetup')}
                        </Link>
                        <Link
                          href="/admin/site-builder"
                          role="menuitem"
                          onClick={() => setToolsFlyoutOpen(false)}
                          className={`flex items-center gap-2 px-3 py-2 text-sm ${
                            activePageId === 'site-builder'
                              ? 'bg-neutral-100/90 font-medium text-neutral-900 dark:bg-neutral-900/60 dark:text-neutral-100'
                              : 'text-neutral-700 hover:bg-neutral-100/80 dark:text-neutral-200 dark:hover:bg-neutral-900/45'
                          }`}
                        >
                          <Home className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                          {tSidebar('siteBuilder')}
                        </Link>
                        <Link
                          href="/admin/sage-data"
                          role="menuitem"
                          onClick={() => setToolsFlyoutOpen(false)}
                          className={`flex items-center gap-2 px-3 py-2 text-sm ${
                            activePageId === 'sage-data'
                              ? 'bg-neutral-100/90 font-medium text-neutral-900 dark:bg-neutral-900/60 dark:text-neutral-100'
                              : 'text-neutral-700 hover:bg-neutral-100/80 dark:text-neutral-200 dark:hover:bg-neutral-900/45'
                          }`}
                        >
                          <Table2 className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                          {tSidebar('sageDataResearch')}
                        </Link>
                      </div>
                    ) : null}
                  </div>
                )}
                {showAdminNav ? (
                  !showCollapsed ? (
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => setAdminMenuOpen((o) => !o)}
                        className={`nav-item flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors duration-150 ease-out ${
                          adminSectionActive
                            ? 'bg-neutral-100/90 dark:bg-neutral-900/60 text-neutral-900 dark:text-neutral-100 font-medium'
                            : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100/70 dark:hover:bg-neutral-900/40 hover:text-neutral-900 dark:hover:text-neutral-100'
                        }`}
                        aria-expanded={adminMenuOpen}
                        aria-controls="admin-admin-submenu"
                        id="admin-admin-trigger"
                      >
                        <Shield
                          className={`h-5 w-5 flex-shrink-0 ${
                            adminSectionActive
                              ? 'text-neutral-700 dark:text-neutral-200'
                              : 'text-neutral-500 dark:text-neutral-500'
                          }`}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 truncate text-sm">{tSidebar('admin')}</span>
                        <ChevronDown
                          className={`h-4 w-4 flex-shrink-0 text-neutral-400 transition-transform duration-200 ${
                            adminMenuOpen ? 'rotate-180' : ''
                          }`}
                          aria-hidden
                        />
                      </button>
                      {adminMenuOpen ? (
                        <div
                          ref={adminSubmenuRef}
                          id="admin-admin-submenu"
                          role="region"
                          aria-labelledby="admin-admin-trigger"
                          className="ml-3 space-y-1 border-l border-neutral-200/80 py-0.5 pl-3 dark:border-neutral-800"
                        >
                          {showManagedUsersAdminNav ? (
                            <NavLink
                              href="/admin/users"
                              label={tSidebar('managedUsers')}
                              icon={Users}
                              pageId="managed-users"
                              isActive={activePageId === 'managed-users'}
                              isCollapsed={false}
                            />
                          ) : null}
                          <NavLink
                            href="/admin/job-activity"
                            label={tSidebar('jobActivity')}
                            icon={ScrollText}
                            pageId="job-activity"
                            isActive={activePageId === 'job-activity'}
                            isCollapsed={false}
                          />
                          {showManagedUsersAdminNav ? (
                            <NavLink
                              href="/admin/workload"
                              label={tSidebar('pipelineWorkload')}
                              icon={Briefcase}
                              pageId="pipeline-workload"
                              isActive={activePageId === 'pipeline-workload'}
                              isCollapsed={false}
                            />
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="relative flex justify-center" ref={adminFlyoutRef}>
                      <button
                        type="button"
                        onClick={() => setAdminFlyoutOpen((o) => !o)}
                        className={`nav-item flex items-center justify-center rounded-md px-2 py-2 transition-colors duration-150 ease-out ${
                          adminSectionActive
                            ? 'bg-neutral-100/90 dark:bg-neutral-900/60 text-neutral-900 dark:text-neutral-100'
                            : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100/70 dark:hover:bg-neutral-900/40 hover:text-neutral-900 dark:hover:text-neutral-100'
                        }`}
                        aria-expanded={adminFlyoutOpen}
                        aria-haspopup="menu"
                        aria-label={tSidebar('admin')}
                        title={tSidebar('admin')}
                      >
                        <Shield
                          className={`h-5 w-5 flex-shrink-0 ${
                            adminSectionActive
                              ? 'text-neutral-700 dark:text-neutral-200'
                              : 'text-neutral-500 dark:text-neutral-500'
                          }`}
                        />
                      </button>
                      {adminFlyoutOpen ? (
                        <div
                          role="menu"
                          aria-label={tSidebar('adminMenu')}
                          className="absolute left-full top-0 z-[60] ml-1 min-w-[13.5rem] rounded-md border border-neutral-200/80 bg-white py-1 dark:border-neutral-800 dark:bg-neutral-950"
                        >
                          {showManagedUsersAdminNav ? (
                            <Link
                              href="/admin/users"
                              role="menuitem"
                              onClick={() => setAdminFlyoutOpen(false)}
                              className={`flex items-center gap-2 px-3 py-2 text-sm ${
                                activePageId === 'managed-users'
                                  ? 'bg-neutral-100/90 font-medium text-neutral-900 dark:bg-neutral-900/60 dark:text-neutral-100'
                                  : 'text-neutral-700 hover:bg-neutral-100/80 dark:text-neutral-200 dark:hover:bg-neutral-900/45'
                              }`}
                            >
                              <Users className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                              {tSidebar('managedUsers')}
                            </Link>
                          ) : null}
                          <Link
                            href="/admin/job-activity"
                            role="menuitem"
                            onClick={() => setAdminFlyoutOpen(false)}
                            className={`flex items-center gap-2 px-3 py-2 text-sm ${
                              activePageId === 'job-activity'
                                ? 'bg-neutral-100/90 font-medium text-neutral-900 dark:bg-neutral-900/60 dark:text-neutral-100'
                                : 'text-neutral-700 hover:bg-neutral-100/80 dark:text-neutral-200 dark:hover:bg-neutral-900/45'
                            }`}
                          >
                            <ScrollText className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                            {tSidebar('jobActivity')}
                          </Link>
                          {showManagedUsersAdminNav ? (
                            <Link
                              href="/admin/workload"
                              role="menuitem"
                              onClick={() => setAdminFlyoutOpen(false)}
                              className={`flex items-center gap-2 px-3 py-2 text-sm ${
                                activePageId === 'pipeline-workload'
                                  ? 'bg-neutral-100/90 font-medium text-neutral-900 dark:bg-neutral-900/60 dark:text-neutral-100'
                                  : 'text-neutral-700 hover:bg-neutral-100/80 dark:text-neutral-200 dark:hover:bg-neutral-900/45'
                              }`}
                            >
                              <Briefcase className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                              {tSidebar('pipelineWorkload')}
                            </Link>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  )
                ) : null}
                {/* Sites Export hidden from menu — page still accessible via direct URL */}
              </div>
            </div>

            {/* EXTERNAL section */}
            <div className="py-2">
              {!showCollapsed && (
                <div className="px-3 py-2 text-[10px] font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-[0.16em]">
                  External
                </div>
              )}
              <div className={`space-y-1 ${showCollapsed ? '' : 'ml-4'}`}>
                <Link
                  href="/map"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-page="map"
                  title={showCollapsed ? 'Glamping Map' : undefined}
                  className={`nav-item flex items-center ${showCollapsed ? 'justify-center px-2 py-2' : 'space-x-3 px-3 py-2'} rounded-md transition-colors duration-150 ease-out group ${
                    activePageId === 'map'
                      ? 'bg-neutral-100/90 dark:bg-neutral-900/60 text-neutral-900 dark:text-neutral-100 font-medium'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100/70 dark:hover:bg-neutral-900/40 hover:text-neutral-900 dark:hover:text-neutral-100'
                  }`}
                >
                  <Map
                    className={`w-5 h-5 flex-shrink-0 ${
                      activePageId === 'map' ? 'text-neutral-700 dark:text-neutral-200' : 'text-neutral-500 dark:text-neutral-500 group-hover:text-neutral-700 dark:group-hover:text-neutral-300'
                    }`}
                  />
                  {!showCollapsed && <span className="text-sm">Glamping Map</span>}
                </Link>
              </div>
            </div>
          </nav>

          {/* Footer - theme toggle + user profile (modern CPO placement) */}
          <div
            className={`absolute bottom-0 left-0 right-0 z-20 border-t border-neutral-200/75 dark:border-neutral-800 bg-white dark:bg-neutral-950 space-y-3 ${showCollapsed ? 'p-2' : 'p-4'}`}
          >
            <div className={`flex items-center ${showCollapsed ? 'justify-center' : 'justify-between'}`}>
              {!showCollapsed && (
                <span className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-[0.14em]">Appearance</span>
              )}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-md hover:bg-neutral-100/90 dark:hover:bg-neutral-900/50 text-neutral-500 dark:text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                title={isDark ? 'Light mode' : 'Dark mode'}
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
            <div className={`flex items-center ${showCollapsed ? 'justify-center gap-1' : 'justify-between gap-2'} pt-3 border-t border-neutral-200/75 dark:border-neutral-800`}>
              {!showCollapsed && (
                <Link
                  href="/admin/account"
                  title={tAccount('title')}
                  className={`flex min-w-0 flex-1 items-center space-x-3 rounded-md transition-colors ${
                    isAccountPage
                      ? 'bg-neutral-100/90 dark:bg-neutral-900/60'
                      : 'hover:bg-neutral-100/70 dark:hover:bg-neutral-900/40'
                  }`}
                >
                  <div className="w-8 h-8 bg-neutral-200/80 dark:bg-neutral-800 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
                  </div>
                  <div className="flex-1 min-w-0 py-1">
                    <p
                      id="userEmail"
                      className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate"
                      title={userEmail}
                    >
                      {userEmail}
                    </p>
                    {userRoleLabel ? (
                      <p className="text-xs text-neutral-500 dark:text-neutral-500 truncate">
                        {userRoleLabel}
                      </p>
                    ) : null}
                  </div>
                </Link>
              )}
              {showCollapsed && (
                <Link
                  href="/admin/account"
                  title={userEmail}
                  className={`w-8 h-8 bg-neutral-200/80 dark:bg-neutral-800 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                    isAccountPage ? 'ring-2 ring-sage-600/40' : 'hover:bg-neutral-300/80 dark:hover:bg-neutral-700'
                  }`}
                >
                  <User className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="p-1 rounded-md hover:bg-neutral-100/90 dark:hover:bg-neutral-900/50 text-neutral-400 hover:text-red-600 transition-colors flex-shrink-0"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile toggle button */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-40 p-2 bg-white dark:bg-neutral-950 rounded-md border border-neutral-200/80 dark:border-neutral-800 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>
    </>
  );
}
