import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { isAllowedEmailDomain } from '@/lib/auth-helpers';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { requireManagedUsersAdmin } from '@/lib/require-managed-users-admin';
import type { ManagedUser } from '@/lib/auth-helpers';
import { buildManagedUserDisplayName } from '@/lib/managed-users/display-name';
import {
  CreateManagedUserError,
  createManagedUser,
} from '@/lib/managed-users/create-managed-user';
import {
  normalizeManagedUserRole,
  resolveManagedUserRole,
} from '@/lib/managed-user-roles';

export const dynamic = 'force-dynamic';

const MANAGED_USER_SELECT =
  'id, user_id, email, display_name, first_name, last_name, is_active, role, pipeline_view_all, division, is_project_manager, created_at, updated_at';

type ManagedUserUpdateBody = {
  id: number;
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  role?: ManagedUser['role'];
  is_active?: boolean;
  pipeline_view_all?: boolean;
  division?: ManagedUser['division'];
  is_project_manager?: boolean;
};

type ManagedUserCreateBody = {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: ManagedUser['role'];
  is_active?: boolean;
  pipeline_view_all?: boolean;
  division?: ManagedUser['division'];
  is_project_manager?: boolean;
};

function serializeManagedUser(user: ManagedUser): ManagedUser {
  return {
    ...user,
    role: normalizeManagedUserRole(user.role),
    is_project_manager: Boolean(user.is_project_manager),
  };
}

export const GET = withAdminAuth(async (_request: NextRequest, auth) => {
  const forbidden = requireManagedUsersAdmin(auth);
  if (forbidden) return forbidden;

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('managed_users')
    .select(MANAGED_USER_SELECT)
    .order('email', { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: error.code === '42703' ? 503 : 500 }
    );
  }

  return NextResponse.json({
    users: (data ?? []).map((user) => serializeManagedUser(user as ManagedUser)),
  });
});

export const POST = withAdminAuth(async (request: NextRequest, auth) => {
  const forbidden = requireManagedUsersAdmin(auth);
  if (forbidden) return forbidden;

  let body: ManagedUserCreateBody;
  try {
    body = (await request.json()) as ManagedUserCreateBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }
  if (!isAllowedEmailDomain(email)) {
    return NextResponse.json(
      { error: 'Email must be @sageoutdooradvisory.com or @sagecommercialadvisory.com' },
      { status: 400 }
    );
  }

  try {
    const supabase = createServerClient();
    const role = resolveManagedUserRole(body.role);
    const user = await createManagedUser(supabase, {
      email,
      firstName: body.firstName?.trim() ?? '',
      lastName: body.lastName?.trim() ?? '',
      role,
      division: body.division,
      pipeline_view_all: role === 'admin',
      is_active: body.is_active,
      is_project_manager: body.is_project_manager,
      createdBy: auth.session.user.id,
    });

    return NextResponse.json({ user: serializeManagedUser(user) }, { status: 201 });
  } catch (error) {
    if (error instanceof CreateManagedUserError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[managed-users] create failed', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
});

export const PATCH = withAdminAuth(async (request: NextRequest, auth) => {
  const forbidden = requireManagedUsersAdmin(auth);
  if (forbidden) return forbidden;

  let body: ManagedUserUpdateBody;
  try {
    body = (await request.json()) as ManagedUserUpdateBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body?.id || typeof body.id !== 'number') {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data: existing, error: fetchError } = await supabase
    .from('managed_users')
    .select('id, email, first_name, last_name')
    .eq('id', body.id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  if ('display_name' in body) updates.display_name = body.display_name;
  if ('first_name' in body) updates.first_name = body.first_name;
  if ('last_name' in body) updates.last_name = body.last_name;

  if ('first_name' in body || 'last_name' in body) {
    const firstName = 'first_name' in body ? body.first_name : existing.first_name;
    const lastName = 'last_name' in body ? body.last_name : existing.last_name;
    updates.display_name = buildManagedUserDisplayName(firstName, lastName);
  }

  if (body.role !== undefined) {
    const role = resolveManagedUserRole(body.role);
    updates.role = role;
    updates.pipeline_view_all = role === 'admin';
  }
  if (body.is_active !== undefined) updates.is_active = body.is_active;
  if ('division' in body) updates.division = body.division;
  if (body.is_project_manager !== undefined) updates.is_project_manager = body.is_project_manager;

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('managed_users')
    .update(updates)
    .eq('id', body.id)
    .select(MANAGED_USER_SELECT)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    user: data ? serializeManagedUser(data as ManagedUser) : data,
  });
});
