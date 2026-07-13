/**
 * Migration mirror: bump `all_sage_data.updated_at` on every UPDATE so
 * `/glamping-market-overview` Last Updated tracks any table change.
 * Applied remotely as `all_sage_data_touch_updated_at_on_change` (2026-07-13).
 */

CREATE OR REPLACE FUNCTION public.all_sage_data_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_all_sage_data_set_updated_at ON public.all_sage_data;

CREATE TRIGGER trg_all_sage_data_set_updated_at
BEFORE UPDATE ON public.all_sage_data
FOR EACH ROW
EXECUTE FUNCTION public.all_sage_data_set_updated_at();
