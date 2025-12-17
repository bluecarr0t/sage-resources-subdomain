// Server-side stub for @supabase/supabase-js
// This file completely replaces the Supabase library during server-side builds
// to prevent it from being bundled or executed during static generation

// Export a createClient function that returns nothing
// This will never be called because lib/supabase.ts checks for typeof window === 'undefined'
// and returns a mock client, but we need this stub to prevent webpack from bundling the real library
module.exports = {
  createClient: () => {
    throw new Error('Supabase should not be used during server-side rendering or static generation. Use the mock client from lib/supabase.ts instead.');
  }
};
