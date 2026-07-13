'use client';

import { useEffect, useMemo, useState } from 'react';

export type GlampingMarketOverviewSectionNavItem = {
  id: string;
  label: string;
};

const BASE_ITEMS: GlampingMarketOverviewSectionNavItem[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'map', label: 'Map' },
  { id: 'unit-type-by-rate', label: 'Unit Type by Rate' },
  { id: 'amenity-impact', label: 'Amenity Impact' },
  { id: 'national-parks-analysis', label: 'National Parks Analysis' },
  { id: 'transportation-analysis', label: 'Transportation Analysis' },
];

export type GlampingMarketOverviewSectionNavProps = {
  /** National Parks section is US-only. */
  showNationalParks?: boolean;
  /** Amenity Impact section is US-only. */
  showAmenityImpact?: boolean;
};

/**
 * Sticky left section jump links for `/glamping-market-overview`.
 * Highlights the section currently nearest the top of the viewport.
 */
export function GlampingMarketOverviewSectionNav({
  showNationalParks = true,
  showAmenityImpact = true,
}: GlampingMarketOverviewSectionNavProps) {
  const items = useMemo(
    () =>
      BASE_ITEMS.filter((item) => {
        if (!showNationalParks && item.id === 'national-parks-analysis') return false;
        if (!showAmenityImpact && item.id === 'amenity-impact') return false;
        return true;
      }),
    [showNationalParks, showAmenityImpact]
  );

  const [activeId, setActiveId] = useState(items[0]?.id ?? 'overview');

  useEffect(() => {
    document.documentElement.classList.add('scroll-smooth');
    return () => {
      document.documentElement.classList.remove('scroll-smooth');
    };
  }, []);

  useEffect(() => {
    const elements = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el != null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) =>
              (a.boundingClientRect.top ?? 0) - (b.boundingClientRect.top ?? 0)
          );
        const top = visible[0]?.target;
        if (top?.id) setActiveId(top.id);
      },
      {
        // Prefer the section sitting just under the sticky header band.
        rootMargin: '-20% 0px -55% 0px',
        threshold: [0, 0.1, 0.25],
      }
    );

    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav
      aria-label="Page sections"
      className="fixed left-4 top-24 z-20 hidden w-40 lg:block xl:left-6 xl:w-44"
    >
      <p className="text-[10px] uppercase tracking-widest text-neutral-500">
        On this page
      </p>
      <ul className="mt-3 space-y-1 border-l border-sage-200">
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className={`-ml-px block border-l-2 py-1.5 pl-3 text-[11px] leading-snug transition-colors ${
                  active
                    ? 'border-sage-700 font-medium text-sage-800'
                    : 'border-transparent text-neutral-500 hover:border-sage-300 hover:text-neutral-800'
                }`}
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
