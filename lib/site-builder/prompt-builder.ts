/**
 * Build AI image prompts for Site Builder configurations.
 * One prompt per config: glamping or RV, with amenities and location.
 *
 * Clause order (both types): scene + global style block → subject → subject constraints → quality →
 * amenities → infrastructure → batch rules → style → brand preset (optional) → global details
 * (product ref, setting, extra details).
 */

import type { PropertySceneArchetypeId } from './property-scene-archetype';
import {
  defaultPropertySceneArchetypeForConfigType,
  scenePhraseForPropertyArchetype,
} from './property-scene-archetype';

export interface GlampingConfigForPrompt {
  type: 'glamping';
  unitTypeName: string;
  sqft?: number;
  diameterFt?: number;
  qualityType: string;
  amenityNames: string[];
  /** Product URL from Walden catalog for visual reference (closer to actual unit) */
  productLink?: string;
}

export interface RVConfigForPrompt {
  type: 'rv';
  siteTypeName: string;
  qualityType: string;
  amenityNames: string[];
}

export type ConfigForPrompt = GlampingConfigForPrompt | RVConfigForPrompt;

export type ImageAspectRatio = '4:3' | '3:2' | '16:9';
export type ImageTimeOfDay = 'midday' | 'golden_hour';
/** Used only when a reference image is attached (batch image 2+). */
export type ReferenceVariation =
  | 'same_property_new_subject'
  | 'subtle_camera_shift'
  | 'new_subject_and_camera';

/** Default when the client omits `referenceVariation`: new unit/site in frame plus a different camera angle. */
export const DEFAULT_REFERENCE_VARIATION: ReferenceVariation = 'new_subject_and_camera';
export type StylePresetId = 'none' | 'sage_marketing';

export interface BuildImagePromptOptions {
  sharedLandscapeContext?: string;
  batchPosition?: number;
  batchTotal?: number;
  /**
   * Optional override for internal-road / circulation surfacing.
   * When omitted: inferred from `imageDescription` (Additional details); defaults to paved.
   */
  roadSurface?: 'dirt' | 'gravel' | 'paved';
  /** Default 4:3 when omitted (API backward compatibility). */
  aspectRatio?: ImageAspectRatio;
  /** Default midday when omitted. */
  timeOfDay?: ImageTimeOfDay;
  /** Default Sage marketing when omitted; use `none` for neutral grading only. */
  stylePreset?: StylePresetId;
  /**
   * Opening scene context (marina, landscape hotel, traditional campground, etc.).
   * When omitted, defaults from config type: glamping → glamping_resort, rv → rv_resort.
   */
  propertySceneArchetype?: PropertySceneArchetypeId;
}

/** Defaults for API clients that omit batch style fields. */
export const DEFAULT_IMAGE_PROMPT_OPTIONS = {
  aspectRatio: '4:3' as const,
  timeOfDay: 'midday' as const,
  stylePreset: 'sage_marketing' as const,
};

export const SITE_BUILDER_STYLE_PRESETS: Record<Exclude<StylePresetId, 'none'>, string> = {
  sage_marketing:
    'Warm but natural color grade, gentle lift in greens and earth tones, restrained contrast, premium editorial outdoor hospitality feel—avoid neon saturation or heavy HDR.',
};

const REFERENCE_VARIATION_COPY: Record<ReferenceVariation, string> = {
  same_property_new_subject:
    'Variation intent: same property and grounds, but the new primary unit or site type from the instructions below must be the clear hero subject in frame. Architecture override: if the reference shows a different roof shape, footprint, or unit category than the text subject, ignore that building—only reuse terrain, sky, vegetation, ground, and lighting continuity.',
  subtle_camera_shift:
    'Variation intent: same property and subject category, but use a modestly different camera position or framing while keeping lens character, eye level, and horizon consistent. If the text names a different site or unit type than the reference structure, the text wins for all built form.',
  new_subject_and_camera:
    'Variation intent: same property and grounds, but the new primary unit or site type from the instructions below must be the clear hero subject in frame, and use a noticeably different camera position or viewing angle than the reference while keeping approximately 50mm eye-level character and horizon consistency where possible. Architecture override: do not copy the reference building’s silhouette, roof geometry, or proportions when they conflict with the named subject in the text—the reference is for environment matching only.',
};

/** Reject empty names before calling the image API. */
export function isValidImagePromptConfig(config: ConfigForPrompt): boolean {
  if (config.type === 'glamping') return config.unitTypeName.trim().length > 0;
  return config.siteTypeName.trim().length > 0;
}

function timeOfDayPhrase(time: ImageTimeOfDay): string {
  if (time === 'golden_hour') {
    return 'Time and light: golden-hour sunlight, long soft shadows, warm highlights on landscape and structure, still believable and not stylized.';
  }
  return 'Time and light: midday neutral daylight, clear readable shadows, balanced color temperature, no artificial sunset glow unless the setting text explicitly requires it.';
}

/**
 * Immutable batch-level camera, aspect, light, and negative constraints.
 * Placed immediately after the scene opener so it overrides conflicting free-form hints.
 */
export function buildGlobalStyleBlock(opts: {
  aspectRatio: ImageAspectRatio;
  timeOfDay: ImageTimeOfDay;
}): string {
  const aspect =
    opts.aspectRatio === '16:9'
      ? '16:9 widescreen landscape aspect ratio'
      : opts.aspectRatio === '3:2'
        ? '3:2 landscape aspect ratio'
        : '4:3 landscape aspect ratio';
  return (
    `Global look (fixed for this batch): Framing ${aspect}. ` +
    'Camera: approximately 50mm full-frame equivalent at eye level—natural perspective, avoid ultra-wide distortion. ' +
    `${timeOfDayPhrase(opts.timeOfDay)} ` +
    'Negatives: no people, no logos, no brand marks, no signage with readable trademarks, no overlaid text, captions, or watermarks. ' +
    'Composition: one clear primary subject (the glamping unit or RV site) centered in the frame at a consistent apparent scale to the ground plane; ' +
    'medium shot showing the full structure and immediate pad or yard; keep horizon height consistent across batch variations where applicable.'
  );
}

function stylePresetPhrase(preset: StylePresetId | undefined): string {
  if (!preset || preset === 'none') return '';
  const text = SITE_BUILDER_STYLE_PRESETS[preset];
  return text ? `Brand look: ${text}` : '';
}

/** Base continuity instructions when a reference image is attached. */
export const REFERENCE_IMAGE_PROMPT_PREFIX =
  'The attached reference image is an earlier render of the same property in this batch. ' +
  'Match its landscape, horizon line, vegetation, season, weather, lighting direction, color grading, and ground or road materials. ' +
  'Replace only the primary subject (the unit or RV site) per the instructions below; keep the environment visually continuous with the reference. ' +
  'Critical: the reference may depict a different unit or roof type than the text instructions. When that happens, treat the reference building as wrong—carry over only the setting; rebuild the hero structure exactly as the text subject specifies (silhouette, roof, materials, and apparent price/quality tier). ';

export function buildReferenceImagePromptPrefix(variation?: ReferenceVariation): string {
  if (!variation) return REFERENCE_IMAGE_PROMPT_PREFIX;
  return `${REFERENCE_IMAGE_PROMPT_PREFIX}${REFERENCE_VARIATION_COPY[variation]} `;
}

/** Preamble when a manufacturer product photo is attached as the first user message image. */
export const CATALOG_PRODUCT_IMAGE_PREAMBLE =
  'First attached image: manufacturer catalog or product-page photo of this glamping unit (best-effort fetch—may be missing). ' +
  'Use it as an illustrative visual reference for exterior massing, proportions, materials, roof shape, windows, doors, and entry—not an exact specification, survey substitute, or implied endorsement. ' +
  'Recreate that unit in the outdoor hospitality scene described in the text below; ignore studio backdrops, furniture, or people from the product image. ';

const BATCH_SCENE_AS_SECOND_IMAGE_CORE =
  'Second attached image: an earlier render of the same property in this batch. ' +
  'Match its landscape, horizon line, vegetation, season, weather, lighting direction, color grading, and ground or road materials. ' +
  'Replace only the primary subject (the unit or RV site) per the instructions below; keep the environment visually continuous with this reference. ' +
  'Critical: if this reference shows a different unit silhouette or roof form than the text subject, ignore the reference structure—reuse only the land, plants, sky, and circulation; the text-named unit type and quality tier define the building. ';

/** Batch continuity when a catalog product image is already the first attachment. */
export function buildBatchSceneReferenceAfterCatalog(variation?: ReferenceVariation): string {
  if (!variation) return BATCH_SCENE_AS_SECOND_IMAGE_CORE;
  return `${BATCH_SCENE_AS_SECOND_IMAGE_CORE}${REFERENCE_VARIATION_COPY[variation]} `;
}

/** @deprecated Use buildGlobalStyleBlock + aspect options; kept for tests that assert stable exports. */
export const FRAMING_AND_COMPOSITION = buildGlobalStyleBlock({
  aspectRatio: '4:3',
  timeOfDay: 'midday',
});

/** Quality tier → visual style for glamping units */
const QUALITY_TO_STYLE_GLAMPING: Record<string, string> = {
  Budget:
    'rustic, basic, affordable accommodations with simple finishes—plain siding or modest wood, small or no deck, basic windows and doors, minimal trim, nothing spa-like or designer',
  Economy:
    'simple, functional accommodations with modest finishes—straightforward materials, limited architectural elaboration, practical deck or stoop if any',
  'Mid-Range':
    'comfortable, well-appointed accommodations with solid finishes—clean lines, balanced windows and doors, tasteful but not flashy exterior',
  Premium:
    'high-quality, well-finished accommodations with premium touches—refined siding and trim, generous glazing quality, cohesive outdoor living details',
  Luxury:
    'luxurious accommodations with premium finishes and upscale amenities—rich materials, large quality windows, elevated deck and entry presence, resort-grade detailing',
  'Ultra Luxury':
    'ultra-luxury, high-end designer finishes, five-star quality, magazine-worthy—statement architecture, exceptional materials and craft, no visible cost-cutting',
};

/** Same tiers, wording tuned for RV pads and outdoor infrastructure (not guest rooms). */
const QUALITY_TO_STYLE_RV: Record<string, string> = {
  Budget:
    'basic campground infrastructure, simple compacted pads, minimal landscaping, utilitarian hookups—reads inexpensive and practical',
  Economy:
    'functional RV sites with modest pad surfacing, tidy standard pedestals, and straightforward circulation—no resort polish',
  'Mid-Range':
    'well-kept pads, balanced landscaping, clean utility presentation, approachable resort upkeep—pleasant but middle-market',
  Premium:
    'polished pads and defined parking geometry, quality landscaping, modern pedestal aesthetics, cohesive resort feel—clearly above average',
  Luxury:
    'high-end outdoor hospitality infrastructure, generous level pads, lush landscaping, premium utility hardware—obvious upscale resort',
  'Ultra Luxury':
    'best-in-class RV resort hardscape and landscape, immaculate pads, designer-grade utilities, magazine-worthy grounds—top of market',
};

const DEFAULT_GLAMPING_STYLE = 'comfortable, well-appointed accommodations with solid finishes';
const DEFAULT_RV_STYLE =
  'well-maintained RV pads with balanced surfacing, tidy utility presentation, and cohesive outdoor resort upkeep';

function qualityTierSentence(qualityType: string, stylePhrase: string): string {
  return `Visual quality tier: ${qualityType} — ${stylePhrase}.`;
}

function qualityTierEnforcementBlock(qualityType: string, domain: 'glamping' | 'rv'): string {
  const glamping =
    `Price and quality tier enforcement (glamping): "${qualityType}" is a primary creative constraint. ` +
    'Exterior siding, glazing quality, door and trim level, deck size and railing detail, steps, and any visible interior through openings must all read at that tier—Budget must not look like a Luxury brochure; Luxury must not look like bare-bones Budget. ';
  const rv =
    `Price and quality tier enforcement (RV site): "${qualityType}" is a primary creative constraint. ` +
    'Pad surface and edges, pedestal hardware, hose bibs, landscaping density, edging, and overall polish must unmistakably match that tier. ';
  const tail =
    `Repeat: the image should be instantly readable as "${qualityType}" for this product visualization, not a generic compromise.`;
  return (domain === 'glamping' ? glamping : rv) + tail;
}

function qualityTierBlock(qualityType: string, stylePhrase: string, domain: 'glamping' | 'rv'): string {
  return joinParts(qualityTierSentence(qualityType, stylePhrase), qualityTierEnforcementBlock(qualityType, domain));
}

/** When batch image 2+, stop the model from cloning the prior render’s unit/site type. */
function batchSubjectLockPhrase(config: ConfigForPrompt, options?: BuildImagePromptOptions): string {
  const pos = options?.batchPosition;
  const total = options?.batchTotal;
  if (typeof pos !== 'number' || typeof total !== 'number' || total <= 1 || pos <= 0) return '';

  if (config.type === 'glamping') {
    const name = config.unitTypeName.trim();
    return (
      `Batch subject lock (image ${pos + 1} of ${total}): the hero structure must be a ${name} with silhouette and roof geometry correct for that label. ` +
      `An earlier batch render may show a different unit type—borrow only land, plants, sky, light, and roads from the reference; never copy the prior building’s shape when it disagrees with "${name}".`
    );
  }
  const site = config.siteTypeName.trim();
  return (
    `Batch subject lock (image ${pos + 1} of ${total}): the hero subject must read as "${site}" for the RV site. ` +
    'If the reference implies a different pad class or layout, follow the text—not the reference pad geometry or utility presentation when they conflict.'
  );
}

/**
 * Detect gravel or dirt roads/access from free-form "Additional details" text.
 * Returns undefined when nothing suggests a non-paved circulation surface (caller defaults to paved).
 */
export function inferRoadSurfaceFromImageDescription(text: string): 'dirt' | 'gravel' | undefined {
  const d = text.toLowerCase();
  if (!d.trim()) return undefined;

  const circulationCue =
    /\b(road|roads|drive|driveway|lane|lanes|access|path|paths|internal|circulation|parking|lot|lots|pad\s+roads?|entry)\b/.test(
      d
    );

  if (
    /\bunpaved\b/.test(d) ||
    /\b(mud|muddy)\b/.test(d) ||
    /\bdirt\s+(road|roads|drive|driveway|lane|access|path|paths)\b/.test(d) ||
    /\b(road|roads|drive|driveway|lane|access)\s+(is|are)\s+dirt\b/.test(d) ||
    /\bcompacted\s+dirt\b/.test(d) ||
    /\bunimproved\b/.test(d) ||
    /\bnatural\s+surface\b/.test(d) ||
    (/\bprimitive\b/.test(d) && circulationCue) ||
    (/\btwo-?track\b/.test(d) && /\b(road|access|lane)\b/.test(d))
  ) {
    return 'dirt';
  }

  if (
    /\bgravel\s+(road|roads|drive|driveway|lane|access|path|paths|surface)\b/.test(d) ||
    /\b(road|roads|drive|driveway|lane|access)\s+(is|are)\s+gravel\b/.test(d) ||
    /\ball\s+gravel\b/.test(d) ||
    /\bcrushed\s+stone\b/.test(d) ||
    /\bchip\s*seal(ed)?\b/.test(d) ||
    /\bdecomposed\s+granite\b/.test(d) ||
    /\bstone\s+dust\b/.test(d) ||
    /\broad\s+base\b/.test(d) ||
    /\bbase\s+rock\b/.test(d) ||
    /\baggregate\s+(road|roads|drive|access|lane|surface)\b/.test(d) ||
    (/\bdg\b/.test(d) && circulationCue) ||
    /\bcaliche\b/.test(d)
  ) {
    return 'gravel';
  }

  if (/\bdirt\b/.test(d) && circulationCue) {
    return 'dirt';
  }
  if (/\bgravel\b/.test(d) && circulationCue) {
    return 'gravel';
  }

  return undefined;
}

function resolveRoadSurfaceForPrompt(
  explicit: 'dirt' | 'gravel' | 'paved' | undefined,
  imageDescription: string | undefined
): 'dirt' | 'gravel' | 'paved' {
  if (explicit === 'dirt' || explicit === 'gravel' || explicit === 'paved') return explicit;
  return inferRoadSurfaceFromImageDescription(imageDescription?.trim() ?? '') ?? 'paved';
}

function roadSurfacePhrase(roadSurface: 'dirt' | 'gravel' | 'paved'): string {
  if (roadSurface === 'paved') {
    return (
      'Infrastructure: use paved internal roads and paved access surfaces that look realistic for a finished hospitality property. ' +
      'Default assumption: paved circulation unless Additional details (or an explicit road-surface override) clearly call for gravel or unpaved dirt.'
    );
  }
  if (roadSurface === 'gravel') {
    return 'Infrastructure: use compacted gravel internal roads and gravel access surfaces with realistic drainage and texture.';
  }
  return 'Infrastructure: use compacted dirt internal roads and natural-looking unpaved circulation areas.';
}

const AMENITIES_INCLUDED =
  'Amenities: include only these, and show each clearly in the frame where realistic for the composition (e.g. visible deck, fire pit, hot tub, fencing if listed): %AMENITIES%. ' +
  'Do not show any amenities not in this list (e.g. no fire pit unless listed, no deck unless listed, no hot tub unless listed).';
const AMENITIES_NONE =
  'Amenities: none—do not show fire pit, deck, hot tub, patio furniture, outdoor kitchen, or any other amenities.';

function amenitiesPhrase(names: string[]): string {
  return names.length > 0 ? AMENITIES_INCLUDED.replace('%AMENITIES%', names.join(', ')) : AMENITIES_NONE;
}

const PHOTO_STYLE_BLOCK =
  'Style: genuine photograph, natural color grading, realistic exposure, no HDR or oversaturation. ' +
  'As if shot on a real camera—subtle shadows, authentic tones, documentary feel.';

function joinParts(...segments: Array<string | undefined | false>): string {
  return segments
    .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolvedStyleOptions(options?: BuildImagePromptOptions): {
  aspectRatio: ImageAspectRatio;
  timeOfDay: ImageTimeOfDay;
  stylePreset: StylePresetId;
} {
  return {
    aspectRatio: options?.aspectRatio ?? DEFAULT_IMAGE_PROMPT_OPTIONS.aspectRatio,
    timeOfDay: options?.timeOfDay ?? DEFAULT_IMAGE_PROMPT_OPTIONS.timeOfDay,
    stylePreset: options?.stylePreset ?? DEFAULT_IMAGE_PROMPT_OPTIONS.stylePreset,
  };
}

export function buildImagePrompt(
  config: ConfigForPrompt,
  location?: string,
  imageDescription?: string,
  options?: BuildImagePromptOptions
): string {
  const { aspectRatio, timeOfDay, stylePreset } = resolvedStyleOptions(options);
  const globalBlock = buildGlobalStyleBlock({ aspectRatio, timeOfDay });
  const presetLine = stylePresetPhrase(stylePreset);

  const shared = options?.sharedLandscapeContext?.trim();
  const isMultiImageBatch =
    typeof options?.batchTotal === 'number' && options.batchTotal > 1;
  const globalOnlyInShared = Boolean(shared && isMultiImageBatch);
  const locationPhrase = globalOnlyInShared || !location?.trim() ? '' : `Setting: ${location.trim()}.`;
  const descriptionPhrase =
    globalOnlyInShared || !imageDescription?.trim()
      ? ''
      : `Additional details to include: ${imageDescription.trim()}.`;
  const sharedLandscapePhrase = shared
    ? `Batch continuity: keep the exact same landscape and environmental context used for the other images in this batch: ${shared}.`
    : '';
  const batchPhrase =
    typeof options?.batchPosition === 'number' && typeof options?.batchTotal === 'number' && options.batchTotal > 1
      ? `Batch: this image is ${options.batchPosition + 1} of ${options.batchTotal} for one single property. Match the same terrain, vegetation, season, weather, time of day, camera height, and background horizon as the other generated images.`
      : '';
  const road = roadSurfacePhrase(resolveRoadSurfaceForPrompt(options?.roadSurface, imageDescription));

  const archetype: PropertySceneArchetypeId =
    options?.propertySceneArchetype ??
    defaultPropertySceneArchetypeForConfigType(config.type === 'glamping' ? 'glamping' : 'rv');
  const scenePhrase = scenePhraseForPropertyArchetype(archetype);

  if (config.type === 'glamping') {
    const sizeDesc = config.diameterFt
      ? `${config.diameterFt} foot diameter geodesic dome`
      : config.sqft
        ? `${config.sqft} square foot`
        : '';
    const unitDesc = `${config.unitTypeName}${sizeDesc ? `, ${sizeDesc}` : ''}`;
    const stylePhrase = QUALITY_TO_STYLE_GLAMPING[config.qualityType] ?? DEFAULT_GLAMPING_STYLE;
    const productRef =
      config.productLink?.trim() &&
      `Catalog reference: match the unit as closely as possible to this product page: ${config.productLink.trim()}. ` +
        'Illustrative reference for structure and finishes—product-page imagery is best-effort and may be unavailable; not an exact specification or an implied endorsement.';
    const unitNameLower = config.unitTypeName.trim().toLowerCase();
    const isAFrame = unitNameLower.includes('a-frame') || unitNameLower.includes('aframe');
    const aFrameArchitecturePhrase = isAFrame
      ? `Subject constraint: this must be a true compact A-frame structure with a strong triangular profile and steep roof planes that run down to the ground or nearly to the ground on both sides. Do not generate a rectangular cabin with a separate conventional roof. Keep the structure small and proportional to about ${config.sqft ?? 350} square feet.`
      : '';
    const isHouseBoat =
      unitNameLower.includes('house boat') || unitNameLower.includes('houseboat');
    const houseBoatPhrase = isHouseBoat
      ? 'Subject constraint: show a floating houseboat or cabin vessel used as guest lodging—clearly on calm water (marina, lake, or sheltered harbor) with appropriate hull, deck, and mooring or dock access; do not depict a land-only cabin or towable RV.'
      : '';
    const isCabinType =
      /\bcabin\b/i.test(config.unitTypeName) && !/\bmirror\b/i.test(config.unitTypeName) && !isAFrame;
    const cabinArchitecturePhrase = isCabinType
      ? 'Subject constraint: depict a conventional cabin—rectilinear walls and a typical gable, shed, or hip roof with distinct eaves—not a steep triangular A-frame envelope meeting at the ground, not a yurt, dome, or tent structure.'
      : '';

    return joinParts(
      `Scene: photorealistic ${scenePhrase}. ${globalBlock}`,
      `Subject: ${unitDesc}.`,
      aFrameArchitecturePhrase,
      houseBoatPhrase,
      cabinArchitecturePhrase,
      batchSubjectLockPhrase(config, options),
      qualityTierBlock(config.qualityType, stylePhrase, 'glamping'),
      amenitiesPhrase(config.amenityNames),
      road,
      joinParts(batchPhrase, sharedLandscapePhrase),
      PHOTO_STYLE_BLOCK,
      presetLine,
      productRef,
      locationPhrase,
      descriptionPhrase
    );
  }

  const siteNameLower = config.siteTypeName.trim().toLowerCase();
  const isDeluxeRvSite = siteNameLower.includes('deluxe') || siteNameLower.includes('premium') || siteNameLower.includes('luxury');
  const rvDeluxePhrase = isDeluxeRvSite
    ? 'Subject constraint: this is a deluxe RV back-in site. Show a high-quality oversized level pad, clean and modern utility pedestal hookups, clear maneuvering space, premium landscaping, and a polished resort-grade appearance.'
    : '';
  const rvStylePhrase = QUALITY_TO_STYLE_RV[config.qualityType] ?? DEFAULT_RV_STYLE;

  return joinParts(
    `Scene: photorealistic ${scenePhrase}. ${globalBlock}`,
    `Subject: ${config.siteTypeName}.`,
    rvDeluxePhrase,
    batchSubjectLockPhrase(config, options),
    qualityTierBlock(config.qualityType, rvStylePhrase, 'rv'),
    amenitiesPhrase(config.amenityNames),
    road,
    joinParts(batchPhrase, sharedLandscapePhrase),
    PHOTO_STYLE_BLOCK,
    presetLine,
    locationPhrase,
    descriptionPhrase
  );
}
