'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet';
import type { MapLayer, MapPayload } from '@/lib/sage-ai/ui-parts';

const LEAFLET_CSS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

function ensureLeafletCss() {
  if (typeof document === 'undefined') return;
  if (document.querySelector(`link[href="${LEAFLET_CSS_URL}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = LEAFLET_CSS_URL;
  link.crossOrigin = '';
  document.head.appendChild(link);
}

interface InnerMapProps {
  layers: Array<MapLayer & { colorHex: string }>;
  focus?: MapPayload['focus'];
}

function FitToFeatures({
  layers,
  focus,
}: {
  layers: InnerMapProps['layers'];
  focus: InnerMapProps['focus'];
}) {
  const map = useMap();
  useEffect(() => {
    if (focus) {
      map.setView([focus.latitude, focus.longitude], focus.zoom ?? 8);
      return;
    }
    const coords: LatLngExpression[] = [];
    for (const layer of layers) {
      for (const f of layer.features) {
        const [lng, lat] = f.geometry.coordinates;
        coords.push([lat, lng]);
      }
    }
    if (coords.length === 0) return;
    if (coords.length === 1) {
      map.setView(coords[0], 10);
      return;
    }
    const bounds = coords as LatLngBoundsExpression;
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 12 });
  }, [map, layers, focus]);
  return null;
}

export default function SageAiMapInner({ layers, focus }: InnerMapProps) {
  useEffect(() => {
    ensureLeafletCss();
  }, []);
  // Lazy-init center: if focus present use it, else fall back to CONUS-ish.
  const initialCenter: LatLngExpression = focus
    ? [focus.latitude, focus.longitude]
    : [39.5, -98.35];
  const initialZoom = focus?.zoom ?? 4;

  return (
    <MapContainer
      center={initialCenter}
      zoom={initialZoom}
      style={{ height: 360, width: '100%' }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitToFeatures layers={layers} focus={focus} />
      {layers.map((layer) =>
        layer.features.map((f, i) => {
          const [lng, lat] = f.geometry.coordinates;
          return (
            <CircleMarker
              key={`${layer.id}-${f.id ?? i}`}
              center={[lat, lng]}
              radius={7}
              pathOptions={{
                color: layer.colorHex,
                fillColor: layer.colorHex,
                fillOpacity: 0.75,
                weight: 1,
              }}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold text-gray-900">
                    {f.properties.name}
                  </div>
                  {f.properties.subtitle && (
                    <div className="text-xs text-gray-600">
                      {f.properties.subtitle}
                    </div>
                  )}
                  {f.properties.value != null && (
                    <div className="mt-1 text-xs">
                      <span className="text-gray-500">Value: </span>
                      <span className="font-medium">
                        {String(f.properties.value)}
                      </span>
                    </div>
                  )}
                  {f.properties.url && (
                    <a
                      href={f.properties.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block text-xs underline"
                      style={{ color: layer.colorHex }}
                    >
                      Open website →
                    </a>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })
      )}
    </MapContainer>
  );
}
