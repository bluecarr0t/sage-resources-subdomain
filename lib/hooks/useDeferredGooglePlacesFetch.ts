'use client';

import { useEffect, useRef, useState } from 'react';
import type { GooglePlacesData } from '@/lib/google-places';

export type DeferredPlacesFetchPhase = 'complete' | 'waiting' | 'loading';

export interface DeferredPlacesFetchParams {
  propertyName: string;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  placeId?: string | null;
}

export interface DeferredPlacesFetchOptions {
  /**
   * When true, fetch only after `explicitLoadRequested` is set (click-to-load).
   * Skips engagement listeners and idle auto-fetch.
   */
  requireExplicitLoad?: boolean;
  explicitLoadRequested?: boolean;
  /**
   * When true (and not waiting on explicit load), fetch on mount instead of
   * waiting for engagement or the idle timer.
   */
  immediate?: boolean;
}

const ENGAGEMENT_EVENTS = ['scroll', 'wheel', 'touchmove', 'pointerdown', 'keydown'] as const;

const IDLE_TIMEOUT_MS = 4500;

/**
 * Defers `/api/google-places` until the user interacts, is idle, explicitly requests
 * Google content, or `immediate` is set — reducing spend from bots and drive-by hits.
 */
export function useDeferredGooglePlacesFetch(
  initialData: GooglePlacesData | null | undefined,
  params: DeferredPlacesFetchParams | null,
  options?: DeferredPlacesFetchOptions
): {
  googlePlacesData: GooglePlacesData | null;
  phase: DeferredPlacesFetchPhase;
} {
  const requireExplicitLoad = options?.requireExplicitLoad ?? false;
  const explicitLoadRequested = options?.explicitLoadRequested ?? false;
  const immediate = options?.immediate ?? false;

  const [googlePlacesData, setGooglePlacesData] = useState<GooglePlacesData | null>(
    initialData ?? null
  );
  const [phase, setPhase] = useState<DeferredPlacesFetchPhase>(
    initialData ? 'complete' : 'waiting'
  );
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (initialData) {
      setGooglePlacesData(initialData);
      setPhase('complete');
      return;
    }

    if (!params?.propertyName) {
      setGooglePlacesData(null);
      setPhase('complete');
      return;
    }

    if (requireExplicitLoad && !explicitLoadRequested) {
      fetchedRef.current = false;
      setGooglePlacesData(null);
      setPhase('waiting');
      return;
    }

    fetchedRef.current = false;
    setGooglePlacesData(null);
    setPhase('waiting');

    let cancelled = false;
    let idleTimer: ReturnType<typeof globalThis.setTimeout> | undefined;

    const queryString = () => {
      const sp = new URLSearchParams({ propertyName: params.propertyName });
      if (params.city) sp.append('city', params.city);
      if (params.state) sp.append('state', params.state);
      if (params.address) sp.append('address', params.address);
      if (params.placeId) sp.append('placeId', params.placeId);
      return sp.toString();
    };

    const detachEngagement = () => {
      for (const ev of ENGAGEMENT_EVENTS) {
        window.removeEventListener(ev, onEngagement, true);
      }
    };

    const cancelIdleTimer = () => {
      if (idleTimer !== undefined) {
        clearTimeout(idleTimer);
        idleTimer = undefined;
      }
    };

    async function runFetch() {
      if (cancelled || fetchedRef.current) return;
      fetchedRef.current = true;
      detachEngagement();
      cancelIdleTimer();
      setPhase('loading');
      try {
        const response = await fetch(`/api/google-places?${queryString()}`);
        if (response.ok) {
          const data = (await response.json()) as GooglePlacesData;
          if (!cancelled) setGooglePlacesData(data);
        }
      } catch {
        /* non-fatal */
      } finally {
        if (!cancelled) setPhase('complete');
      }
    }

    function onEngagement() {
      void runFetch();
    }

    if (requireExplicitLoad || immediate) {
      void runFetch();
    } else {
      for (const ev of ENGAGEMENT_EVENTS) {
        window.addEventListener(ev, onEngagement, { capture: true, passive: true });
      }
      idleTimer = globalThis.setTimeout(() => void runFetch(), IDLE_TIMEOUT_MS);
    }

    return () => {
      cancelled = true;
      detachEngagement();
      cancelIdleTimer();
    };
  }, [
    initialData,
    params?.propertyName,
    params?.city,
    params?.state,
    params?.address,
    params?.placeId,
    requireExplicitLoad,
    explicitLoadRequested,
    immediate,
  ]);

  return { googlePlacesData, phase };
}
