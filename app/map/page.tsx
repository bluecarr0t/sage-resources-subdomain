import { permanentRedirect } from 'next/navigation';

/**
 * Legacy `/map` URL — canonical map lives at `/en/map` (middleware also 301s here).
 * Avoids static prerender of client map components that use `useSearchParams`.
 */
export default function LegacyMapPage() {
  permanentRedirect('/en/map');
}
