/**
 * Property / study context for Site Builder image prompts.
 * Authors pick a simple scene framing in the UI; it maps to an opening "Scene:" phrase only
 * (subject, amenities, catalog, batch rules stay on the configuration row).
 */

/** UI select: Auto follows row mix; explicit options override for marina/landscape-hotel–style studies, etc. */
export const SCENE_FRAMING_IDS = [
  'auto',
  'glamping',
  'rv',
  'generic_outdoor_hospitality',
  'marina',
  'campground',
] as const;
export type SceneFramingChoice = (typeof SCENE_FRAMING_IDS)[number];

/** Resolved archetype id sent to the API and used in SCENE_PHRASE. */
export type PropertySceneArchetypeId =
  | 'glamping_resort'
  | 'rv_resort'
  | 'mixed_outdoor_hospitality'
  | 'traditional_campground'
  | 'marina'
  | 'landscape_hotel';

const SCENE_PHRASE: Record<PropertySceneArchetypeId, string> = {
  glamping_resort:
    'glamping resort with distinctive lodging units in a soft natural outdoor hospitality setting',
  rv_resort:
    'RV resort with serviced RV sites, realistic pads and utilities, and natural outdoor surroundings',
  mixed_outdoor_hospitality:
    'outdoor hospitality property combining lodging and RV-oriented facilities in a cohesive natural setting',
  traditional_campground:
    'traditional campground with tent camping areas, vehicle access, and a natural outdoor recreation setting',
  marina:
    'marina and waterfront hospitality setting with docks, slips, shoreline, and shore-side facilities appropriate to the primary subject',
  landscape_hotel:
    'landscape-integrated outdoor hospitality with low-rise lodges or suites set within natural terrain and vegetation',
};

export function scenePhraseForPropertyArchetype(id: PropertySceneArchetypeId): string {
  return SCENE_PHRASE[id];
}

export function defaultPropertySceneArchetypeFromConfigTypes(
  configs: Array<{ type: 'glamping' | 'rv' }>
): PropertySceneArchetypeId {
  const g = configs.filter((c) => c.type === 'glamping').length;
  const r = configs.filter((c) => c.type === 'rv').length;
  if (g > 0 && r === 0) return 'glamping_resort';
  if (r > 0 && g === 0) return 'rv_resort';
  return 'mixed_outdoor_hospitality';
}

export function resolveSceneFramingToArchetype(
  choice: SceneFramingChoice,
  configs: Array<{ type: 'glamping' | 'rv' }>
): PropertySceneArchetypeId {
  if (choice === 'glamping') return 'glamping_resort';
  if (choice === 'rv') return 'rv_resort';
  if (choice === 'generic_outdoor_hospitality') return 'mixed_outdoor_hospitality';
  if (choice === 'marina') return 'marina';
  if (choice === 'campground') return 'traditional_campground';
  return defaultPropertySceneArchetypeFromConfigTypes(configs);
}

/** When the API omits archetype, fall back from the row’s config type (backward compatibility). */
export function defaultPropertySceneArchetypeForConfigType(configType: 'glamping' | 'rv'): PropertySceneArchetypeId {
  return configType === 'glamping' ? 'glamping_resort' : 'rv_resort';
}

export function parsePropertySceneArchetypeFromBody(v: unknown): PropertySceneArchetypeId | undefined {
  if (typeof v !== 'string') return undefined;
  const id = v as PropertySceneArchetypeId;
  return id in SCENE_PHRASE ? id : undefined;
}
