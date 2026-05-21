'use client';

import { useMapContext } from '@/components/MapContext';
import { EDITORIAL_LINK_CLASS } from '@/components/editorial/EditorialPageShell';
import { buildFullMapPath } from '@/lib/map-embed-mode';
import { getResourcesSiteOrigin } from '@/lib/site-url';
import { useTranslations } from 'next-intl';

type MapEmbedOpenFullLinkProps = {
  locale: string;
  className?: string;
};

/**
 * Footer link on `?embed=1` iframes. Uses `window.open` so a new tab opens even when
 * the parent page (e.g. WordPress) strips `target="_blank"` on external markup.
 */
export default function MapEmbedOpenFullLink({ locale, className }: MapEmbedOpenFullLinkProps) {
  const { clientWorkOnly } = useMapContext();
  const t = useTranslations('map.embed');
  const href = `${getResourcesSiteOrigin()}${buildFullMapPath(locale, { clientWorkOnly })}`;
  const label = clientWorkOnly ? t('openFullClientWork') : t('openFullMap');

  const openInNewTab = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    window.open(href, '_blank', 'noopener,noreferrer');
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={openInNewTab}
      className={className ?? EDITORIAL_LINK_CLASS}
    >
      {label}
    </a>
  );
}
