import type { SupabaseClient } from '@supabase/supabase-js';
import type { ManagedUserWorkloadAuthorRow } from '@/lib/project-pipeline/workload-authors';

export async function loadActiveManagedUsersForPipeline(
  supabase: SupabaseClient
): Promise<ManagedUserWorkloadAuthorRow[]> {
  const { data, error } = await supabase
    .from('managed_users')
    .select('email, display_name, first_name, last_name, division, slack_username, pipeline_email_preferences')
    .eq('is_active', true)
    .order('email', { ascending: true });

  if (error) {
    console.warn('[pipeline-email] managed_users read failed', error.message);
    return [];
  }

  return data ?? [];
}
