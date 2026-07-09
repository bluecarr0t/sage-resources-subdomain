-- Cancellation reason tracking for pipeline projects (is_open = Cancelled).
-- Safe to re-run.

ALTER TABLE public.all_sage_data
  ADD COLUMN IF NOT EXISTS cancelled_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_reason_notes text;

COMMENT ON COLUMN public.all_sage_data.cancelled_reason IS
  'Canonical slug when is_open = Cancelled (regulatory_denial, developer_withdrawal, community_opposition, environmental_legal, financing_failure, site_disposition, corporate_restructure, other).';

COMMENT ON COLUMN public.all_sage_data.cancelled_reason_notes IS
  'Free-text context for cancelled pipeline projects (press quotes, litigation, market notes).';

CREATE INDEX IF NOT EXISTS idx_all_sage_data_cancelled_reason
  ON public.all_sage_data (cancelled_reason)
  WHERE is_open = 'Cancelled' AND cancelled_reason IS NOT NULL;

-- Known cancellations (Jul 2026 research backfill)
UPDATE public.all_sage_data
SET
  cancelled_reason = 'regulatory_denial',
  cancelled_reason_notes = COALESCE(
    cancelled_reason_notes,
    'Napa City Council officially denied The Grange / AutoCamp Napa after more than a decade of review—the project is permanently canceled and not open. Sustained resident opposition cited fire evacuation routes on the Silverado Trail, heavy tourist traffic, and flood-zone / watershed risks along Milliken Creek. Planned inventory: ~100 high-end glamping units (custom Airstreams, luxury tents, permanent clubhouse) on a 12.5-acre Silverado Trail parcel. AutoCamp abandoned the development; the undeveloped land was listed for sale. Operating alternative for bookable AutoCamp glamping in Northern California wine country: AutoCamp Sonoma (Guerneville, formerly Russian River).'
  ),
  date_updated = '2026-07-08'
WHERE property_name IN ('AutoCamp Napa', 'The Grange Campground')
  AND is_open = 'Cancelled';

UPDATE public.all_sage_data
SET
  cancelled_reason = 'developer_withdrawal',
  cancelled_reason_notes = COALESCE(
    cancelled_reason_notes,
    'Ofland Hotels (Yonder Hospitality rebrand, early 2024) formally canceled the Twentynine Palms resort after city entitlement approval—the project will not proceed. Plan evolved from Yonder''s 130-cabin layout to Ofland''s 100-cabin eco-resort on ~152 acres in Indian Cove near Joshua Tree National Park (lodges, pools, food service, employee housing, stargazing). Years of community backlash included Save Our Deserts and Indian Cove neighbor opposition before the Twentynine Palms City Council approved entitlements following intense public hearings. Despite approval, Ofland''s Head of Development issued a press release halting the project, citing softening market conditions and capital requirements that could no longer be justified. Distinct from operating Yonder Escalante (UT) and other Ofland portfolio properties.'
  ),
  date_updated = '2026-07-08'
WHERE property_name IN ('Yonder Twentynine Palms', 'Ofland Twentynine Palms')
  AND is_open = 'Cancelled';
