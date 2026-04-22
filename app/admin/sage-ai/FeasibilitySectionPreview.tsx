'use client';

/**
 * Sage AI - Inline preview + downloader for `generate_feasibility_section`.
 *
 * Renders the same payload the server-side .docx builder consumes, applying a
 * web-friendly approximation of the Sage writing-style guide:
 *   - Calibri (system fallback), justified body
 *   - Bold section headings
 *   - Numbered list: "<bold>Name</bold> - description"
 *   - Paragraphs: optional bold "Name -" lead-in
 *   - Tables with #E2EFDA header fill, bold headers
 *
 * Clicking "Download .docx" POSTs the payload to /api/admin/sage-ai/feasibility-docx
 * and triggers a browser download. Citations are deliberately not rendered —
 * they live in the chat reply, never in the section file.
 */

import { useState } from 'react';
import { Download, FileText, Loader2 } from 'lucide-react';
import type {
  FeasibilityBlock,
  FeasibilityDocxPayload,
} from '@/lib/sage-ai/feasibility-docx-payload';

const TABLE_HEADER_FILL = '#E2EFDA';

export interface FeasibilitySectionPreviewPayload extends FeasibilityDocxPayload {
  /**
   * Branding/template the .docx will be built against. Tools may omit this;
   * defaults to 'rv' to match the server-side default.
   */
  market_type?: 'rv' | 'glamping' | 'rv_glamping' | string;
  download_url?: string;
}

export function FeasibilitySectionPreview({
  payload,
}: {
  payload: FeasibilitySectionPreviewPayload;
}) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    try {
      const url = payload.download_url ?? '/api/admin/sage-ai/feasibility-docx';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: stripPreviewExtras(payload),
          market_type: payload.market_type ?? 'rv',
        }),
      });
      if (!res.ok) {
        let message = `Server returned ${res.status}`;
        try {
          const json = (await res.json()) as { error?: string };
          if (json?.error) message = json.error;
        } catch {
          // ignore - keep status-based message
        }
        throw new Error(message);
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filenameFromContentDisposition(
        res.headers.get('Content-Disposition'),
        `${slugify(payload.title)}.docx`
      );
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="my-4 rounded-lg border border-sage-200 bg-white shadow-sm dark:border-sage-800 dark:bg-gray-900">
      <div className="flex items-center justify-between gap-3 border-b border-sage-100 px-4 py-2.5 dark:border-sage-800/60">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-sage-600 dark:text-sage-300 shrink-0" />
          <div className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
            Feasibility section: {payload.title}
          </div>
        </div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex items-center gap-1.5 rounded-md border border-sage-300 bg-sage-50 px-3 py-1.5 text-xs font-medium text-sage-800 hover:bg-sage-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-sage-700 dark:bg-sage-900/40 dark:text-sage-100 dark:hover:bg-sage-900/60 transition-colors"
        >
          {downloading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          Download .docx
        </button>
      </div>

      <div
        className="px-4 py-3 text-[15px] leading-[1.6] text-gray-800 dark:text-gray-100"
        style={{ fontFamily: 'Calibri, "Segoe UI", sans-serif', textAlign: 'justify' }}
      >
        <h2 className="mb-3 text-lg font-bold" style={{ textAlign: 'left' }}>
          {payload.title}
        </h2>
        {payload.blocks.map((block, idx) => (
          <BlockView key={idx} block={block} />
        ))}
      </div>

      {error ? (
        <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700 dark:border-red-800/60 dark:bg-red-950/30 dark:text-red-300">
          Download failed: {error}
        </div>
      ) : null}
    </div>
  );
}

function BlockView({ block }: { block: FeasibilityBlock }) {
  if (block.kind === 'heading') {
    const sizeClass =
      block.level === 1 ? 'text-base' : block.level === 2 ? 'text-[15px]' : 'text-sm';
    return (
      <p
        className={`mt-3 mb-1.5 font-bold ${sizeClass}`}
        style={{ textAlign: 'left' }}
      >
        {block.text}
      </p>
    );
  }

  if (block.kind === 'paragraph') {
    return (
      <p className="mb-2.5">
        {block.name ? (
          <>
            <span className="font-bold">{block.name}</span>
            <span> - </span>
          </>
        ) : null}
        {block.text}
      </p>
    );
  }

  if (block.kind === 'numbered_list') {
    return (
      <ol className="mb-2.5 list-decimal pl-6 space-y-1">
        {block.items.map((item, i) => (
          <li key={i}>
            <span className="font-bold">{item.name}</span>
            <span> - </span>
            <span>{item.description}</span>
          </li>
        ))}
      </ol>
    );
  }

  // table
  return (
    <div className="mb-3">
      {block.caption ? (
        <p className="mb-1 font-bold" style={{ textAlign: 'left' }}>
          {block.caption}
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[14px]">
          <thead>
            <tr>
              {block.headers.map((header, i) => (
                <th
                  key={i}
                  scope="col"
                  className="border border-gray-300 px-2 py-1.5 font-bold dark:border-gray-700"
                  style={{
                    backgroundColor: TABLE_HEADER_FILL,
                    color: '#1f2937',
                    textAlign: i === 0 ? 'left' : 'center',
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => {
                  const align =
                    ci === 0 ? 'left' : isNumericLooking(cell) ? 'center' : 'left';
                  return (
                    <td
                      key={ci}
                      className="border border-gray-300 px-2 py-1.5 dark:border-gray-700"
                      style={{ textAlign: align }}
                    >
                      {cell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function isNumericLooking(value: string): boolean {
  return /^[\s$()%.,\-+]*[\d][\d.,$()%\s\-+/]*$/.test(value.trim());
}

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'feasibility-section'
  );
}

function filenameFromContentDisposition(
  header: string | null,
  fallback: string
): string {
  if (!header) return fallback;
  const match = header.match(/filename="?([^";]+)"?/i);
  return match?.[1] ?? fallback;
}

/**
 * The tool result includes UI-only fields (`market_type`, `download_url`) that
 * the server-side schema does not allow. Strip them before POSTing the payload
 * back so the route's zod parser stays strict.
 */
function stripPreviewExtras(payload: FeasibilitySectionPreviewPayload): FeasibilityDocxPayload {
  const { market_type: _market, download_url: _url, ...rest } = payload;
  void _market;
  void _url;
  return rest;
}
