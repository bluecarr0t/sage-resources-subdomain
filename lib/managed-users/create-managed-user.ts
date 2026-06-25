import { randomBytes } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ManagedUser } from '@/lib/auth-helpers';
import { buildManagedUserDisplayName } from '@/lib/managed-users/display-name';
import {
  DEFAULT_MANAGED_USER_ROLE,
  resolveManagedUserRole,
  type ManagedUserRole,
} from '@/lib/managed-user-roles';

export type CreateManagedUserInput = {
  email: string;
  firstName: string;
  lastName: string;
  slackUsername?: string | null;
  role?: ManagedUserRole | string | null;
  division?: ManagedUser['division'];
  pipeline_view_all?: boolean;
  is_active?: boolean;
  is_project_manager?: boolean;
  createdBy?: string | null;
};

export class CreateManagedUserError extends Error {
  constructor(
    message: string,
    readonly status: number = 400
  ) {
    super(message);
    this.name = 'CreateManagedUserError';
  }
}

const MANAGED_USER_SELECT =
  'id, user_id, email, display_name, first_name, last_name, slack_username, is_active, role, pipeline_view_all, division, is_project_manager, created_at, updated_at';

export async function createManagedUser(
  supabase: SupabaseClient,
  input: CreateManagedUserInput
): Promise<ManagedUser> {
  const email = input.email.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new CreateManagedUserError('A valid email is required');
  }

  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!firstName && !lastName) {
    throw new CreateManagedUserError('First name or last name is required');
  }

  const displayName = buildManagedUserDisplayName(firstName, lastName);
  const slackUsername = input.slackUsername?.trim() || null;
  const role = resolveManagedUserRole(input.role ?? DEFAULT_MANAGED_USER_ROLE);

  const { data: existingManaged } = await supabase
    .from('managed_users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existingManaged) {
    throw new CreateManagedUserError('A user with this email already exists', 409);
  }

  const { data: authList, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    throw new CreateManagedUserError(listError.message, 500);
  }

  let userId = authList.users.find((user) => user.email?.toLowerCase() === email)?.id;

  if (!userId) {
    const tempPassword = randomBytes(32).toString('hex');
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: displayName ? { full_name: displayName } : undefined,
    });

    if (createError) {
      throw new CreateManagedUserError(createError.message, 500);
    }
    if (!created.user) {
      throw new CreateManagedUserError('Failed to create auth user', 500);
    }
    userId = created.user.id;
  }

  const { data, error: insertError } = await supabase
    .from('managed_users')
    .insert({
      user_id: userId,
      email,
      display_name: displayName,
      first_name: firstName || null,
      last_name: lastName || null,
      slack_username: slackUsername,
      role,
      division: input.division ?? null,
      pipeline_view_all: input.pipeline_view_all ?? false,
      is_project_manager: input.is_project_manager ?? false,
      is_active: input.is_active ?? true,
      created_by: input.createdBy ?? null,
    })
    .select(MANAGED_USER_SELECT)
    .single();

  if (insertError) {
    throw new CreateManagedUserError(insertError.message, 500);
  }

  return data as ManagedUser;
}
