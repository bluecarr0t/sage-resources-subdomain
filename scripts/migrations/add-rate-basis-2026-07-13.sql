-- Rate basis: how published ARDR should be interpreted in comparable market aggregates.

ALTER TABLE public.all_sage_data
  ADD COLUMN IF NOT EXISTS rate_basis text
    DEFAULT 'unknown'
    CHECK (
      rate_basis IS NULL
      OR rate_basis IN (
        'room_only',
        'breakfast',
        'half_board',
        'full_board',
        'all_inclusive',
        'unknown'
      )
    ),
  ADD COLUMN IF NOT EXISTS rate_basis_notes text;

COMMENT ON COLUMN public.all_sage_data.rate_basis IS
  'How rate_avg_retail_daily_rate is packaged: room_only | breakfast | half_board | full_board | all_inclusive | unknown. Keep the quoted rate; exclude all_inclusive from default market ARDR.';
COMMENT ON COLUMN public.all_sage_data.rate_basis_notes IS
  'Short audit note for rate_basis (e.g. meals + activities + transfers).';

CREATE INDEX IF NOT EXISTS idx_all_sage_data_rate_basis
  ON public.all_sage_data (rate_basis)
  WHERE rate_basis IS NOT NULL AND rate_basis <> 'unknown';
