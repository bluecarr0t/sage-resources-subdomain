/**
 * Helper function to generate SEO-friendly alt text for glossary term images
 */
export function generateGlossaryImageAltText(term: string, definition: string): string {
  // Create descriptive alt text that includes the term and key information
  const termLower = term.toLowerCase();
  const definitionPreview = definition.substring(0, 120).replace(/\.$/, '');
  
  // Add context about glamping/outdoor hospitality
  let context = '';
  if (termLower.includes('tent') || termLower.includes('yurt') || termLower.includes('tipi') || termLower.includes('cabin') || termLower.includes('treehouse') || termLower.includes('dome') || termLower.includes('a-frame') || termLower.includes('airstream')) {
    context = ' glamping accommodation used in outdoor hospitality feasibility studies';
  } else if (termLower.includes('glamping')) {
    context = ' luxury outdoor accommodation for glamping resort feasibility analysis';
  } else {
    context = ' for outdoor hospitality industry';
  }
  
  return `${term} - ${definitionPreview}${context}`;
}

/**
 * Generate title attribute for images
 */
export function generateImageTitle(term: string): string {
  return `${term} glamping accommodation example`;
}

/**
 * Generate SEO-friendly alt text for tipi gallery images
 * Creates descriptive alt text based on common tipi variations and features
 */
export function generateTipiGalleryAltText(term: string, index: number, totalImages: number): string {
  const tipiVariations = [
    "Traditional conical tipi with wooden poles and canvas covering in natural outdoor setting",
    "Modern glamping tipi on wooden platform with decorative elements and cultural design",
    "Luxury tipi accommodation with premium amenities and comfortable interior furnishings",
    "Family-sized tipi glamping unit with spacious interior and outdoor fire pit area",
    "Authentic Native American style tipi with traditional design elements and natural materials",
    "Contemporary tipi glamping structure with modern amenities and scenic mountain backdrop",
    "Culturally-themed tipi accommodation featuring traditional decor and educational elements"
  ];

  // Use specific variation if available, otherwise generate descriptive text
  if (index < tipiVariations.length) {
    return `${term} - ${tipiVariations[index]}`;
  }

  // Fallback for additional images
  const contexts = [
    "outdoor glamping setting",
    "wooden platform base",
    "natural landscape backdrop",
    "cultural design elements",
    "modern glamping amenities",
    "traditional construction",
    "luxury accommodation features"
  ];

  const context = contexts[index % contexts.length];
  return `${term} glamping accommodation ${index + 1} of ${totalImages} - ${context} for outdoor hospitality feasibility studies`;
}
