'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  BarChart2,
  Map,
  FileText,
  FilePlus,
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
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSidebar } from '@/lib/sidebar-context';
import { supabase } from '@/lib/supabase';

const LOGO_LIGHT =
  'https://b0evzueuuq9l227n.public.blob.vercel-storage.com/admin-logos/sage-logo-light.png';
const LOGO_DARK =
  'https://b0evzueuuq9l227n.public.blob.vercel-storage.com/admin-logos/sage-logo-dark.png';

function getActivePageId(pathname: string): string {
  if (!pathname) return '';
  if (pathname.startsWith('/admin/dashboard')) return 'dashboard';
  if (pathname === '/map' || pathname.startsWith('/en/map')) return 'map';
  if (pathname.startsWith('/admin/client-map')) return 'client-map';
  if (pathname.startsWith('/admin/past-reports')) return 'past-reports';
  if (pathname.startsWith('/admin/report-builder')) return 'report-builder';
  if (pathname.startsWith('/admin/comps') && !pathname.startsWith('/admin/comps-v2')) return 'comps';
  if (pathname.startsWith('/admin/proximity-insights')) return 'proximity-insights';
  if (pathname.startsWith('/admin/rv-site-setup') || pathname.startsWith('/admin/site-design')) return 'site-design';
  if (pathname.startsWith('/admin/site-builder')) return 'site-builder';
  if (pathname.startsWith('/admin/audit-log')) return 'audit-log';
  if (pathname.startsWith('/admin/cost-explorer')) return 'cost-explorer';
  if (pathname.startsWith('/admin/sites-export')) return 'sites-export';
  return '';
}

function NavLink({
  href,
  label,
  icon: Icon,
  pageId,
  isActive,
  isCollapsed,
  showBeta,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  pageId: string;
  isActive: boolean;
  isCollapsed?: boolean;
  showBeta?: boolean;
}) {
  const tSidebar = useTranslations('admin.sidebar');
  const collapsed = isCollapsed ?? false;
  const collapsedTitle =
    collapsed && showBeta ? `${label} (${tSidebar('beta')})` : collapsed ? label : undefined;
  return (
    <Link
      href={href}
      data-page={pageId}
      title={collapsedTitle}
      className={`nav-item flex items-center ${collapsed ? 'justify-center px-2 py-2' : 'space-x-3 px-3 py-2'} rounded-lg transition-all duration-200 ease-in-out group ${
        isActive
          ? 'bg-sage-50 dark:bg-white/10 text-sage-700 dark:text-sage-300 font-medium'
          : 'text-gray-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-gray-200'
      }`}
    >
      <Icon
        className={`w-5 h-5 flex-shrink-0 ${
          isActive ? 'text-sage-600 dark:text-sage-400' : 'text-gray-500 dark:text-gray-400 group-hover:text-slate-600 dark:group-hover:text-gray-300'
        }`}
      />
      {!collapsed && (
        <span className="text-sm inline-flex items-center gap-1.5 min-w-0 flex-1">
          <span className="truncate">{label}</span>
          {showBeta ? (
            <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-1 py-px text-[8px] font-semibold uppercase leading-none tracking-wide text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-200">
              {tSidebar('beta')}
            </span>
          ) : null}
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  const activePageId = getActivePageId(pathname || '');
  const showCollapsed = isDesktop && isCollapsed;
  const tSidebar = useTranslations('admin.sidebar');

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
        } else {
          setUserEmail('Not logged in');
        }
      } catch {
        setUserEmail('Error loading user');
      }
    };
    loadUser();
  }, []);

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
        className={`fixed inset-y-0 left-0 z-50 bg-white dark:bg-black border-r border-gray-200 dark:border-gray-900/50 transition-all duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } w-64 ${isCollapsed ? 'lg:w-20' : ''}`}
      >
        <div className="flex flex-col h-full">
          {/* Header - Logo area */}
          <div className={`flex items-center justify-center border-b border-gray-200 dark:border-gray-900/50 relative py-0 ${showCollapsed ? 'pt-8' : ''}`}>
            <Link
              href="/admin/dashboard"
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
              className="absolute top-1 right-1 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
            <button
              onClick={toggleCollapsed}
              className="absolute top-1 right-1 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 hidden lg:flex items-center justify-center"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <ChevronsRight className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              ) : (
                <ChevronsLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              )}
            </button>
          </div>

          {/* Navigation - pb-24 to clear absolute footer */}
          <nav className="pt-2 px-4 pb-24 space-y-1 flex-1 overflow-y-auto">
            {/* Dashboard - top-level */}
            <div className="py-2">
              <NavLink
                href="/admin/dashboard"
                label="Dashboard"
                icon={BarChart2}
                pageId="dashboard"
                isActive={activePageId === 'dashboard'}
                isCollapsed={showCollapsed}
              />
            </div>

            {/* INTERNAL section */}
            <div className="py-2">
              {!showCollapsed && (
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
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
                  className={`nav-item flex items-center ${showCollapsed ? 'justify-center px-2 py-2' : 'space-x-3 px-3 py-2'} rounded-lg transition-all duration-200 ease-in-out group text-gray-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-gray-200`}
                >
                  <Globe
                    className="w-5 h-5 flex-shrink-0 text-gray-500 dark:text-gray-400 group-hover:text-slate-600 dark:group-hover:text-gray-300"
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
                  href="/admin/comps"
                  label="Comps"
                  icon={TentTree}
                  pageId="comps"
                  isActive={activePageId === 'comps'}
                  isCollapsed={showCollapsed}
                />
                <NavLink
                  href="/admin/past-reports"
                  label="Past Reports"
                  icon={FileText}
                  pageId="past-reports"
                  isActive={activePageId === 'past-reports'}
                  isCollapsed={showCollapsed}
                />
                <NavLink
                  href="/admin/report-builder"
                  label="Report Builder"
                  icon={FilePlus}
                  pageId="report-builder"
                  isActive={activePageId === 'report-builder'}
                  isCollapsed={showCollapsed}
                  showBeta
                />
                <NavLink
                  href="/admin/proximity-insights"
                  label="Proximity Insights"
                  icon={MapPin}
                  pageId="proximity-insights"
                  isActive={activePageId === 'proximity-insights'}
                  isCollapsed={showCollapsed}
                  showBeta
                />
                <NavLink
                  href="/admin/rv-site-setup"
                  label="RV Site Setup"
                  icon={LayoutGrid}
                  pageId="site-design"
                  isActive={activePageId === 'site-design'}
                  isCollapsed={showCollapsed}
                  showBeta
                />
                <NavLink
                  href="/admin/site-builder"
                  label="Site Builder"
                  icon={Home}
                  pageId="site-builder"
                  isActive={activePageId === 'site-builder'}
                  isCollapsed={showCollapsed}
                  showBeta
                />
                <NavLink
                  href="/admin/cost-explorer"
                  label="Cost Explorer"
                  icon={Calculator}
                  pageId="cost-explorer"
                  isActive={activePageId === 'cost-explorer'}
                  isCollapsed={showCollapsed}
                />
                {/* Sites Export hidden from menu — page still accessible via direct URL */}
              </div>
            </div>

            {/* EXTERNAL section */}
            <div className="py-2">
              {!showCollapsed && (
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
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
                  className={`nav-item flex items-center ${showCollapsed ? 'justify-center px-2 py-2' : 'space-x-3 px-3 py-2'} rounded-lg transition-all duration-200 ease-in-out group ${
                    activePageId === 'map'
                      ? 'bg-sage-50 dark:bg-white/10 text-sage-700 dark:text-sage-300 font-medium'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-gray-200'
                  }`}
                >
                  <Map
                    className={`w-5 h-5 flex-shrink-0 ${
                      activePageId === 'map' ? 'text-sage-600 dark:text-sage-400' : 'text-gray-500 dark:text-gray-400 group-hover:text-slate-600 dark:group-hover:text-gray-300'
                    }`}
                  />
                  {!showCollapsed && <span className="text-sm">Glamping Map</span>}
                </Link>
              </div>
            </div>
          </nav>

          {/* Footer - theme toggle + user profile (modern CPO placement) */}
          <div className={`absolute bottom-0 left-0 right-0 border-t border-gray-200 dark:border-gray-900/50 bg-white dark:bg-black space-y-3 ${showCollapsed ? 'p-2' : 'p-4'}`}>
            <div className={`flex items-center ${showCollapsed ? 'justify-center' : 'justify-between'}`}>
              {!showCollapsed && (
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Appearance</span>
              )}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                title={isDark ? 'Light mode' : 'Dark mode'}
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
            <div className={`flex items-center ${showCollapsed ? 'justify-center gap-1' : 'justify-between gap-2'} pt-3 border-t border-gray-200 dark:border-gray-900/50`}>
              {!showCollapsed && (
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="w-8 h-8 bg-sage-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-sage-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      id="userEmail"
                      className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate"
                      title={userEmail}
                    >
                      {userEmail}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Administrator</p>
                  </div>
                </div>
              )}
              {showCollapsed && (
                <div
                  className="w-8 h-8 bg-sage-100 rounded-full flex items-center justify-center flex-shrink-0"
                  title={userEmail}
                >
                  <User className="w-4 h-4 text-sage-600" />
                </div>
              )}
              <button
                onClick={handleLogout}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
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
        className="fixed top-4 left-4 z-40 p-2 bg-white dark:bg-black rounded-lg shadow-md lg:hidden border border-gray-200 dark:border-gray-900/50"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>
    </>
  );
}
