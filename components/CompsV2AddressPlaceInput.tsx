'use client';

import { useRef, useEffect } from 'react';
import { useGoogleMaps } from '@/components/GoogleMapsProvider';

export interface ParsedPlaceComponents {
  formattedAddress: string;
  address1?: string;
  city?: string;
  state?: string;
  zip?: string;
  /** Present when the user picked a suggestion with geometry (Places). */
  lat?: number;
  lng?: number;
}

interface CompsV2AddressPlaceInputProps {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onPlaceParsed?: (parsed: ParsedPlaceComponents) => void;
  placeholder?: string;
  loadingHint?: string;
  noApiKeyHint?: string;
  loadErrorHint?: string;
  suggestionsHint?: string;
}

function parseAddressComponents(
  components: google.maps.GeocoderAddressComponent[] | undefined
): Omit<ParsedPlaceComponents, 'formattedAddress'> {
  if (!components?.length) return {};
  let streetNumber = '';
  let route = '';
  let city = '';
  let state = '';
  let zip = '';
  for (const c of components) {
    if (c.types.includes('street_number')) streetNumber = c.long_name;
    else if (c.types.includes('route')) route = c.long_name;
    else if (c.types.includes('locality')) city = c.long_name;
    else if (c.types.includes('sublocality') || c.types.includes('sublocality_level_1')) {
      if (!city) city = c.long_name;
    } else if (c.types.includes('administrative_area_level_1')) state = c.short_name;
    else if (c.types.includes('postal_code')) zip = c.long_name;
  }
  const address1 = [streetNumber, route].filter(Boolean).join(' ').trim();
  return {
    ...(address1 ? { address1 } : {}),
    ...(city ? { city } : {}),
    ...(state ? { state } : {}),
    ...(zip ? { zip } : {}),
  };
}

/** Ensure Places dropdown appears above admin sidebars/modals */
function ensurePacZIndex() {
  const styleId = 'comps-v2-pac-z-index';
  if (typeof document === 'undefined' || document.getElementById(styleId)) return;
  const el = document.createElement('style');
  el.id = styleId;
  el.textContent = '.pac-container { z-index: 20000 !important; }';
  document.head.appendChild(el);
}

/**
 * Google Places Autocomplete for address / place (requires GoogleMapsProvider + Places library).
 */
export default function CompsV2AddressPlaceInput({
  id = 'comps-v2-location-line',
  label,
  value,
  onChange,
  onPlaceParsed,
  placeholder,
  loadingHint,
  noApiKeyHint,
  loadErrorHint,
  suggestionsHint,
}: CompsV2AddressPlaceInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const acRef = useRef<google.maps.places.Autocomplete | null>(null);
  const onParsedRef = useRef(onPlaceParsed);
  const { isLoaded, loadError } = useGoogleMaps();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();

  useEffect(() => {
    onParsedRef.current = onPlaceParsed;
  }, [onPlaceParsed]);

  useEffect(() => {
    if (isLoaded && apiKey && !loadError) ensurePacZIndex();
  }, [isLoaded, apiKey, loadError]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input || !isLoaded || loadError || !apiKey || typeof window === 'undefined' || !window.google?.maps?.places) {
      return;
    }

    if (acRef.current) {
      google.maps.event.clearInstanceListeners(acRef.current);
      acRef.current = null;
    }

    const ac = new google.maps.places.Autocomplete(input, {
      fields: ['formatted_address', 'address_components', 'geometry', 'name'],
      componentRestrictions: { country: ['us', 'ca'] },
    });

    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      const formatted = place.formatted_address ?? place.name ?? input.value;
      onChange(formatted);

      const parsed = parseAddressComponents(place.address_components);
      const loc = place.geometry?.location;
      const lat = loc?.lat();
      const lng = loc?.lng();
      onParsedRef.current?.({
        formattedAddress: formatted,
        ...parsed,
        ...(typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng)
          ? { lat, lng }
          : {}),
      });
    });

    acRef.current = ac;

    return () => {
      if (acRef.current) {
        google.maps.event.clearInstanceListeners(acRef.current);
        acRef.current = null;
      }
    };
  }, [isLoaded, loadError, apiKey, onChange]);

  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== value) {
      inputRef.current.value = value;
    }
  }, [value]);

  const inputClass =
    'w-full border rounded-md px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-700';

  if (!apiKey) {
    return (
      <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
          {label}
        </label>
        <input
          id={id}
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputClass}
          autoComplete="street-address"
        />
        {noApiKeyHint ? <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">{noApiKeyHint}</p> : null}
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
          {label}
        </label>
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputClass}
          autoComplete="street-address"
        />
        {loadErrorHint ? (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">{loadErrorHint}</p>
        ) : null}
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
          {label}
        </label>
        <div className="h-10 rounded-md bg-gray-100 dark:bg-gray-800 animate-pulse" aria-busy="true" />
        {loadingHint ? <p className="text-xs text-gray-500 mt-1">{loadingHint}</p> : null}
      </div>
    );
  }

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
        {label}
      </label>
      <input
        id={id}
        ref={inputRef}
        type="text"
        defaultValue={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
        autoComplete="off"
      />
      {suggestionsHint ? (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{suggestionsHint}</p>
      ) : null}
    </div>
  );
}
