-- Align sage_chain_label prefixes with glamping_brands.legacy_chain_key (Bliss, Westgate).
-- Shorter canonical keys win over long property-name variants.

CREATE OR REPLACE FUNCTION public.sage_chain_label_from_property_name(p_name text)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  n              text := btrim(COALESCE(p_name, ''));
  ln             text;
  p              text;
  prefixes       text[] := ARRAY[
    'outdoor collection by marriott bonvoy',
    'collective retreats',
    'postcard cabins',
    'rvc outdoor destinations',
    'sundance by basecamp',
    'trailer inn lodging',
    'worldhotels backdrop',
    'douglas lake ranch',
    'terramor outdoor resort',
    'bliss camps',
    'the glamping collective',
    'westgate river ranch',
    'glamping resorts ltd',
    'camp ferncrest',
    'timberline glamping at',
    'ulum',
    'under canvas',
    'wander camp',
    'timberline glamping co.',
    'timberline glamping',
    'getaway house',
    'brush creek ranch',
    'long live the simple life',
    'firelight camps',
    'nomadic resort',
    'autocamp',
    'huttopia',
    'getaway',
    'koa holiday',
    'trailer inn',
    'yogi bear''s jellystone park',
    'jellystone park',
    'koa'
  ];
BEGIN
  IF n = '' THEN RETURN ''; END IF;
  ln := lower(n);
  FOREACH p IN ARRAY prefixes LOOP
    IF ln = p OR ln LIKE p || ' %' OR ln LIKE p || '-%'
      OR ln LIKE p || ' -%' OR ln LIKE p || ' –%' OR ln LIKE p || ' —%'
    THEN RETURN p; END IF;
  END LOOP;
  IF strpos(n, ' — ') > 0 THEN
    RETURN lower(btrim(substring(n FROM 1 FOR strpos(n, ' — ') - 1)));
  END IF;
  IF strpos(n, ' – ') > 0 THEN
    RETURN lower(btrim(substring(n FROM 1 FOR strpos(n, ' – ') - 1)));
  END IF;
  IF strpos(n, ' - ') > 0 THEN
    RETURN lower(btrim(split_part(n, ' - ', 1)));
  END IF;
  RETURN lower(n);
END;
$$;
