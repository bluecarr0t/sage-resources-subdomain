/**
 * Add Commercial division managed users (auth + managed_users).
 *
 * Cross-domain staff (same person, outdoor + commercial email) get a second row here;
 * pipeline UI/notifications already merge by matching first + last name.
 *
 * Usage:
 *   npx tsx scripts/add-commercial-team-members-2026-06-26.ts
 *   npx tsx scripts/add-commercial-team-members-2026-06-26.ts --dry-run
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { createManagedUser, CreateManagedUserError } from '@/lib/managed-users/create-managed-user';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
const dryRun = process.argv.includes('--dry-run');

if (!supabaseUrl || !supabaseSecretKey) {
  console.error('Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type CommercialTeamMember = {
  firstName: string;
  lastName: string;
  email: string;
  role?: 'author' | 'admin';
};

/** Use first_name that matches any existing outdoor row for cross-domain merge. */
const COMMERCIAL_TEAM_MEMBERS: CommercialTeamMember[] = [
  { firstName: 'Aidan', lastName: 'Witte', email: 'witte@sagecommercialadvisory.com' },
  { firstName: 'Benjamin', lastName: 'Slagter', email: 'slagter@sagecommercialadvisory.com' },
  { firstName: 'Francisco', lastName: 'Gonzalez', email: 'fegonzalez@sagecommercialadvisory.com' },
  { firstName: 'Frantz', lastName: 'Degand', email: 'degand@sagecommercialadvisory.com' },
  { firstName: 'Mary Claire', lastName: 'Sparrow', email: 'sparrow@sagecommercialadvisory.com' },
  { firstName: 'Mayra', lastName: 'Ambriz', email: 'ambriz@sagecommercialadvisory.com' },
  { firstName: 'Nick', lastName: 'Cipriano', email: 'cipriano@sagecommercialadvisory.com' },
  { firstName: 'Nick', lastName: 'Harsell', email: 'harsell@sagecommercialadvisory.com', role: 'admin' },
  { firstName: 'Shari', lastName: 'Heilala', email: 'heilala@sagecommercialadvisory.com', role: 'admin' },
  { firstName: 'Ulyana', lastName: 'Trichkovska', email: 'ulyana@sagecommercialadvisory.com' },
];

function outdoorCounterpartEmail(commercialEmail: string): string {
  const local = commercialEmail.split('@')[0] ?? '';
  return `${local}@sageoutdooradvisory.com`;
}

async function resolveRole(member: CommercialTeamMember): Promise<'author' | 'admin'> {
  if (member.role) return member.role;

  const outdoorEmail = outdoorCounterpartEmail(member.email);
  const { data } = await supabase
    .from('managed_users')
    .select('role')
    .eq('email', outdoorEmail)
    .maybeSingle();

  if (data?.role === 'admin') return 'admin';
  return 'author';
}

async function main() {
  console.log(dryRun ? 'Dry run — no writes.\n' : 'Adding Commercial division users...\n');

  for (const member of COMMERCIAL_TEAM_MEMBERS) {
    const email = member.email.trim().toLowerCase();
    const outdoorEmail = outdoorCounterpartEmail(email);

    const { data: existingCommercial } = await supabase
      .from('managed_users')
      .select('id, email, division')
      .eq('email', email)
      .maybeSingle();

    if (existingCommercial) {
      console.log(`⏭️  ${email} already exists (division: ${existingCommercial.division ?? 'unset'})`);
      continue;
    }

    const { data: outdoorRow } = await supabase
      .from('managed_users')
      .select('email, division, role')
      .eq('email', outdoorEmail)
      .maybeSingle();

    const role = await resolveRole(member);

    if (outdoorRow) {
      console.log(
        `🔗 ${email}: outdoor counterpart ${outdoorEmail} exists — adding commercial row (role: ${role})`
      );
    } else {
      console.log(`➕ ${email}: new commercial-only user (role: ${role})`);
    }

    if (dryRun) continue;

    try {
      await createManagedUser(supabase, {
        email,
        firstName: member.firstName,
        lastName: member.lastName,
        role,
        division: 'commercial',
        is_active: true,
      });
      console.log(`✅ ${email}`);
    } catch (error) {
      if (error instanceof CreateManagedUserError) {
        console.error(`❌ ${email}: ${error.message}`);
      } else {
        console.error(`❌ ${email}:`, error);
      }
    }
  }

  console.log('\nDone.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
