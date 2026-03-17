/**
 * Add multiple team members to auth.users and managed_users (identical to Kristin Garwood setup).
 * Uses add-managed-user-prematurely logic - pre-creates auth record so users can sign in via Google OAuth.
 *
 * Usage:
 *   npx tsx scripts/add-team-members-batch.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { randomBytes } from 'crypto';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  console.error('Error: Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TEAM_MEMBERS = [
  { email: 'marran@sageoutdooradvisory.com', displayName: 'Luke Marran' },
  { email: 'reid@sageoutdooradvisory.com', displayName: 'Elizabeth Reid' },
  { email: 'cipriano@sagecommercialadvisory.com', displayName: 'Nick Cipriano' },
  { email: 'garwood@sagecommercialadvisory.com', displayName: 'Greg Garwood' },
] as const;

const ROLE = 'admin'; // Same as Kristin Garwood / typical team member

async function addUser(email: string, displayName: string) {
  const { data: existingManaged } = await supabase
    .from('managed_users')
    .select('*')
    .eq('email', email)
    .single();

  if (existingManaged) {
    console.log(`⏭️  ${email} already in managed_users`);
    return;
  }

  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const existingAuth = authUsers?.users?.find((u) => u.email === email);

  if (existingAuth) {
    const { error } = await supabase.from('managed_users').insert({
      user_id: existingAuth.id,
      email,
      role: ROLE,
      display_name: displayName,
      is_active: true,
    });

    if (error) {
      console.error(`❌ ${email}: ${error.message}`);
      return;
    }
    console.log(`✅ ${email} (existing auth) → managed_users`);
    return;
  }

  const tempPassword = randomBytes(32).toString('hex');
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: displayName },
  });

  if (createError || !newUser?.user) {
    console.error(`❌ ${email}: ${createError?.message ?? 'createUser failed'}`);
    return;
  }

  const { error: insertError } = await supabase.from('managed_users').insert({
    user_id: newUser.user.id,
    email,
    role: ROLE,
    display_name: displayName,
    is_active: true,
  });

  if (insertError) {
    console.error(`❌ ${email}: ${insertError.message}`);
    return;
  }
  console.log(`✅ ${email} → auth.users + managed_users`);
}

async function main() {
  console.log('Adding team members (auth + managed_users)...\n');
  for (const { email, displayName } of TEAM_MEMBERS) {
    await addUser(email, displayName);
  }
  console.log('\nDone. Users can sign in via Google OAuth at /login.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
