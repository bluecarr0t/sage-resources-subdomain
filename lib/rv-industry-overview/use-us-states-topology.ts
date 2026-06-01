'use client';

import { useEffect, useState } from 'react';
import {
  fetchUsStatesTopology,
  US_STATES_TOPO_URL,
  type UsStatesGeographySource,
} from '@/lib/rv-industry-overview/us-states-topology';

export function useUsStatesTopology(): {
  geography: UsStatesGeographySource;
  ready: boolean;
} {
  const [geography, setGeography] = useState<UsStatesGeographySource>(US_STATES_TOPO_URL);

  useEffect(() => {
    let cancelled = false;
    fetchUsStatesTopology()
      .then((topo) => {
        if (!cancelled) setGeography(topo);
      })
      .catch(() => {
        /* keep CDN URL fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    geography,
    ready: typeof geography === 'object',
  };
}
