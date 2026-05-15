/**
 * Very small HTML → plain text for fallback scraping (no jsdom dependency).
 */
export function stripHtmlToPlainText(html: string, maxChars: number): string {
  let t = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (t.length > maxChars) t = t.slice(0, maxChars);
  return t;
}
