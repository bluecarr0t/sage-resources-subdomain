/**
 * Prompt-injection guard for externally scraped content. Wraps third-party
 * text in neutral <UNTRUSTED_CONTENT> tags so the model treats it as data,
 * not instructions, and truncates to a caller-supplied character cap.
 */

/** Escape characters that could break out of the source attribute. */
function escapeSourceAttr(url: string): string {
  return url.replace(/"/g, '%22').replace(/[\r\n]/g, ' ');
}

/**
 * Wrap externally scraped content in neutral tags so the model treats it as
 * untrusted data, not instructions. Truncates to `maxChars`.
 */
export function wrapUntrustedContent(
  source: string,
  content: string,
  maxChars: number
): string {
  const safeSource = escapeSourceAttr(source);
  const trimmed =
    content.length > maxChars
      ? `${content.slice(0, maxChars)}\n...(truncated from ${content.length} characters)`
      : content;
  return `<UNTRUSTED_CONTENT source="${safeSource}">\n${trimmed}\n</UNTRUSTED_CONTENT>`;
}
