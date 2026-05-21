'use client';

import { useMapContext } from '@/components/MapContext';
import MapEmbedShell from '@/components/MapEmbedShell';
import MapLayout from '@/components/MapLayout';

type MapPageClientProps = {
  locale: string;
};

export default function MapPageClient({ locale }: MapPageClientProps) {
  const { embedMode } = useMapContext();
  const layout = <MapLayout locale={locale} />;

  if (embedMode) {
    return <MapEmbedShell>{layout}</MapEmbedShell>;
  }

  return layout;
}
