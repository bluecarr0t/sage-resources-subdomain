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
  UploadCloud,
  User,
  LogOut,
  X,
  Menu,
  Database,
  Sun,
  Moon,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

const LOGO_LIGHT =
  'https://b0evzueuuq9l227n.public.blob.vercel-storage.com/admin-logos/sage-logo-light.png';
const LOGO_DARK =
  'https://b0evzueuuq9l227n.public.blob.vercel-storage.com/admin-logos/sage-logo-dark.png';

function getActivePageId(pathname: string): string {
  if (!pathname) return '';
  if (pathname.startsWith('/admin/dashboard')) return 'dashboard';
  if (pathname.startsWith('/admin/sage-glamping-data-breakdown')) return 'sage-glamping-data-breakdown';
  if (pathname === '/map' || pathname.startsWith('/en/map')) return 'map';
  if (pathname.startsWith('/admin/client-map')) return 'client-map';
  if (pathname.startsWith('/admin/past-reports')) return 'past-reports';
  if (pathname.startsWith('/admin/upload-reports')) return 'upload-reports';
  return '';
}

function NavLink({
  href,
  label,
  icon: Icon,
  pageId,
  isActive,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  pageId: string;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      data-page={pageId}
      className={`nav-item flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ease-in-out group ${
        isActive
          ? 'bg-sage-50 dark:bg-white/10 text-sage-700 dark:text-sage-300 font-medium'
          : 'text-gray-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-gray-200'
      }`}
    >
      <Icon
        className={`w-5 h-5 flex-shrink-0 ${
          isActive ? 'text-sage-600 dark:text-sage-400' : 'group-hover:text-slate-600 dark:group-hover:text-gray-300'
        }`}
      />
      <span className="sidebar-text">{label}</span>
    </Link>
  );
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const { setTheme, resolvedTheme } = useTheme();
  const [userEmail, setUserEmail] = useState<string>('Loading...');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const activePageId = getActivePageId(pathname || '');

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
      await fetch('/api/auth/logout', { method: 'POST' });
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
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-black border-r border-gray-200 dark:border-gray-900/50 transition-all duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header - Logo area */}
          <div className="flex items-center justify-center border-b border-gray-200 dark:border-gray-900/50 relative py-4">
            <Link href="/admin/dashboard" className="flex items-center justify-center w-40 h-40">
              <Image
                src={isDark ? LOGO_DARK : LOGO_LIGHT}
                alt="Sage Outdoor Advisory"
                width={160}
                height={160}
                className="w-40 h-40 object-contain"
              />
            </Link>
            <button
              onClick={toggleSidebar}
              className="absolute top-1 right-1 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation - pb-24 to clear absolute footer */}
          <nav className="p-4 space-y-1 flex-1 overflow-y-auto pb-24">
            {/* Dashboard - top-level */}
            <div className="py-2">
              <NavLink
                href="/admin/dashboard"
                label="Dashboard"
                icon={BarChart2}
                pageId="dashboard"
                isActive={activePageId === 'dashboard'}
              />
            </div>

            {/* INTERNAL section */}
            <div className="py-2">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Internal
              </div>
              <div className="space-y-1 ml-4">
                <NavLink
                  href="/admin/client-map"
                  label="Client Map"
                  icon={Map}
                  pageId="client-map"
                  isActive={activePageId === 'client-map'}
                />
                <NavLink
                  href="/admin/past-reports"
                  label="Past Reports"
                  icon={FileText}
                  pageId="past-reports"
                  isActive={activePageId === 'past-reports'}
                />
                <NavLink
                  href="/admin/upload-reports"
                  label="Upload Report"
                  icon={UploadCloud}
                  pageId="upload-reports"
                  isActive={activePageId === 'upload-reports'}
                />
                <NavLink
                  href="/admin/sage-glamping-data-breakdown"
                  label="Sage Glamping Data"
                  icon={Database}
                  pageId="sage-glamping-data-breakdown"
                  isActive={activePageId === 'sage-glamping-data-breakdown'}
                />
              </div>
            </div>

            {/* EXTERNAL section */}
            <div className="py-2">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                External
              </div>
              <div className="space-y-1 ml-4">
                <Link
                  href="/map"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-page="map"
                  className={`nav-item flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ease-in-out group ${
                    activePageId === 'map'
                      ? 'bg-sage-50 dark:bg-white/10 text-sage-700 dark:text-sage-300 font-medium'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-gray-200'
                  }`}
                >
                  <Map
                    className={`w-5 h-5 flex-shrink-0 ${
                      activePageId === 'map' ? 'text-sage-600 dark:text-sage-400' : 'group-hover:text-slate-600 dark:group-hover:text-gray-300'
                    }`}
                  />
                  <span className="sidebar-text">Glamping Map</span>
                </Link>
              </div>
            </div>
          </nav>

          {/* Footer - theme toggle + user profile (modern CPO placement) */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-900/50 bg-white dark:bg-black space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Appearance</span>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                title={isDark ? 'Light mode' : 'Dark mode'}
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-200 dark:border-gray-900/50">
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
