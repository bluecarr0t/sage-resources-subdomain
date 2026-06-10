'use client';

import { useEffect, useState } from 'react';
import type { SageAiServerCapabilities } from '@/lib/sage-ai/server-capabilities';

export function useSageAiServerCapabilities() {
  const [capabilities, setCapabilities] = useState<SageAiServerCapabilities | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/sage-ai/capabilities');
        if (!res.ok) return;
        const json = (await res.json()) as SageAiServerCapabilities;
        if (!cancelled) setCapabilities(json);
      } catch {
        /* optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return capabilities;
}
