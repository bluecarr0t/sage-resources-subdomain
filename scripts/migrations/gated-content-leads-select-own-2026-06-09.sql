-- Allow authenticated users to read their own gated-content lead rows.
-- Required for upsert-on-conflict (UPDATE needs SELECT under RLS) and for any
-- client-side reads. Server layout checks use the service role separately.

DROP POLICY IF EXISTS gated_leads_select_own ON public.gated_content_leads;
CREATE POLICY gated_leads_select_own ON public.gated_content_leads
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
