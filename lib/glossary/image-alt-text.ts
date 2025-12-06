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
