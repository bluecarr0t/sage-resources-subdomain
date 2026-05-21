'use client';

import Link from 'next/link';
import { useMapContext } from '@/components/MapContext';
import { buildLocalePropertyPath, buildLocalePropertyUrl } from '@/lib/site-url';

type MapPropertyDetailLinkProps = {
  locale: string;
  slug: string;
  className?: string;
  children: React.ReactNode;
};

/**
 * Property detail link from map InfoWindows.
 * In embed mode (`?embed=1`), opens the listing in a new tab (iframe stays on the map).
 */
export default function MapPropertyDetailLink({
  locale,
  slug,
  className,
  children,
}: MapPropertyDetailLinkProps) {
  const { embedMode } = useMapContext();
  const path = buildLocalePropertyPath(locale, slug);

  if (embedMode) {
    return (
      <a
        href={buildLocalePropertyUrl(locale, slug)}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={path} className={className} onClick={(e) => e.stopPropagation()}>
      {children}
    </Link>
  );
}
