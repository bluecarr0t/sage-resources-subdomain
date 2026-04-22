/**
 * Sage AI - Feasibility Study .docx payload schema.
 *
 * The `generate_feasibility_section` tool returns a structured payload that the
 * client renders inline (read-only preview) and can POST to the server-side
 * builder to download a Microsoft Word file. Keeping the contract as data
 * (instead of HTML or markdown) lets the builder enforce the writing-style
 * guide: Calibri 11pt, 1.15 line spacing, justified body, bold headings,
 * #E2EFDA table-header fill, numbered lists with bold item names, paragraphs
 * starting with a bold name + short hyphen, no random bolding, no `~`, and no
 * en/em dashes.
 *
 * IMPORTANT: All fields are strict text. Never include URLs, source citations,
 * or `~` in section payloads — the writing style guide keeps citations in chat
 * only unless the user opts in (and the model still has to ask first).
 */

import { z } from 'zod';

export const FEASIBILITY_DOCX_SCHEMA_VERSION = 1 as const;

/**
 * One block in a section. The renderer/builder maps each kind to a strict
 * formatting rule from the style guide. Unknown kinds are rejected by zod.
 */
export const feasibilityHeadingBlockSchema = z.object({
  kind: z.literal('heading'),
  text: z.string().min(1).max(240),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1),
});

export const feasibilityParagraphBlockSchema = z.object({
  kind: z.literal('paragraph'),
  /**
   * Optional bold name/title that prefixes the paragraph. The builder writes
   * `<bold>name</bold> - <regular>text</regular>` per the style guide
   * "Paragraphs" rule. Leave undefined for a regular paragraph with no lead-in.
   */
  name: z.string().max(160).optional(),
  text: z.string().min(1).max(6000),
});

export const feasibilityNumberedListItemSchema = z.object({
  /** Bold lead-in (e.g. "Daily Rate"). */
  name: z.string().min(1).max(160),
  /** Plain description that follows the bold name on the same line. */
  description: z.string().min(1).max(2000),
});

export const feasibilityNumberedListBlockSchema = z.object({
  kind: z.literal('numbered_list'),
  items: z.array(feasibilityNumberedListItemSchema).min(1).max(50),
});

export const feasibilityTableBlockSchema = z.object({
  kind: z.literal('table'),
  /** Optional bold caption rendered above the table. */
  caption: z.string().max(200).optional(),
  /** Column headers; rendered bold + filled with #E2EFDA. */
  headers: z.array(z.string().max(160)).min(1).max(10),
  /** Body rows. Each row's length must equal `headers.length`. */
  rows: z
    .array(z.array(z.string().max(2000)).min(1).max(10))
    .min(1)
    .max(200),
});

export const feasibilityBlockSchema = z.discriminatedUnion('kind', [
  feasibilityHeadingBlockSchema,
  feasibilityParagraphBlockSchema,
  feasibilityNumberedListBlockSchema,
  feasibilityTableBlockSchema,
]);

export type FeasibilityHeadingBlock = z.infer<typeof feasibilityHeadingBlockSchema>;
export type FeasibilityParagraphBlock = z.infer<typeof feasibilityParagraphBlockSchema>;
export type FeasibilityNumberedListItem = z.infer<typeof feasibilityNumberedListItemSchema>;
export type FeasibilityNumberedListBlock = z.infer<typeof feasibilityNumberedListBlockSchema>;
export type FeasibilityTableBlock = z.infer<typeof feasibilityTableBlockSchema>;
export type FeasibilityBlock = z.infer<typeof feasibilityBlockSchema>;

export const feasibilityDocxPayloadSchema = z
  .object({
    type: z.literal('feasibility_section'),
    schema_version: z.literal(FEASIBILITY_DOCX_SCHEMA_VERSION),
    /** Section title written as the top-level heading in the .docx. */
    title: z.string().min(1).max(200),
    /**
     * Suggested filename stem (no extension). The route appends `.docx` and
     * sanitizes characters. Defaults to a slug of `title` when omitted.
     */
    filename_hint: z.string().max(120).optional(),
    blocks: z.array(feasibilityBlockSchema).min(1).max(120),
  })
  .superRefine((value, ctx) => {
    for (let i = 0; i < value.blocks.length; i += 1) {
      const block = value.blocks[i]!;
      if (block.kind === 'table') {
        const headerCount = block.headers.length;
        for (let r = 0; r < block.rows.length; r += 1) {
          if (block.rows[r]!.length !== headerCount) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['blocks', i, 'rows', r],
              message: `Table row ${r + 1} has ${block.rows[r]!.length} cells but headers has ${headerCount}.`,
            });
          }
        }
      }
    }
  });

export type FeasibilityDocxPayload = z.infer<typeof feasibilityDocxPayloadSchema>;

export function isFeasibilityDocxPayload(value: unknown): value is FeasibilityDocxPayload {
  return (
    !!value &&
    typeof value === 'object' &&
    (value as { type?: unknown }).type === 'feasibility_section' &&
    (value as { schema_version?: unknown }).schema_version ===
      FEASIBILITY_DOCX_SCHEMA_VERSION
  );
}

/**
 * Strip characters the writing-style guide bans before they reach the .docx.
 *
 *   - `~` (approximate) is forbidden anywhere
 *   - en dash (\u2013) and em dash (\u2014) collapse to the standard short
 *     hyphen `-` so users don't have to scrub them after pasting into Word
 *   - misc fancy spaces / non-breaking spaces collapse to a regular space
 *
 * This is a defensive last-mile pass; the system prompt also tells the model
 * not to emit these characters in the first place.
 */
export function sanitizeFeasibilityText(input: string): string {
  return input
    .replace(/~/g, '')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, ' ');
}

/**
 * Lower-case alnum + dashes; safe for Content-Disposition + cross-platform FS.
 * Falls back to "feasibility-section" for empty / all-symbol inputs.
 */
export function slugifyFeasibilityFilename(input: string): string {
  const slug = input
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || 'feasibility-section';
}
