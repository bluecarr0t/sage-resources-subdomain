'use client';

import { useEffect, useState, type ReactNode } from 'react';

function isCoarsePortrait(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(pointer: coarse)').matches &&
    window.matchMedia('(orientation: portrait)').matches
  );
}

/**
 * Booth tablet shell: blocks pinch-zoom and overscroll, prefers landscape,
 * and asks to rotate when a phone is held upright.
 */
export function QuizKioskShell({ children }: { children: ReactNode }) {
  const [needsRotate, setNeedsRotate] = useState(false);

  useEffect(() => {
    const preventGesture = (event: Event) => {
      event.preventDefault();
    };
    document.addEventListener('gesturestart', preventGesture, { passive: false });
    document.addEventListener('gesturechange', preventGesture, { passive: false });
    document.addEventListener('gestureend', preventGesture, { passive: false });

    const orientation = window.screen?.orientation as
      | (ScreenOrientation & { lock?: (mode: string) => Promise<void> })
      | undefined;
    if (typeof orientation?.lock === 'function') {
      void orientation.lock('landscape').catch(() => undefined);
    }

    const sync = () => setNeedsRotate(isCoarsePortrait());
    sync();
    window.addEventListener('orientationchange', sync);
    window.addEventListener('resize', sync);

    return () => {
      document.removeEventListener('gesturestart', preventGesture);
      document.removeEventListener('gesturechange', preventGesture);
      document.removeEventListener('gestureend', preventGesture);
      window.removeEventListener('orientationchange', sync);
      window.removeEventListener('resize', sync);
    };
  }, []);

  return (
    <div className="relative flex h-dvh min-h-0 flex-col overflow-hidden overscroll-none touch-manipulation">
      {needsRotate ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#faf9f3] px-8 text-center">
          <p className="font-[Georgia] text-2xl font-medium tracking-tight text-sage-800">
            Turn the tablet sideways to continue.
          </p>
        </div>
      ) : null}
      {children}
    </div>
  );
}
