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
      // During build time, create a properly initialized client with placeholder values
      // This ensures all properties (including 'auth') are properly initialized
      // The client won't work for actual queries, but it won't crash during build
      _supabaseClient = createClient(
        'https://placeholder.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTIwMDAsImV4cCI6MTk2MDc2ODAwMH0.placeholder',
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        }
      );
    }
  }
  
  return _supabaseClient;
}

// Create a proxy that validates on first property access
// During build time, return a safe mock to prevent initialization errors
const isBuildTime = typeof window === 'undefined' && !process.env.NEXT_PUBLIC_SUPABASE_URL;

export const supabase = isBuildTime
  ? ({
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        getUser: async () => ({ data: { user: null }, error: null }),
        signOut: async () => ({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: null }, error: null }),
      },
      from: () => ({
        select: () => Promise.resolve({ data: null, error: null }),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => Promise.resolve({ data: null, error: null }),
        delete: () => Promise.resolve({ data: null, error: null }),
      }),
    } as any as SupabaseClient)
  : new Proxy({} as SupabaseClient, {
      get(_target, prop) {
        const client = getSupabaseClient();
        return (client as any)[prop];
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

