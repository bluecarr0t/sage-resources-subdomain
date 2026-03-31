'use client';

import { Fragment, useMemo } from 'react';

type TDeepLink = (key: string, values?: Record<string, string | number>) => string;

function trimTrailingPunctuationFromUrl(url: string): string {
  return url.replace(/[),.;:!?]+$/u, '');
}

export function isDeepEnrichMapsUrl(href: string): boolean {
  try {
    const u = new URL(href);
    const h = u.hostname.toLowerCase();
    if (h === 'maps.app.goo.gl') return true;
    if (h === 'goo.gl' && u.pathname.includes('maps')) return true;
    if (h.startsWith('maps.google.')) return true;
    if (
      (h === 'www.google.com' || h === 'google.com') &&
      (u.pathname.includes('/maps') || u.searchParams.has('cid'))
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function parseTextWithUrls(text: string): Array<{ kind: 'text'; s: string } | { kind: 'url'; href: string }> {
  const out: Array<{ kind: 'text'; s: string } | { kind: 'url'; href: string }> = [];
  const re = /\bhttps?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const full = m[0];
    const start = m.index;
    if (start > last) out.push({ kind: 'text', s: text.slice(last, start) });
    out.push({ kind: 'url', href: trimTrailingPunctuationFromUrl(full) });
    last = start + full.length;
  }
  if (last < text.length) out.push({ kind: 'text', s: text.slice(last) });
  return out;
}

const linkClass = 'text-blue-600 dark:text-blue-400 hover:underline font-medium';

export function CompsV2DeepEnrichRichText({
  text,
  t,
  as: Wrapper = 'span',
  className,
}: {
  text: string;
  t: TDeepLink;
  as?: 'span' | 'p';
  className?: string;
}) {
  const children = useMemo(() => {
    if (!text) return null;
    const parts = parseTextWithUrls(text);
    let nonMapCount = 0;
    return parts.map((part, i) => {
      if (part.kind === 'text') {
        return <Fragment key={i}>{part.s}</Fragment>;
      }
      const { href } = part;
      let label: string;
      if (isDeepEnrichMapsUrl(href)) {
        label = t('deepLinkMaps');
      } else {
        nonMapCount += 1;
        if (nonMapCount === 1) {
          label = t('deepLinkWebsite');
        } else {
          try {
            const host = new URL(href).hostname.replace(/^www\./i, '');
            label = host.length <= 36 ? host : `${host.slice(0, 33)}…`;
          } catch {
            label = t('deepLinkLink');
          }
        }
      }
      return (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          {label}
        </a>
      );
    });
  }, [text, t]);

  const WrapperTag = Wrapper;
  return <WrapperTag className={className}>{children}</WrapperTag>;
}
