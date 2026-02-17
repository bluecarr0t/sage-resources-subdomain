'use client';

import { useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { isAllowedEmailDomain } from '@/lib/auth-helpers';

interface AdminAuthGuardProps {
  children: ReactNode;
}

export default function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          router.replace('/login');
          return;
        }

        if (!isAllowedEmailDomain(session.user.email)) {
          await supabase.auth.signOut();
          router.replace('/login');
          return;
        }

        const { data: managedUser, error } = await supabase
          .from('managed_users')
          .select('id, is_active')
          .eq('user_id', session.user.id)
          .eq('is_active', true)
          .single();

        if (error || !managedUser) {
          await supabase.auth.signOut();
          router.replace('/login');
          return;
        }

        setAuthorized(true);
      } catch (err) {
        console.error('[Admin] Auth check error:', err);
        router.replace('/login');
      } finally {
        setChecking(false);
      }
    };

    checkAccess();
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Verifying access...</div>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return <>{children}</>;
}
