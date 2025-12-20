/**
 * Script to add a user to the managed_users allowlist
 * 
 * Usage:
 *   npx tsx scripts/add-managed-user.ts <email> [role] [display-name]
 * 
 * Examples:
 *   npx tsx scripts/add-managed-user.ts user@example.com
 *   npx tsx scripts/add-managed-user.ts admin@example.com admin "Admin User"
 *   npx tsx scripts/add-managed-user.ts editor@example.com editor
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

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

async function addManagedUser(
  email: string,
  role: string = 'user',
  displayName?: string
) {
  try {
    // First, check if user exists in auth.users
    // Note: We can't directly query auth.users, but we can try to find them
    // by checking if they've signed in before, or we'll create the reference
    // when they first sign in

    // Check if managed user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('managed_users')
      .select('*')
      .eq('email', email)
      .single();

    if (existingUser) {
      console.log(`❌ User ${email} already exists in managed_users table`);
      console.log(`   User ID: ${existingUser.user_id}`);
      console.log(`   Role: ${existingUser.role}`);
      console.log(`   Active: ${existingUser.is_active}`);
      process.exit(1);
    }

    // Try to find the user in auth.users by email
    // Note: This requires admin access - we'll use the admin API
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('Error fetching auth users:', authError);
      console.log('\n⚠️  Note: User may not exist in auth.users yet.');
      console.log('   They will be added to managed_users when they first sign in.');
      console.log('   Alternatively, you can add them after they authenticate.');
      process.exit(1);
    }

    const authUser = authUsers.users.find((u) => u.email === email);

    if (!authUser) {
      console.log(`⚠️  User ${email} not found in auth.users yet.`);
      console.log('   They must sign in first (via Google OAuth) to be added to auth.users.');
      console.log('   Once they sign in, you can run this script again to add them to managed_users.');
      console.log('\n   Alternatively, you can manually add them using this SQL:');
      console.log(`   INSERT INTO managed_users (user_id, email, role, display_name)`);
      console.log(`   VALUES ('<user-id-from-auth-users>', '${email}', '${role}', ${displayName ? `'${displayName}'` : 'NULL'});`);
      process.exit(1);
    }

    // Add user to managed_users
    const { data, error } = await supabase
      .from('managed_users')
      .insert({
        user_id: authUser.id,
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

    console.log('✅ Successfully added user to managed_users:');
    console.log(`   Email: ${data.email}`);
    console.log(`   User ID: ${data.user_id}`);
    console.log(`   Role: ${data.role}`);
    console.log(`   Display Name: ${data.display_name || 'Not set'}`);
    console.log(`   Active: ${data.is_active}`);
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: npx tsx scripts/add-managed-user.ts <email> [role] [display-name]');
  console.error('\nExamples:');
  console.error('  npx tsx scripts/add-managed-user.ts user@example.com');
  console.error('  npx tsx scripts/add-managed-user.ts admin@example.com admin');
  console.error('  npx tsx scripts/add-managed-user.ts editor@example.com editor "Editor Name"');
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

addManagedUser(email, role, displayName);
