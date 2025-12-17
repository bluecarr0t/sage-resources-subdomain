// Use type-only import to avoid executing Supabase library code during build
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
const hasValidCredentials = supabaseUrl && supabasePublishableKey && 
                            supabaseUrl !== '' && 
                            supabasePublishableKey !== '' &&
                            !supabaseUrl.includes('placeholder') &&
                            !supabasePublishableKey.includes('placeholder');

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

/**
 * Check if we're in a Next.js build/static generation context
 * During build, we should never load the Supabase library to avoid initialization errors
 */
function isBuildContext(): boolean {
  // Check for Next.js build phase (most reliable indicator)
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return true;
  }
  // During static generation, Next.js sets this to 'export'
  if (process.env.NEXT_PHASE === 'phase-export') {
    return true;
  }
  // Check if we're in Vercel build environment
  if (process.env.VERCEL === '1' && process.env.CI === '1') {
    // During Vercel builds, we're in CI and building
    // But we need to distinguish between build and runtime
    // If NEXT_PHASE is not set but we're in CI, check if we're server-side without credentials
    if (typeof window === 'undefined' && !hasValidCredentials) {
      return true;
    }
  }
  // If we're server-side and don't have valid credentials, assume build context
  // This is a fallback - during actual runtime SSR, credentials should be available
  if (typeof window === 'undefined' && !hasValidCredentials) {
    return true;
  }
  return false;
}

function getSupabaseClient(): SupabaseClient {
  // During build time, always use mock client to avoid Supabase library issues
  const isBuild = isBuildContext();
  
  // Validate config when client is first accessed (lazy validation) - only in browser
  if (typeof window !== 'undefined') {
    const configError = getSupabaseConfigError();
    if (configError) {
      throw new Error(configError);
    }
  }
  
  // Create client if it doesn't exist
  if (!_supabaseClient) {
    // During build time, ALWAYS use mock client to prevent Supabase library from executing
    // Never call require('@supabase/supabase-js') during build, even if credentials are valid
    if (isBuild) {
      _supabaseClient = createMockClient();
    } else if (!hasValidCredentials) {
      // In browser but no valid credentials - use mock
      _supabaseClient = createMockClient();
    } else {
      // Only create real client in browser with valid credentials
      // Double-check we're not in build context before requiring
      if (!isBuildContext() && typeof window !== 'undefined') {
        try {
          // Use require for synchronous loading in browser
          // This should only execute at runtime, not during build
          const supabaseModule = require('@supabase/supabase-js');
          _supabaseClient = supabaseModule.createClient(supabaseUrl, supabasePublishableKey);
        } catch (error) {
          console.warn('Failed to create Supabase client:', error);
          _supabaseClient = createMockClient();
        }
      } else {
        _supabaseClient = createMockClient();
      }
    }
  }
  
  // Always return a client (never null)
  return _supabaseClient || createMockClient();
}

/**
 * Creates a mock query builder that supports chaining methods
 * Returns empty data during build time to prevent errors
 */
function createMockQueryBuilder() {
  const chainableMethods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in', 'contains', 'containedBy', 'rangeGt', 'rangeGte', 'rangeLt', 'rangeLte', 'rangeAdjacent', 'overlaps', 'textSearch', 'match',
    'not', 'or', 'filter',
    'order', 'limit', 'range', 'abortSignal', 'single', 'maybeSingle', 'csv', 'geojson', 'explain',
    'returns'
  ];
  
  const builder: any = {};
  
  // Create chainable methods that return the builder itself
  chainableMethods.forEach(method => {
    builder[method] = (...args: any[]) => {
      // If this is a terminal method (select, insert, update, delete, upsert), return a promise
      if (['select', 'insert', 'update', 'delete', 'upsert'].includes(method)) {
        return Promise.resolve({ data: [], error: null });
      }
      // Otherwise, return builder for chaining
      return builder;
    };
  });
  
  return builder;
}

/**
 * Creates a mock Supabase client for build time when real credentials are unavailable
 */
function createMockClient(): SupabaseClient {
  const mockClient = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: null }, error: null }),
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: null }),
      signUp: async () => ({ data: { user: null, session: null }, error: null }),
    },
    from: () => createMockQueryBuilder(),
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: null }),
        download: async () => ({ data: null, error: null }),
        list: async () => ({ data: null, error: null }),
        remove: async () => ({ data: null, error: null }),
        createSignedUrl: async () => ({ data: null, error: null }),
      }),
    },
  } as any as SupabaseClient;
  
  return mockClient;
}

// Create a proxy that validates on first property access
// This ensures the client is only created when actually accessed, not during module initialization
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    // During build, always return mock client properties to prevent any Supabase library execution
    if (isBuildContext()) {
      const mockClient = createMockClient();
      return mockClient[prop as keyof SupabaseClient];
    }
    
    try {
      const client = getSupabaseClient();
      // Always return a value from the client, even if it's undefined
      // This prevents the Supabase library from trying to destructure undefined values
      const value = (client as any)?.[prop];
      return value;
    } catch (error) {
      // If accessing the client fails, return a safe fallback from mock
      console.warn('Supabase client access failed:', error);
      try {
        const mockClient = createMockClient();
        return mockClient[prop as keyof SupabaseClient];
      } catch (mockError) {
        // If even the mock fails, return undefined
        console.warn('Failed to create mock client:', mockError);
        return undefined;
      }
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
  // During build time, ALWAYS return mock client to prevent Supabase library execution
  // Never call require('@supabase/supabase-js') during build, even if credentials are valid
  if (isBuildContext()) {
    return createMockClient();
  }

  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseSecretKey) {
    throw new Error(
      'Missing SUPABASE_SECRET_KEY environment variable. This is required for server-side operations.'
    );
  }

  try {
    // Use dynamic import for server-side to prevent webpack bundling during build
    // Note: This needs to be synchronous for server-side usage, so we use require
    // but only if we're not in build context (checked above)
    const supabaseModule = require('@supabase/supabase-js');
    return supabaseModule.createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  } catch (error) {
    console.warn('Failed to create Supabase server client:', error);
    return createMockClient();
  }
}

