-- Reserve a permanent numeric ID namespace for RoverPass rows so combined
-- all_glamping_properties + all_roverpass_data_new exports have unique IDs.

BEGIN;

LOCK TABLE public.all_roverpass_data_new IN ACCESS EXCLUSIVE MODE;

DO $$
DECLARE
  collision_count bigint;
BEGIN
  SELECT COUNT(*)
  INTO collision_count
  FROM public.all_roverpass_data_new low_ids
  JOIN public.all_roverpass_data_new high_ids
    ON high_ids.id = low_ids.id + 1000000000
  WHERE low_ids.id < 1000000000;

  IF collision_count > 0 THEN
    RAISE EXCEPTION
      'Cannot namespace all_roverpass_data_new IDs: % shifted IDs would collide',
      collision_count;
  END IF;
END $$;

UPDATE public.all_roverpass_data_new
SET id = id + 1000000000
WHERE id < 1000000000;

SELECT setval(
  pg_get_serial_sequence('public.all_roverpass_data_new', 'id'),
  GREATEST(
    (SELECT COALESCE(MAX(id), 1000000000) FROM public.all_roverpass_data_new),
    1000000000
  ),
  true
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.all_roverpass_data_new'::regclass
      AND conname = 'all_roverpass_data_new_id_namespace_chk'
  ) THEN
    ALTER TABLE public.all_roverpass_data_new
      ADD CONSTRAINT all_roverpass_data_new_id_namespace_chk
      CHECK (id >= 1000000000);
  END IF;
END $$;

COMMIT;

-- Verification:
-- SELECT COUNT(*) AS overlapping_ids
-- FROM public.all_roverpass_data_new r
-- JOIN public.all_glamping_properties g USING (id);
--
-- SELECT
--   MIN(id) AS min_roverpass_id,
--   MAX(id) AS max_roverpass_id,
--   pg_get_serial_sequence('public.all_roverpass_data_new', 'id') AS sequence_name
-- FROM public.all_roverpass_data_new;
