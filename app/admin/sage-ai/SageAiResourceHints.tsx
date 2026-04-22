'use client';

import { useEffect } from 'react';
import { getPyodideCdnBase } from '@/lib/sage-ai/pyodide/pyodide-version';

const PYODIDE_BASE =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_PYODIDE_BASE
    ? process.env.NEXT_PUBLIC_PYODIDE_BASE.replace(/\/?$/, '/')
    : null) ?? '/pyodide/';

/**
 * Injects resource hints for Pyodide (dns-prefetch, optional script preload) on
 * the client. The App Router + RSC do not always hoist arbitrary `<link>` tags
 * from a leaf page; doing this in the client avoids head/streaming issues while
 * keeping the same warm-up behavior after mount.
 */
export function SageAiResourceHints({ preloadPyodide }: { preloadPyodide: boolean }) {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const cdnOrigin = (() => {
      try {
        return new URL(getPyodideCdnBase()).origin;
      } catch {
        return 'https://cdn.jsdelivr.net';
      }
    })();

    if (!document.querySelector('link[data-sage-ai="dns-prefetch-pyodide"]')) {
      const dns = document.createElement('link');
      dns.rel = 'dns-prefetch';
      dns.href = cdnOrigin;
      dns.setAttribute('data-sage-ai', 'dns-prefetch-pyodide');
      document.head.appendChild(dns);
    }

    if (preloadPyodide && !document.querySelector('link[data-sage-ai="preload-pyodide"]')) {
      const preload = document.createElement('link');
      preload.rel = 'preload';
      preload.as = 'script';
      preload.href = `${PYODIDE_BASE}pyodide.js`;
      preload.crossOrigin = 'anonymous';
      preload.setAttribute('data-sage-ai', 'preload-pyodide');
      document.head.appendChild(preload);
    }
  }, [preloadPyodide]);

  return null;
}
