'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { SAGE_AI_MAP_MARKER_HEX } from '@/lib/sage-ai/chart-palette';
import type { MapPayload, MapMarkerColor } from '@/lib/sage-ai/ui-parts';

// react-leaflet hits `window` during initialization; render it client-only.
const InnerMap = dynamic(() => import('./SageAiMapInner'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[320px] items-center justify-center text-sm text-gray-500 dark:text-gray-400">
      Loading map…
    </div>
  ),
});

const MARKER_HEX: Record<MapMarkerColor, string> = SAGE_AI_MAP_MARKER_HEX;

export function SageAiMap({ payload }: { payload: MapPayload }) {
  const hexLayers = useMemo(
    () =>
      payload.layers.map((layer) => ({
        ...layer,
        colorHex: MARKER_HEX[layer.color] ?? MARKER_HEX.sage,
      })),
    [payload.layers]
  );
  return (
    <div className="my-4 rounded-lg border border-gray-200 bg-white overflow-hidden dark:border-gray-800 dark:bg-gray-900">
      <div className="border-b border-gray-200 px-4 py-2 dark:border-gray-800">
        <div className="text-sm font-semibold text-gray-900 dark:text-gray-50">
          {payload.title}
        </div>
        {payload.description && (
          <div className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
            {payload.description}
          </div>
        )}
      </div>
      <InnerMap
        layers={hexLayers}
        focus={payload.focus}
      />
      {hexLayers.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-t border-gray-200 px-4 py-2 text-xs text-gray-600 dark:border-gray-800 dark:text-gray-300">
          {hexLayers.map((layer) => (
            <div key={layer.id} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: layer.colorHex }}
              />
              <span>
                {layer.label} ({layer.features.length})
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SageAiMap;
