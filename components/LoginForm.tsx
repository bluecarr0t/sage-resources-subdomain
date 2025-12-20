'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { isAllowedEmailDomain } from '@/lib/auth-helpers';

interface LoginFormProps {
  locale: string;
}

export default function LoginForm({ locale }: LoginFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check if user is already authenticated and has access
  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    const verifyUserAccess = async (userId: string, userEmail?: string | null) => {
      try {
        // Step 1: Get user email from session if not provided
        let email = userEmail;
        if (!email) {
          const { data: { session } } = await supabase.auth.getSession();
          email = session?.user?.email || null;
        }

        // Step 2: Validate email domain (CRITICAL SECURITY CHECK)
        if (!isAllowedEmailDomain(email)) {
          // User's email is not from an allowed domain - sign them out immediately
          await supabase.auth.signOut();
          setError('Access denied. Only users with @sageoutdooradvisory.com or @sagecommercialadvisory.com email addresses are authorized to access this application.');
          setCheckingAuth(false);
          return;
        }

        // Step 3: Verify user is in managed_users table (SECOND SECURITY CHECK)
        const { data: managedUser, error } = await supabase
          .from('managed_users')
          .select('id, is_active')
          .eq('user_id', userId)
          .eq('is_active', true)
          .single();

        if (error || !managedUser) {
          // User is not in managed_users - sign them out
          await supabase.auth.signOut();
          setError('Access denied. Your account is not authorized to access this application. Please contact an administrator to be added to the system.');
          setCheckingAuth(false);
          return;
        }

        // User has passed both security checks - redirect them to admin page
        // Always redirect to /admin after successful authentication
        // (Supabase OAuth redirects to Site URL, so we handle redirect here)
        router.push('/admin');
        router.refresh();
      } catch (err) {
        console.error('Error verifying user access:', err);
        setError('Error verifying access. Please try again.');
        setCheckingAuth(false);
      }
    };

    const checkAuth = async () => {
      try {
        // Listen for auth state changes (handles OAuth redirect)
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
              // Pass user email for domain validation
              await verifyUserAccess(session.user.id, session.user.email);
            }
          }
        );

        subscription = authSubscription;

        // Check current session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Pass user email for domain validation
          await verifyUserAccess(session.user.id, session.user.email);
        } else {
          setCheckingAuth(false);
        }
      } catch (err) {
        console.error('Error checking auth:', err);
        setCheckingAuth(false);
      }
    };

    checkAuth();

    // Cleanup subscription on unmount
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [locale, router, searchParams]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      // Construct redirect URL - use query param or default to admin page
      const redirectPath = searchParams.get('redirect') || '/admin';
      const redirectTo = typeof window !== 'undefined' 
        ? `${window.location.origin}${redirectPath}`
        : '/admin';
      
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo,
          queryParams: {
            // Restrict to primary Google Workspace domain as first layer of security
            // Note: hd parameter only supports one domain, so we also validate email domain after authentication
            hd: 'sageoutdooradvisory.com', // Primary domain restriction
          },
        },
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
      }
      // Note: OAuth redirects to Google, so we won't see success message
      // The redirectTo URL will handle the return
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setLoading(false);
    }
  };


  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Google Sign-In Button */}
      <button
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#006b5f] focus:ring-offset-2"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {loading ? 'Signing in...' : 'Continue with Google'}
      </button>
    </div>
  );
}
