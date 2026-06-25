-- Allow explicit "both" division on managed_users (Outdoor + Commercial).

ALTER TABLE public.managed_users
  DROP CONSTRAINT IF EXISTS managed_users_division_check;

ALTER TABLE public.managed_users
  ADD CONSTRAINT managed_users_division_check
  CHECK (division IS NULL OR division IN ('outdoor', 'commercial', 'both'));

COMMENT ON COLUMN public.managed_users.division IS
  'Sage division: outdoor, commercial, or both. Used to infer default pipeline segment filter.';
