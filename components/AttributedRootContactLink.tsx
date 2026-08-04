'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { trackCTAClick } from '@/lib/analytics';
import { resourcesContactUsUrl } from '@/lib/root-domain-attribution';

type AttributedRootContactLinkProps = {
  children: ReactNode;
  className?: string;
  /** Override path used for utm_content (defaults to current pathname). */
  attributionPath?: string;
  /** Fire cta_click in addition to the global outbound click listener. */
  ctaLocation?: string;
  external?: boolean;
  target?: ComponentPropsWithoutRef<'a'>['target'];
  rel?: ComponentPropsWithoutRef<'a'>['rel'];
};

/**
 * Contact CTA that always includes resources → root UTM attribution using the
 * current page path (or an explicit attributionPath).
 */
export default function AttributedRootContactLink({
  children,
  className,
  attributionPath,
  ctaLocation = 'resources_contact_cta',
  external = true,
  target,
  rel,
}: AttributedRootContactLinkProps) {
  const pathname = usePathname() || '/';
  const href = resourcesContactUsUrl(attributionPath ?? pathname);
  const resolvedTarget = target ?? (external ? '_blank' : undefined);
  const resolvedRel = rel ?? (external ? 'noopener noreferrer' : undefined);

  const handleClick = () => {
    const label = typeof children === 'string' ? children : 'Get In Touch';
    trackCTAClick(label, ctaLocation, href);
  };

  if (external) {
    return (
      <a
        href={href}
        className={className}
        target={resolvedTarget}
        rel={resolvedRel}
        onClick={handleClick}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
