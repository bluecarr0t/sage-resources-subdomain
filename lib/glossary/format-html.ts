const LEGACY_GLOSSARY_LINK_CLASS =
  /\s*class="text-\[#006b5f\]\s+hover:text-\[#005a4f\]\s+underline"/gi;

/** Strip legacy inline link classes so EDITORIAL_GUIDE_PROSE_CLASS link styles apply */
export function normalizeGlossaryBodyHtml(html: string): string {
  return html.replace(LEGACY_GLOSSARY_LINK_CLASS, '');
}

export function truncateGlossaryDefinition(text: string, maxLength = 120): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  const slice = trimmed.slice(0, maxLength);
  const lastSpace = slice.lastIndexOf(' ');
  const end = lastSpace > maxLength * 0.6 ? lastSpace : maxLength;
  return `${trimmed.slice(0, end).trim()}…`;
}
