'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { useGoogleMaps } from '@/components/GoogleMapsProvider';
import { buildCompsV2GeocodeQuery } from '@/lib/comps-v2/build-geocode-query';

const MAP_HEIGHT_PX = 520;

const mapContainerStyle = {
  width: '100%',
  height: `${MAP_HEIGHT_PX}px`,
};

const CONTIGUOUS_US_CENTER = { lat: 39.8283, lng: -98.5795 };
const CONTIGUOUS_US_ZOOM = 4;

const MILES_TO_METERS = 1609.34;

const nativeCircleOptions: google.maps.CircleOptions = {
  fillColor: '#4a624a',
  fillOpacity: 0.14,
  strokeColor: '#2d3d2d',
  strokeOpacity: 0.95,
  strokeWeight: 2,
  clickable: false,
};

interface CompsV2DiscoveryMapColumnProps {
  locationLine: string;
  /** When set (e.g. Google Place selection), pin + circle use this immediately; geocode fallback is skipped. */
  placeAnchor: { lat: number; lng: number } | null;
  radiusMiles: number;
  onRadiusChange: (miles: number) => void;
}

export default function CompsV2DiscoveryMapColumn({
  locationLine,
  placeAnchor,
  radiusMiles,
  onRadiusChange,
}: CompsV2DiscoveryMapColumnProps) {
  const t = useTranslations('admin.compsV2');
  const { isLoaded, loadError } = useGoogleMaps();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [geocodeAnchor, setGeocodeAnchor] = useState<{ lat: number; lng: number } | null>(null);
  const radiusCircleRef = useRef<google.maps.Circle | null>(null);

  const mapAnchor = placeAnchor ?? geocodeAnchor;

  useEffect(() => {
    if (placeAnchor) {
      return;
    }
    if (!isLoaded || loadError || typeof window === 'undefined' || !window.google?.maps?.Geocoder) {
      return;
    }

    const query = buildCompsV2GeocodeQuery(locationLine);
    if (!query) {
      setGeocodeAnchor(null);
      return;
    }

    const handle = window.setTimeout(() => {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address: query }, (results, status) => {
        if (status !== 'OK' || !results?.[0]?.geometry?.location) {
          setGeocodeAnchor(null);
          return;
        }
        const loc = results[0].geometry.location;
        setGeocodeAnchor({ lat: loc.lat(), lng: loc.lng() });
      });
    }, 550);

    return () => window.clearTimeout(handle);
  }, [locationLine, placeAnchor, isLoaded, loadError]);

  const onLoad = useCallback((m: google.maps.Map) => {
    setMap(m);
  }, []);

  const onUnmount = useCallback(() => {
    radiusCircleRef.current?.setMap(null);
    radiusCircleRef.current = null;
    setMap(null);
  }, []);

  /** Single native Circle: update radius/center in place so the slider does not stack overlays. */
  useEffect(() => {
    if (!map || !isLoaded) return;

    if (!mapAnchor) {
      radiusCircleRef.current?.setMap(null);
      radiusCircleRef.current = null;
      map.setCenter(CONTIGUOUS_US_CENTER);
      map.setZoom(CONTIGUOUS_US_ZOOM);
      return;
    }

    const radiusMeters = radiusMiles * MILES_TO_METERS;
    let circle = radiusCircleRef.current;
    if (!circle) {
      circle = new google.maps.Circle({
        map,
        center: mapAnchor,
        radius: radiusMeters,
        ...nativeCircleOptions,
      });
      radiusCircleRef.current = circle;
    } else {
      circle.setMap(map);
      circle.setCenter(mapAnchor);
      circle.setRadius(radiusMeters);
    }

    const b = circle.getBounds();
    if (b) {
      map.fitBounds(b, { top: 20, right: 20, bottom: 20, left: 20 });
    } else {
      map.setCenter(mapAnchor);
      map.setZoom(8);
    }
  }, [map, mapAnchor, radiusMiles, isLoaded]);

  useEffect(() => {
    return () => {
      radiusCircleRef.current?.setMap(null);
      radiusCircleRef.current = null;
    };
  }, []);

  if (loadError) {
    return (
      <div className="flex flex-col gap-3 flex-1 min-h-0">
        <div>
          <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
            {t('radiusMiles')}
          </label>
          <input
            type="range"
            min={10}
            max={400}
            step={5}
            value={radiusMiles}
            onChange={(e) => onRadiusChange(Number(e.target.value))}
            className="w-full h-2 accent-[#4a624a] cursor-pointer"
            aria-valuemin={10}
            aria-valuemax={400}
            aria-valuenow={radiusMiles}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {radiusMiles} {t('milesAbbrev')}
          </p>
        </div>
        <div
          className="flex flex-1 items-center justify-center rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-sm px-4 text-center"
          style={{ minHeight: MAP_HEIGHT_PX }}
        >
          {t('previewMapLoadError')}
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex flex-col gap-3 flex-1 min-h-0">
        <div>
          <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
            {t('radiusMiles')}
          </label>
          <div className="h-2 w-full rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <p className="text-xs text-gray-500 mt-2">{t('previewMapLoading')}</p>
        </div>
        <div
          className="rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse"
          style={{ height: MAP_HEIGHT_PX }}
          aria-busy="true"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      <div>
        <label htmlFor="comps-v2-radius-slider" className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
          {t('radiusMiles')}
        </label>
        <input
          id="comps-v2-radius-slider"
          type="range"
          min={10}
          max={400}
          step={5}
          value={radiusMiles}
          onChange={(e) => onRadiusChange(Number(e.target.value))}
          className="w-full h-2 accent-[#4a624a] cursor-pointer"
          aria-valuemin={10}
          aria-valuemax={400}
          aria-valuenow={radiusMiles}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {radiusMiles} {t('milesAbbrev')}
        </p>
      </div>

      <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shrink-0">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={mapAnchor ?? CONTIGUOUS_US_CENTER}
          zoom={CONTIGUOUS_US_ZOOM}
          onLoad={onLoad}
          onUnmount={onUnmount}
          options={{
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: true,
          }}
        >
          {mapAnchor ? <Marker position={mapAnchor} /> : null}
        </GoogleMap>
      </div>

      {!mapAnchor ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">{t('previewMapEnterLocation')}</p>
      ) : null}
    </div>
  );
}
