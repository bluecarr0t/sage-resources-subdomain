/** Visible and schema author for Sage-published resources content. */
export const SAGE_CONTENT_AUTHOR_NAME = 'Sage Outdoor Advisory';

export const SAGE_CONTENT_AUTHOR_URL = 'https://sageoutdooradvisory.com';

/** Schema.org author — Organization (brand-authored guides, landings, glossary). */
export function generateSageContentAuthorSchema() {
  return {
    '@type': 'Organization' as const,
    name: SAGE_CONTENT_AUTHOR_NAME,
    url: SAGE_CONTENT_AUTHOR_URL,
  };
}

/** @deprecated Use generateSageContentAuthorSchema */
export function generateSageGuideAuthorPerson() {
  return generateSageContentAuthorSchema();
}
