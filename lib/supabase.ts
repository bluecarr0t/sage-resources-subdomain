// Conditionally import Supabase only in the browser
// During server-side builds/SSR, we'll use a mock type
let createClient: any;
let SupabaseClient: any;

if (typeof window !== 'undefined') {
  // Only import in browser - this prevents bundling during server builds
  const supabaseModule = require('@supabase/supabase-js');
  createClient = supabaseModule.createClient;
  SupabaseClient = supabaseModule.SupabaseClient;
} else {
  // Server-side mock - never load the real library
  createClient = null;
  SupabaseClient = null;
}

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
 * Creates a mock Supabase client for server-side rendering
 * Returns empty data for all queries to prevent errors during build
 */
function createMockClient(): any {
  const mockQueryBuilder = {
    select: () => mockQueryBuilder,
    insert: () => mockQueryBuilder,
    update: () => mockQueryBuilder,
    delete: () => mockQueryBuilder,
    eq: () => mockQueryBuilder,
    neq: () => mockQueryBuilder,
    gt: () => mockQueryBuilder,
    gte: () => mockQueryBuilder,
    lt: () => mockQueryBuilder,
    lte: () => mockQueryBuilder,
    like: () => mockQueryBuilder,
    ilike: () => mockQueryBuilder,
    is: () => mockQueryBuilder,
    in: () => mockQueryBuilder,
    not: () => mockQueryBuilder,
    or: () => mockQueryBuilder,
    filter: () => mockQueryBuilder,
    order: () => mockQueryBuilder,
    limit: () => mockQueryBuilder,
    range: () => mockQueryBuilder,
    single: () => mockQueryBuilder,
    maybeSingle: () => mockQueryBuilder,
    then: (resolve: any) => resolve({ data: [], error: null }),
    catch: () => Promise.resolve({ data: [], error: null }),
  };

  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: null }, error: null }),
      signInWithPassword: async () => ({ data: null, error: null }),
      signUp: async () => ({ data: null, error: null }),
    },
    from: () => mockQueryBuilder,
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: null }),
        download: async () => ({ data: null, error: null }),
        list: async () => ({ data: [], error: null }),
        remove: async () => ({ data: null, error: null }),
        createSignedUrl: async () => ({ data: null, error: null }),
      }),
    },
  };
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
let _supabaseClient: any = null;

function getSupabaseClient(): any {
  // Server-side: always return mock client
  if (typeof window === 'undefined') {
    return createMockClient();
  }
  
  // Validate config when client is first accessed (lazy validation)
  const configError = getSupabaseConfigError();
  if (configError) {
    throw new Error(configError);
  }
  
  // Create client if it doesn't exist
  if (!_supabaseClient && createClient) {
    if (supabaseUrl && supabasePublishableKey) {
      _supabaseClient = createClient(supabaseUrl, supabasePublishableKey);
    } else {
      // Fallback to mock if no credentials
      _supabaseClient = createMockClient();
    }
  }
  
  return _supabaseClient || createMockClient();
}

// Create a proxy that validates on first property access
export const supabase = new Proxy({} as any, {
  get(_target, prop) {
    const client = getSupabaseClient();
    return (client as any)[prop];
  }
});

/**
 * Server-side Supabase client
 * Only use in server-side code (API routes, Server Components, Server Actions)
 * Uses the secret key for privileged access - bypasses RLS
 * NEVER expose this key to the client
 */
export function createServerClient(): any {
  // Always return mock client on server-side to prevent library execution during build
  if (typeof window === 'undefined') {
    return createMockClient();
  }

  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseSecretKey) {
    throw new Error(
      'Missing SUPABASE_SECRET_KEY environment variable. This is required for server-side operations.'
    );
  }

  if (createClient) {
    return createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return createMockClient();
}

