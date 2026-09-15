-- Glamping Show booth quiz completions.
-- Inserted server-side via POST /api/glamping-show-quiz/submit (service role).
-- GHL contact upsert is awaited on the same request; status is stored here
-- so a CRM outage does not drop the lead.

CREATE TABLE IF NOT EXISTS public.glamping_show_quiz_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  company text NOT NULL,
  region text NOT NULL,
  phone text,
  role text NOT NULL,
  stage text NOT NULL,
  need text NOT NULL,
  timeline text NOT NULL,
  outcome text NOT NULL,
  newsletter_opt_in boolean NOT NULL DEFAULT false,
  ghl_sync_status text NOT NULL DEFAULT 'pending',
  ghl_contact_id text,
  ghl_sync_error text,
  ghl_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT glamping_show_quiz_responses_role_chk
    CHECK (role IN (
      'landowner',
      'developer_operator',
      'existing_operator',
      'investor_lender',
      'vendor_media'
    )),
  CONSTRAINT glamping_show_quiz_responses_stage_chk
    CHECK (stage IN ('idea', 'has_land', 'has_plans', 'operating')),
  CONSTRAINT glamping_show_quiz_responses_need_chk
    CHECK (need IN ('feasibility', 'appraisal', 'market_data', 'exploring')),
  CONSTRAINT glamping_show_quiz_responses_timeline_chk
    CHECK (timeline IN ('30_days', '1_to_3_months', '3_to_12_months', 'no_timeline')),
  CONSTRAINT glamping_show_quiz_responses_outcome_chk
    CHECK (outcome IN ('ready_now', 'getting_close', 'just_exploring')),
  CONSTRAINT glamping_show_quiz_responses_ghl_status_chk
    CHECK (ghl_sync_status IN ('pending', 'created', 'updated', 'skipped', 'failed'))
);

CREATE INDEX IF NOT EXISTS glamping_show_quiz_responses_email_idx
  ON public.glamping_show_quiz_responses (email);

CREATE INDEX IF NOT EXISTS glamping_show_quiz_responses_created_at_idx
  ON public.glamping_show_quiz_responses (created_at DESC);

CREATE INDEX IF NOT EXISTS glamping_show_quiz_responses_ghl_status_idx
  ON public.glamping_show_quiz_responses (ghl_sync_status);

ALTER TABLE public.glamping_show_quiz_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS glamping_show_quiz_responses_select_managed
  ON public.glamping_show_quiz_responses;
CREATE POLICY glamping_show_quiz_responses_select_managed
  ON public.glamping_show_quiz_responses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

REVOKE ALL ON public.glamping_show_quiz_responses FROM anon;
REVOKE ALL ON public.glamping_show_quiz_responses FROM authenticated;
GRANT SELECT ON public.glamping_show_quiz_responses TO authenticated;
GRANT ALL ON public.glamping_show_quiz_responses TO service_role;
