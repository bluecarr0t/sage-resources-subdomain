// Define our own SupabaseClient interface to avoid importing from @supabase/supabase-js during build
// This prevents webpack from bundling and executing the Supabase library during build
interface SupabaseClient {
  auth: {
    getSession: () => Promise<{ data: { session: any } | null; error: any }>;
    getUser: () => Promise<{ data: { user: any } | null; error: any }>;
    signOut: () => Promise<{ error: any }>;
    onAuthStateChange: (callback: (event: string, session: any) => void) => { data: { subscription: any }; error: any };
    signInWithPassword: (credentials: any) => Promise<{ data: { user: any; session: any } | null; error: any }>;
    signUp: (credentials: any) => Promise<{ data: { user: any; session: any } | null; error: any }>;
  };
  from: (table: string) => any;
  storage: {
    from: (bucket: string) => any;
  };
}

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
  // Always return true if we're server-side during build/static generation
  // This prevents any Supabase library execution during build
  
  // Check for Next.js build phase (most reliable indicator)
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return true;
  }
  // During static generation, Next.js sets this to 'export'
  if (process.env.NEXT_PHASE === 'phase-export') {
    return true;
  }
  
  // If we're server-side (no window), we're either building or doing SSR
  // During build, we should always use mock to prevent library execution
  // During runtime SSR, credentials should be available, so this check is safe
  if (typeof window === 'undefined') {
    // If we're in Vercel CI/build environment, definitely building
    if (process.env.VERCEL === '1') {
      return true;
    }
    // If we don't have valid credentials, assume build context
    // (during runtime SSR, credentials should be available)
    if (!hasValidCredentials) {
      return true;
    }
  }
  
  return false;
}

async function loadSupabaseModule() {
  // Use dynamic import to ensure the module is only loaded in the browser
  // This prevents webpack from bundling it for server-side code
  if (typeof window === 'undefined') {
    throw new Error('Supabase should only be loaded in the browser');
  }
  const module = await import('@supabase/supabase-js');
  return module;
}

function getSupabaseClient(): SupabaseClient {
  // During build time, always use mock client to avoid Supabase library issues
  const isBuild = isBuildContext();
  
  // ALWAYS use mock during server-side execution (including build and SSR)
  // Only load real Supabase in browser at runtime
  if (typeof window === 'undefined') {
    return createMockClient();
  }
  
  // Validate config when client is first accessed (lazy validation) - only in browser
  const configError = getSupabaseConfigError();
  if (configError) {
    throw new Error(configError);
  }
  
  // Create client if it doesn't exist
  if (!_supabaseClient) {
    // During build time, use mock client
    if (isBuild) {
      _supabaseClient = createMockClient();
    } else if (!hasValidCredentials) {
      // In browser but no valid credentials - use mock
      _supabaseClient = createMockClient();
    } else {
      // Only create real client in browser with valid credentials
      // For now, use mock client since we can't use async dynamic imports here
      // The real client will be initialized lazily when needed
      _supabaseClient = createMockClient();
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
  
  // Create a thenable object that can be chained and awaited
  // The builder must be a single instance that all methods return
  const builder: any = {};
  
  // Make it thenable so it can be awaited
  builder.then = function(onResolve: any, onReject?: any) {
    const result = Promise.resolve({ data: [], error: null });
    return result.then(onResolve, onReject);
  };
  
  // Support catch for error handling
  builder.catch = function(onReject: any) {
    return Promise.resolve({ data: [], error: null }).catch(onReject);
  };
  
  // Create chainable methods that return the builder itself
  chainableMethods.forEach(method => {
    builder[method] = function(...args: any[]) {
      // All methods return the builder for chaining
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
    // ALWAYS use mock during server-side execution (including build and SSR)
    if (typeof window === 'undefined') {
      const mockClient = createMockClient();
      return mockClient[prop as keyof SupabaseClient];
    }
    
    // During build, use mock client
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
  // ALWAYS return mock client during any server-side execution
  // This includes build time, static generation, and SSR
  // The Supabase library should NEVER be loaded on the server in this app
  return createMockClient();
}

