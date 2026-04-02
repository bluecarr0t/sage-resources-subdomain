'use client';

import { useState, useEffect, useRef, ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { isAllowedEmailDomain } from '@/lib/auth-helpers';

const AUTH_CHECK_TIMEOUT_MS = 12_000;

interface AdminAuthGuardProps {
  children: ReactNode;
  /**
   * When true, render children immediately. The admin layout must only set this after
   * `getAdminAuthServer()` succeeds. Client still re-verifies session + managed_users.
   */
  trustServerAuth?: boolean;
}

export default function AdminAuthGuard({
  children,
  trustServerAuth = false,
}: AdminAuthGuardProps) {
  const [authorized, setAuthorized] = useState(trustServerAuth);
  const [checking, setChecking] = useState(!trustServerAuth);
  const [timedOut, setTimedOut] = useState(false);
  const router = useRouter();
  const mountedRef = useRef(true);
  const completedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    completedRef.current = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const redirectToLogin = () => {
      completedRef.current = true;
      if (mountedRef.current) {
        setAuthorized(false);
        router.replace('/login');
      }
    };

    const checkAccess = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!mountedRef.current) return;

        if (!session?.user) {
          redirectToLogin();
          return;
        }

        if (!isAllowedEmailDomain(session.user.email)) {
          await supabase.auth.signOut();
          redirectToLogin();
          return;
        }

        const { data: managedUser, error } = await supabase
          .from('managed_users')
          .select('id, is_active')
          .eq('user_id', session.user.id)
          .eq('is_active', true)
          .single();

        if (!mountedRef.current) return;

        if (error || !managedUser) {
          await supabase.auth.signOut();
          redirectToLogin();
          return;
        }

        setAuthorized(true);
      } catch (err) {
        console.error('[Admin] Auth check error:', err);
        redirectToLogin();
      } finally {
        completedRef.current = true;
        if (mountedRef.current) {
          setChecking(false);
          setTimedOut(false);
        }
      }
    };

    // Timeout: after deploy, session/cookie sync can hang. Show re-login prompt instead of infinite "Verifying access...".
    timeoutId = setTimeout(() => {
      if (mountedRef.current && !completedRef.current) {
        setTimedOut(true);
        setChecking(false);
      }
    }, AUTH_CHECK_TIMEOUT_MS);

    checkAccess();

    return () => {
      mountedRef.current = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [router]);

  if (timedOut) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Session verification timed out. This can happen after a deployment — please log in again.
          </p>
          <Link
            href="/login"
            className="inline-flex px-4 py-2 rounded-lg bg-sage-600 text-white font-medium hover:bg-sage-700 transition-colors"
          >
            Log in
          </Link>
        </div>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">Verifying access...</div>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return <>{children}</>;
}
