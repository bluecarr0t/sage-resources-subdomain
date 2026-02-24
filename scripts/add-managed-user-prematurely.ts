/**
 * Pre-create users so they can sign in via Google OAuth and go straight to /admin/dashboard.
 * Uses Supabase auth.admin.createUser() to create the auth record, then adds to managed_users.
 * When they sign in with Google (same email), Supabase auto-links the OAuth identity.
 *
 * Usage:
 *   npx tsx scripts/add-managed-user-prematurely.ts <email> [role] [display-name]
 *
 * Examples:
 *   npx tsx scripts/add-managed-user-prematurely.ts heilala@sageoutdooradvisory.com admin "Heilala"
 *   npx tsx scripts/add-managed-user-prematurely.ts gardwood@sageoutdooradvisory.com admin "Gardwood"
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { randomBytes } from 'crypto';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  console.error('Error: Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY');
  console.error('Please check your .env.local file');
  process.exit(1);
}

// Create admin client (uses secret key - bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function addManagedUserPrematurely(
  email: string,
  role: string = 'user',
  displayName?: string
) {
  try {
    // Check if managed user already exists (by email)
    const { data: existingManaged, error: checkError } = await supabase
      .from('managed_users')
      .select('*')
      .eq('email', email)
      .single();

    if (existingManaged) {
      console.log(`❌ User ${email} already exists in managed_users table`);
      console.log(`   User ID: ${existingManaged.user_id}`);
      console.log(`   They can already sign in.`);
      process.exit(1);
    }

    // Check if user already exists in auth.users (e.g. they signed in before)
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
    if (!listError) {
      const existingAuth = authUsers.users.find((u) => u.email === email);
      if (existingAuth) {
        // User exists in auth - just add to managed_users
        const { data, error } = await supabase
          .from('managed_users')
          .insert({
            user_id: existingAuth.id,
            email: email,
            role: role,
            display_name: displayName || null,
            is_active: true,
          })
          .select()
          .single();

        if (error) {
          console.error('Error adding user to managed_users:', error);
          process.exit(1);
        }

        console.log('✅ User already existed in auth.users. Added to managed_users:');
        console.log(`   Email: ${data.email}`);
        console.log(`   Role: ${data.role}`);
        console.log(`   They can sign in now.`);
        return;
      }
    }

    // Pre-create user in auth.users (Supabase will auto-link when they sign in with Google)
    const tempPassword = randomBytes(32).toString('hex'); // They'll use Google, never need this
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: displayName ? { full_name: displayName } : undefined,
    });

    if (createError) {
      console.error('Error creating auth user:', createError);
      process.exit(1);
    }

    if (!newUser.user) {
      console.error('Error: createUser returned no user');
      process.exit(1);
    }

    // Add to managed_users
    const { data: managedData, error: insertError } = await supabase
      .from('managed_users')
      .insert({
        user_id: newUser.user.id,
        email: email,
        role: role,
        display_name: displayName || null,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error adding user to managed_users:', insertError);
      process.exit(1);
    }

    console.log('✅ Successfully pre-created user. When they sign in with Google OAuth, they\'ll go straight to /admin/dashboard:');
    console.log(`   Email: ${managedData.email}`);
    console.log(`   User ID: ${managedData.user_id}`);
    console.log(`   Role: ${managedData.role}`);
    console.log(`   Display Name: ${managedData.display_name || 'Not set'}`);
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: npx tsx scripts/add-managed-user-prematurely.ts <email> [role] [display-name]');
  console.error('\nPre-creates users so they can sign in via Google OAuth and go straight to the app.');
  console.error('\nExamples:');
  console.error('  npx tsx scripts/add-managed-user-prematurely.ts heilala@sageoutdooradvisory.com admin "Heilala"');
  console.error('  npx tsx scripts/add-managed-user-prematurely.ts gardwood@sageoutdooradvisory.com admin "Gardwood"');
  process.exit(1);
}

const email = args[0];
const role = args[1] || 'user';
const displayName = args[2];

// Validate role
if (!['user', 'admin', 'editor'].includes(role)) {
  console.error(`Error: Invalid role "${role}". Must be one of: user, admin, editor`);
  process.exit(1);
}

// Validate email format (basic check)
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error(`Error: Invalid email format: ${email}`);
  process.exit(1);
}

addManagedUserPrematurely(email, role, displayName);
