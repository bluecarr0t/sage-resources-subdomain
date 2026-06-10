-- Allow Cancelled in pipeline status history (projects that fell through before opening).
-- Safe to re-run.

ALTER TABLE glamping_pipeline_status_history
  DROP CONSTRAINT IF EXISTS glamping_pipeline_status_history_is_open_check;

ALTER TABLE glamping_pipeline_status_history
  ADD CONSTRAINT glamping_pipeline_status_history_is_open_check CHECK (
    is_open IN (
      'Yes',
      'Under Construction',
      'Proposed Development',
      'Cancelled',
      'Temporarily closed',
      'Closed'
    )
  );

COMMENT ON COLUMN glamping_pipeline_status_history.is_open IS
  'Snapshot of all_glamping_properties.is_open for this stint. Cancelled = pipeline project abandoned before opening.';
