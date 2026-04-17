import { Metadata } from 'next';
import SageAiClient from './SageAiClient';
import { getPyodideCdnBase } from '@/lib/sage-ai/pyodide/pyodide-version';

export const metadata: Metadata = {
  title: 'Sage AI - Admin',
  description: 'AI-powered assistant for querying and analyzing glamping property data',
  robots: {
    index: false,
    follow: false,
  },
};

const PYODIDE_BASE =
  process.env.NEXT_PUBLIC_PYODIDE_BASE?.replace(/\/?$/, '/') ?? '/pyodide/';
const PYODIDE_CDN_ORIGIN = (() => {
  try {
    return new URL(getPyodideCdnBase()).origin;
  } catch {
    return 'https://cdn.jsdelivr.net';
  }
})();

// When the React canvas dashboard + map tools are enabled, the model will
// prefer them over Python/matplotlib and most sessions will never load
// Pyodide. Skip the ~50 KB loader preload in that case; it'll still
// lazy-load on demand if the model falls back to generate_python_code.
const SHOULD_PRELOAD_PYODIDE =
  process.env.SAGE_AI_VISUALIZATION_TOOLS !== 'true';

export default function SageAiPage() {
  return (
    <>
      {/* When /public/pyodide is missing, usePyodide falls back to jsDelivr; warm DNS early. */}
      <link rel="dns-prefetch" href={PYODIDE_CDN_ORIGIN} />
      {SHOULD_PRELOAD_PYODIDE && (
        <link
          rel="preload"
          as="script"
          href={`${PYODIDE_BASE}pyodide.js`}
          crossOrigin="anonymous"
        />
      )}
      <SageAiClient />
    </>
  );
}
