'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { GoogleMap, InfoWindow, Marker } from '@react-google-maps/api';
import { useGoogleMaps } from '@/components/GoogleMapsProvider';
import type { BrandMapPin } from '@/lib/brand-public-pages';
import { EDITORIAL_SECTION_LABEL_CLASS } from '@/components/editorial/EditorialPageShell';

const CONTIGUOUS_US_CENTER = { lat: 39.8283, lng: -98.5795 };
const CONTIGUOUS_US_ZOOM = 4;

const mapContainerStyle = {
  width: '100%',
  height: '420px',
};

type BrandPropertyMapProps = {
  pins: BrandMapPin[];
  locale: string;
  brandName: string;
};

export default function BrandPropertyMap({ pins, locale, brandName }: BrandPropertyMapProps) {
  const { isLoaded, loadError } = useGoogleMaps();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  const activePin = useMemo(
    () => pins.find((p) => p.slug === activeSlug) ?? null,
    [pins, activeSlug]
  );

  const onLoad = useCallback((m: google.maps.Map) => {
    setMap(m);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  useEffect(() => {
    if (!map || !isLoaded || pins.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    for (const pin of pins) {
      bounds.extend({ lat: pin.lat, lng: pin.lng });
    }
    map.fitBounds(bounds, 48);
    const listener = google.maps.event.addListenerOnce(map, 'idle', () => {
      const z = map.getZoom();
      if (z != null && z > 12) map.setZoom(12);
    });
    return () => google.maps.event.removeListener(listener);
  }, [map, isLoaded, pins]);

  if (loadError) {
    return (
      <p className="text-sm font-light text-neutral-600">
        Map unavailable. Browse the property list below.
      </p>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className="flex aspect-[16/10] w-full items-center justify-center border border-sage-200/90 bg-neutral-100/40 text-sm font-light text-neutral-500"
        aria-busy="true"
      >
        Loading map…
      </div>
    );
  }

  if (pins.length === 0) {
    return (
      <p className="text-sm font-light text-neutral-600">
        No mapped coordinates for {brandName} locations yet.
      </p>
    );
  }

  return (
    <section aria-labelledby="brand-map-heading">
      <h2 id="brand-map-heading" className={EDITORIAL_SECTION_LABEL_CLASS}>
        Locations map
      </h2>
      <div className="mt-4 overflow-hidden border border-sage-200/90 bg-neutral-100/30">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={CONTIGUOUS_US_CENTER}
          zoom={CONTIGUOUS_US_ZOOM}
          onLoad={onLoad}
          onUnmount={onUnmount}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
          }}
        >
          {pins.map((pin) => (
            <Marker
              key={pin.slug}
              position={{ lat: pin.lat, lng: pin.lng }}
              title={pin.propertyName}
              onClick={() => setActiveSlug(pin.slug)}
            />
          ))}
          {activePin ? (
            <InfoWindow
              position={{ lat: activePin.lat, lng: activePin.lng }}
              onCloseClick={() => setActiveSlug(null)}
            >
              <div className="max-w-[12rem] p-1 text-sm">
                <p className="font-medium text-neutral-900">{activePin.propertyName}</p>
                <Link
                  href={`/${locale}/property/${activePin.slug}`}
                  className="mt-2 inline-block text-sage-teal-text underline underline-offset-2"
                >
                  View property →
                </Link>
              </div>
            </InfoWindow>
          ) : null}
        </GoogleMap>
      </div>
      <p className="mt-2 text-[11px] font-light text-neutral-500">
        {pins.length} {pins.length === 1 ? 'location' : 'locations'} with coordinates in Sage data.
      </p>
    </section>
  );
}
