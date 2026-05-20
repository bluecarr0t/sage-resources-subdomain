'use client';

import { useEffect, useRef, useState } from 'react';

function easeOutCubic(progress: number): number {
  return 1 - (1 - progress) ** 3;
}

export type CountUpMetricProps = {
  value: number;
  /** Appended after the number (e.g. "+"). */
  suffix?: string;
  className?: string;
  /** Animation duration in milliseconds (default 2500). */
  durationMs?: number;
};

export default function CountUpMetric({
  value,
  suffix = '',
  className,
  durationMs = 2500,
}: CountUpMetricProps) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLParagraphElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setDisplay(value);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || hasAnimated.current) return;
        hasAnimated.current = true;

        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min((now - start) / durationMs, 1);
          setDisplay(Math.round(easeOutCubic(progress) * value));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.15, rootMargin: '0px 0px -5% 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [value, durationMs]);

  return (
    <p ref={ref} className={className} aria-label={`${value}${suffix}`}>
      {display}
      {suffix}
    </p>
  );
}
