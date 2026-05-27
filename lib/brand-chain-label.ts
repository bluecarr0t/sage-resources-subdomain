/**
 * Client-side mirror of `public.sage_chain_label_from_property_name` prefix list.
 * Keep in sync with `scripts/migrations/*brand*chain*.sql` when adding operators.
 */

export const SAGE_CHAIN_LABEL_PREFIXES = [
  'outdoor collection by marriott bonvoy',
  'collective retreats',
  'nightfall camp',
  'paperbark camp',
  'tanja lagoon camp',
  'eco retreat',
  'tathaastu',
  'the bubble retreat',
  'postcard cabins',
  'rvc outdoor destinations',
  'sundance by basecamp',
  'charmed resorts',
  'wildhaven',
  'treebox',
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
  "yogi bear's jellystone park",
  'jellystone park',
  'koa',
] as const;

/** When chain key ≠ legacy_chain_key on `glamping_brands`. */
export const CHAIN_KEY_TO_BRAND_SLUG: ReadonlyArray<{ pattern: string; slug: string }> = [
  { pattern: 'timberline glamping', slug: 'timberline-glamping-co' },
  { pattern: 'postcard cabins', slug: 'postcard-cabins' },
  { pattern: 'outdoor collection', slug: 'marriott-outdoor-collection' },
  { pattern: 'worldhotels backdrop', slug: 'worldhotels-backdrop' },
  { pattern: 'autocamp', slug: 'autocamp' },
  { pattern: 'charmed resorts', slug: 'charmed-resorts' },
  { pattern: 'wildhaven', slug: 'wildhaven-glamping' },
  { pattern: 'treebox', slug: 'treebox' },
  { pattern: 'bliss camps', slug: 'bliss-camps' },
  { pattern: 'westgate river ranch', slug: 'westgate-river-ranch' },
];

export function chainLabelFromPropertyName(name: string | null | undefined): string {
  const n = (name ?? '').trim();
  if (!n) return '';
  const ln = n.toLowerCase();

  for (const p of SAGE_CHAIN_LABEL_PREFIXES) {
    if (
      ln === p ||
      ln.startsWith(`${p} `) ||
      ln.startsWith(`${p}-`) ||
      ln.startsWith(`${p} -`) ||
      ln.startsWith(`${p} –`) ||
      ln.startsWith(`${p} —`)
    ) {
      return p;
    }
  }

  if (
    ln.startsWith('collective ') &&
    !ln.includes('elemental collective') &&
    !ln.includes('glamping collective')
  ) {
    return 'collective retreats';
  }

  const dashPatterns = [' — ', ' – ', ' - '] as const;
  for (const sep of dashPatterns) {
    const idx = n.indexOf(sep);
    if (idx > 0) return n.slice(0, idx).trim().toLowerCase();
  }

  return ln;
}
