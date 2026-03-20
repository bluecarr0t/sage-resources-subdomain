/**
 * Build AI image prompts for Site Builder configurations.
 * One prompt per config: glamping or RV, with amenities and location.
 */

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

export interface BuildImagePromptOptions {
  sharedLandscapeContext?: string;
  batchPosition?: number;
  batchTotal?: number;
  roadSurface?: 'dirt' | 'gravel' | 'paved';
}

/** Quality tier → visual style for image generation */
const QUALITY_TO_STYLE: Record<string, string> = {
  Budget: 'rustic, basic, affordable accommodations with simple finishes',
  Economy: 'simple, functional accommodations with modest finishes',
  'Mid-Range': 'comfortable, well-appointed accommodations with solid finishes',
  Premium: 'high-quality, well-finished accommodations with premium touches',
  Luxury: 'luxurious accommodations with premium finishes and upscale amenities',
  'Ultra Luxury': 'ultra-luxury, high-end designer finishes, five-star quality, magazine-worthy',
};

export function buildImagePrompt(
  config: ConfigForPrompt,
  location?: string,
  imageDescription?: string,
  options?: BuildImagePromptOptions
): string {
  const locationPhrase = location?.trim() ? ` Setting: ${location.trim()}.` : '';
  const descriptionPhrase = imageDescription?.trim()
    ? ` Additional details to include: ${imageDescription.trim()}.`
    : '';
  const sharedLandscapePhrase = options?.sharedLandscapeContext?.trim()
    ? ` Keep the exact same landscape and environmental context used for the other images in this batch: ${options.sharedLandscapeContext.trim()}.`
    : '';
  const batchPhrase =
    typeof options?.batchPosition === 'number' && typeof options?.batchTotal === 'number' && options.batchTotal > 1
      ? ` This image is ${options.batchPosition + 1} of ${options.batchTotal} for one single property. Match the same terrain, vegetation, season, weather, time of day, camera height, and background horizon as the other generated images.`
      : '';
  const roadSurfacePhrase =
    options?.roadSurface === 'paved'
      ? ' Use paved internal roads and paved access surfaces that look realistic for a finished hospitality property.'
      : options?.roadSurface === 'gravel'
        ? ' Use compacted gravel internal roads and gravel access surfaces with realistic drainage and texture.'
      : options?.roadSurface === 'dirt'
        ? ' Use compacted dirt internal roads and natural-looking unpaved circulation areas.'
        : '';

  if (config.type === 'glamping') {
    const sizeDesc = config.diameterFt
      ? `${config.diameterFt} foot diameter geodesic dome`
      : config.sqft
        ? `${config.sqft} square foot`
        : '';
    const unitDesc = `${config.unitTypeName}${sizeDesc ? `, ${sizeDesc}` : ''}`;
    const amenitiesPhrase =
      config.amenityNames.length > 0
        ? ` Include only these amenities: ${config.amenityNames.join(', ')}. Do not show any amenities not in this list (e.g. no fire pit unless listed, no deck unless listed, no hot tub unless listed).`
        : ` No amenities—do not show fire pit, deck, hot tub, patio furniture, outdoor kitchen, or any other amenities.`;
    const qualityStyle = QUALITY_TO_STYLE[config.qualityType] ?? 'well-appointed accommodations';
    const productRef =
      config.productLink?.trim()
        ? ` Match the unit as closely as possible to this reference product: ${config.productLink.trim()}.`
        : '';
    const unitNameLower = config.unitTypeName.trim().toLowerCase();
    const isAFrame = unitNameLower.includes('a-frame') || unitNameLower.includes('aframe');
    const aFrameArchitecturePhrase = isAFrame
      ? ` IMPORTANT: This must be a true compact A-frame structure with a strong triangular profile and steep roof planes that run down to the ground or nearly to the ground on both sides. Do not generate a rectangular cabin with a separate conventional roof. Keep the structure small and proportional to about ${config.sqft ?? 350} square feet.`
      : '';

    return (
      `Photorealistic glamping site, human-height camera perspective, soft natural lighting. ` +
      `${unitDesc}. ` +
      `${qualityStyle}.${amenitiesPhrase} ` +
      `${aFrameArchitecturePhrase}` +
      `${batchPhrase}${sharedLandscapePhrase}` +
      `Style: genuine photograph, natural color grading, realistic exposure, no HDR or oversaturation. ` +
      `As if shot on a real camera—subtle shadows, authentic tones, documentary feel.${productRef}${locationPhrase}${descriptionPhrase}`
    );
  }

  const amenitiesPhrase =
    config.amenityNames.length > 0
      ? ` Include only these amenities: ${config.amenityNames.join(', ')}. Do not show any amenities not in this list (e.g. no fire pit unless listed, no deck unless listed, no hot tub unless listed).`
      : ` No amenities—do not show fire pit, deck, hot tub, patio furniture, outdoor kitchen, or any other amenities.`;
  const siteNameLower = config.siteTypeName.trim().toLowerCase();
  const isDeluxeRvSite = siteNameLower.includes('deluxe') || siteNameLower.includes('premium') || siteNameLower.includes('luxury');
  const rvDeluxePhrase = isDeluxeRvSite
    ? ' IMPORTANT: This is a deluxe RV back-in site. Show a high-quality oversized level pad, clean and modern utility pedestal hookups, clear maneuvering space, premium landscaping, and a polished resort-grade appearance.'
    : '';
  const rvQualityStyle = QUALITY_TO_STYLE[config.qualityType] ?? 'well-appointed accommodations';
  return (
    `Photorealistic RV park site, human-height camera perspective, soft natural lighting. ` +
    `${config.siteTypeName}. Visual quality tier: ${config.qualityType} (${rvQualityStyle}).${amenitiesPhrase} ` +
    `${rvDeluxePhrase}${roadSurfacePhrase}${batchPhrase}${sharedLandscapePhrase}` +
    `Style: genuine photograph, natural color grading, realistic exposure, no HDR or oversaturation. ` +
    `As if shot on a real camera—subtle shadows, authentic tones, documentary feel.${locationPhrase}${descriptionPhrase}`
  );
}
