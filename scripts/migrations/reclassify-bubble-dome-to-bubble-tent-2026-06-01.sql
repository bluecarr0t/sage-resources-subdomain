-- ============================================================================
-- Bubble Dome → Bubble Tent (Bespoke Outdoor Bubbles and any legacy rows)
--
-- Web research (bespokeoutdoorbubbles.com, Jun 2026): inventory is air-supported
-- transparent “bubble” glamping — not rigid geodesic domes. Sage canonical: Bubble Tent.
-- ============================================================================

BEGIN;

UPDATE public.all_glamping_properties
SET
  unit_type = 'Bubble Tent',
  date_updated = to_char(current_date, 'YYYY-MM-DD'),
  notes = COALESCE(notes, '') || E'\n\nUnit type (Jun 2026): Bubble Dome → Bubble Tent (operator bubble-dome marketing; air-supported transparent bubble inventory per bespokeoutdoorbubbles.com).'
WHERE lower(trim(unit_type)) = 'bubble dome';

COMMIT;
