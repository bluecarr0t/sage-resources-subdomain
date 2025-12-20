/**
 * API Route: Verify if authenticated user is in managed_users table
 * Called after OAuth redirect to check access
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { isManagedUser, isAllowedEmailDomain } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Get the current session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return NextResponse.json(
        { error: 'Not authenticated', hasAccess: false },
        { status: 401 }
      );
    }

    // Step 1: Validate email domain (CRITICAL SECURITY CHECK)
    const userEmail = session.user.email;
    if (!isAllowedEmailDomain(userEmail)) {
      // User's email is not from an allowed domain - sign them out immediately
      await supabase.auth.signOut();
      
      return NextResponse.json(
        {
          hasAccess: false,
          error: 'Access denied. Only users with @sageoutdooradvisory.com or @sagecommercial.com email addresses are authorized to access this application.',
        },
        { status: 403 }
      );
    }

    // Step 2: Check if user is in managed_users table (SECOND SECURITY CHECK)
    const hasAccess = await isManagedUser(session.user.id);

    if (!hasAccess) {
      // User is not in managed_users - sign them out
      await supabase.auth.signOut();
      
      return NextResponse.json(
        {
          hasAccess: false,
          error: 'Access denied. Your account is not authorized to access this application. Please contact an administrator to be added to the system.',
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      hasAccess: true,
      user: {
        id: session.user.id,
        email: session.user.email,
      },
    });
  } catch (error) {
    console.error('Error verifying managed user:', error);
    return NextResponse.json(
      { error: 'Internal server error', hasAccess: false },
      { status: 500 }
    );
  }
}
