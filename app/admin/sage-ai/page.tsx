import { Metadata } from 'next';
import SageAiClient from './SageAiClient';
import { SageAiResourceHints } from './SageAiResourceHints';

export const metadata: Metadata = {
  title: 'Sage AI - Admin',
  description: 'AI-powered assistant for querying and analyzing glamping property data',
  robots: {
    index: false,
    follow: false,
  },
};

// When the React canvas dashboard + map tools are enabled, the model will
// prefer them over Python/matplotlib and most sessions will never load
// Pyodide. Skip the ~50 KB loader preload in that case; it'll still
// lazy-load on demand if the model falls back to generate_python_code.
const SHOULD_PRELOAD_PYODIDE =
  process.env.SAGE_AI_VISUALIZATION_TOOLS !== 'true';

export default function SageAiPage() {
  return (
    <>
      <SageAiResourceHints preloadPyodide={SHOULD_PRELOAD_PYODIDE} />
      <SageAiClient />
    </>
  );
}
