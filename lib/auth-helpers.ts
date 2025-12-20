/**
 * Authentication helper functions
 * Provides utilities for checking managed user access
 */

import { createServerClient } from './supabase';
import { supabase } from './supabase';

/**
 * Allowed email domains for authentication
 */
export const ALLOWED_EMAIL_DOMAINS = [
  'sageoutdooradvisory.com',
  'sagecommercial.com',
] as const;

/**
 * Check if an email address is from an allowed domain
 */
export function isAllowedEmailDomain(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }
  
  const domain = email.toLowerCase().split('@')[1];
  return ALLOWED_EMAIL_DOMAINS.includes(domain as typeof ALLOWED_EMAIL_DOMAINS[number]);
}

export interface ManagedUser {
  id: number;
  user_id: string;
  email: string;
  display_name: string | null;
  is_active: boolean;
  role: 'user' | 'admin' | 'editor';
  created_at: string;
  updated_at: string;
}

/**
 * Check if a user is in the managed_users table (server-side)
 * Use this in Server Components, API routes, and Server Actions
 */
export async function isManagedUser(userId: string): Promise<boolean> {
  try {
    const supabase = createServerClient();
    
    const { data, error } = await supabase
      .from('managed_users')
      .select('id, is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking managed user:', error);
    return false;
  }
}

/**
 * Get managed user details (server-side)
 */
export async function getManagedUser(userId: string): Promise<ManagedUser | null> {
  try {
    const supabase = createServerClient();
    
    const { data, error } = await supabase
      .from('managed_users')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return data as ManagedUser;
  } catch (error) {
    console.error('Error fetching managed user:', error);
    return null;
  }
}

/**
 * Check if a user is in the managed_users table (client-side)
 * Use this in Client Components
 */
export async function isManagedUserClient(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return false;
    }

    const { data, error } = await supabase
      .from('managed_users')
      .select('id, is_active')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking managed user (client):', error);
    return false;
  }
}

/**
 * Get managed user details (client-side)
 */
export async function getManagedUserClient(): Promise<ManagedUser | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return null;
    }

    const { data, error } = await supabase
      .from('managed_users')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (error || !data) {
      return null;
    }

    return data as ManagedUser;
  } catch (error) {
    console.error('Error fetching managed user (client):', error);
    return null;
  }
}

/**
 * Check if current user has admin role
 */
export async function isAdmin(userId?: string): Promise<boolean> {
  try {
    const supabaseClient = userId ? createServerClient() : supabase;
    
    if (userId) {
      const user = await getManagedUser(userId);
      return user?.role === 'admin' || false;
    } else {
      // Client-side check
      const user = await getManagedUserClient();
      return user?.role === 'admin' || false;
    }
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}
