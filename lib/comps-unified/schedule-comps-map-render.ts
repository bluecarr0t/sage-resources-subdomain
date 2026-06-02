import { COMPS_MAP_RENDER_DEBOUNCE_MS } from '@/lib/comps-unified/comps-map-supercluster-options';

export type CompsMapRenderScheduler = {
  schedule: (immediate?: boolean) => void;
  cancel: () => void;
  flush: () => void;
};

/** Coalesce map idle/drag events — one marker sync per animation frame + short debounce. */
export function createCompsMapRenderScheduler(run: () => void): CompsMapRenderScheduler {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let rafId: number | null = null;

  const cancel = () => {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  const flush = () => {
    cancel();
    run();
  };

  const schedule = (immediate = false) => {
    if (immediate) {
      flush();
      return;
    }
    if (rafId !== null) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      if (debounceTimer !== null) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        run();
      }, COMPS_MAP_RENDER_DEBOUNCE_MS);
    });
  };

  return { schedule, cancel, flush };
}
