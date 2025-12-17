import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

/**
 * Validates Supabase configuration and provides helpful error messages
 */
function getSupabaseConfigError(): string | null {
  if (typeof window === 'undefined') {
    // Server-side or build time - don't validate
    return null;
  }
  
  if (!supabaseUrl || !supabasePublishableKey) {
    const missingVars: string[] = [];
    if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!supabasePublishableKey) missingVars.push('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
    
    const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost';
    const envHint = isProduction
      ? 'Please check your Vercel project settings → Environment Variables. Make sure the variables are set for "Production" environment and redeploy after adding them.'
      : 'Please check your .env.local file.';
    
    return (
      `Missing Supabase environment variables: ${missingVars.join(', ')}. ` +
      `${envHint} See SUPABASE_SETUP.md for setup instructions.`
    );
  }
  
  return null;
}

/**
 * Client-side Supabase client
 * Safe to use in browser/client components
 * Uses the publishable key and respects Row Level Security (RLS)
 * 
 * Note: If environment variables are missing, the client will throw a helpful
 * error when first used (not on module load), allowing the app to load without
 * crashing immediately. Components can handle this error gracefully.
 */
let _supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  // Validate config when client is first accessed (lazy validation)
  if (typeof window !== 'undefined') {
    const configError = getSupabaseConfigError();
    if (configError) {
      throw new Error(configError);
    }
  }
  
  // Create client if it doesn't exist
  if (!_supabaseClient) {
    if (supabaseUrl && supabasePublishableKey) {
      _supabaseClient = createClient(supabaseUrl, supabasePublishableKey);
    } else {
      // During build time (when env vars are missing), try to create a minimal client
      // If this fails, we'll catch and return a mock
      try {
        _supabaseClient = createClient(
          'https://placeholder.supabase.co',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTIwMDAsImV4cCI6MTk2MDc2ODAwMH0.placeholder',
          {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
              detectSessionInUrl: false,
            },
            global: {
              headers: {},
            },
          }
        );
      } catch (error) {
        // If client creation fails during build, return null
        // The proxy will handle this case
        console.warn('Failed to create Supabase client during build:', error);
        return null as any;
      }
    }
  }
  
  return _supabaseClient;
}

// Create a proxy that validates on first property access
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    try {
      const client = getSupabaseClient();
      if (!client) {
        // Return mock during build time if client creation failed
        if (prop === 'auth') {
          return {
            getSession: async () => ({ data: { session: null }, error: null }),
            getUser: async () => ({ data: { user: null }, error: null }),
            signOut: async () => ({ error: null }),
            onAuthStateChange: () => ({ data: { subscription: null }, error: null }),
          };
        }
        if (prop === 'from') {
          return () => ({
            select: () => Promise.resolve({ data: null, error: null }),
            insert: () => Promise.resolve({ data: null, error: null }),
            update: () => Promise.resolve({ data: null, error: null }),
            delete: () => Promise.resolve({ data: null, error: null }),
          });
        }
        return undefined;
      }
      return (client as any)[prop];
    } catch (error) {
      // If accessing the client fails, return a safe fallback
      console.warn('Supabase client access failed:', error);
      if (prop === 'auth') {
        return {
          getSession: async () => ({ data: { session: null }, error: null }),
          getUser: async () => ({ data: { user: null }, error: null }),
          signOut: async () => ({ error: null }),
        };
      }
      return undefined;
    }
  }
}) as SupabaseClient;

/**
 * Server-side Supabase client
 * Only use in server-side code (API routes, Server Components, Server Actions)
 * Uses the secret key for privileged access - bypasses RLS
 * NEVER expose this key to the client
 */
export function createServerClient(): SupabaseClient {
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseSecretKey) {
    throw new Error(
      'Missing SUPABASE_SECRET_KEY environment variable. This is required for server-side operations.'
    );
  }

  return createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

