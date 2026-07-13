'use client';

import { useCallback, useState } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { trackMapInteraction } from '@/lib/analytics';
import type { GlampingCaProvinceMetricsMap } from '@/lib/fetch-glamping-industry-ca-province-metrics';
import { formatGlampingMarketOverviewRate } from '@/lib/glamping-market-overview-currency';
import {
  CA_PROVINCE_DISPLAY_NAME,
  normalizeCaProvinceToCode,
} from '@/lib/normalize-ca-province-key';

/** Provinces & territories GeoJSON (Click That Hood / Code for America). */
const CANADA_PROVINCES_GEO_URL =
  'https://cdn.jsdelivr.net/gh/codeforamerica/click_that_hood@master/public/data/canada.geojson';

/** Matches US map palette in GlampingIndustryUsMap. */
const SAGE_MAP = {
  fill: '#f6f7f6',
  fillHover: '#e3e7e3',
  fillSelected: '#c7d2c7',
  stroke: '#334033',
} as const;

const MAP_W = 900;
/** Taller than 16:9 so Albers Canada can grow until width and height both fill. */
const MAP_H = 771;

/**
 * Albers params from d3 `fitExtent` for canada.geojson at MAP_W×MAP_H with an
 * 8px inset (aspect matched to the geography so scale is maximized). 
 * react-simple-maps always translates to [width/2, height/2], so we apply
 * FIT_TRANSLATE_NUDGE inside the SVG to match the fitExtent translate.
 */
const CANADA_PROJECTION = {
  rotate: [96, 0, 0] as [number, number, number],
  center: [-0.6, 38.7] as [number, number],
  parallels: [49, 77] as [number, number],
  scale: 1049.307,
};

/** fitExtent translate [376.89, 838.99] − RSM default [MAP_W/2, MAP_H/2] */
const FIT_TRANSLATE_NUDGE = {
  x: 376.89 - MAP_W / 2,
  y: 838.99 - MAP_H / 2,
} as const;

/** Default highlight: British Columbia (largest published cohort in recent snapshots). */
const DEFAULT_SELECTED_PROVINCE = 'BC';

function formatInt(n: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);
}

function provinceLabel(code: string): string {
  return CA_PROVINCE_DISPLAY_NAME[code] ?? code;
}

function provinceCodeFromGeo(geo: { properties?: { name?: string } }): string | null {
  return normalizeCaProvinceToCode(geo.properties?.name);
}

function styleForProvince(code: string, selected: string | null) {
  const isSel = selected === code;
  const fill = isSel ? SAGE_MAP.fillSelected : SAGE_MAP.fill;
  const fillHover = isSel ? SAGE_MAP.fillSelected : SAGE_MAP.fillHover;
  return {
    default: {
      fill,
      stroke: SAGE_MAP.stroke,
      strokeWidth: 0.4,
      outline: 'none' as const,
      cursor: 'pointer' as const,
    },
    hover: {
      fill: fillHover,
      stroke: SAGE_MAP.stroke,
      strokeWidth: 0.75,
      outline: 'none' as const,
      cursor: 'pointer' as const,
    },
    pressed: {
      fill: SAGE_MAP.fillSelected,
      stroke: SAGE_MAP.stroke,
      strokeWidth: 0.75,
      outline: 'none' as const,
      cursor: 'pointer' as const,
    },
  };
}

type Props = {
  byProvince: GlampingCaProvinceMetricsMap;
  /** When true, omit default top margin (page owns spacing for scroll targets). */
  flushTop?: boolean;
};

export default function GlampingIndustryCanadaProvinces({
  byProvince,
  flushTop = false,
}: Props) {
  const [selected, setSelected] = useState<string | null>(
    byProvince[DEFAULT_SELECTED_PROVINCE] ? DEFAULT_SELECTED_PROVINCE : null
  );

  const row = selected ? byProvince[selected] : undefined;

  const onSelect = useCallback((code: string) => {
    setSelected((prev) => {
      const next = prev === code ? null : code;
      trackMapInteraction('region_select', {
        map: 'glamping_market_overview_ca',
        region: code,
        selected: next != null,
      });
      return next;
    });
  }, []);

  return (
    <div
      className={`relative space-y-12 sm:space-y-0 lg:grid lg:grid-cols-[minmax(0,1fr)_240px] lg:items-start lg:gap-x-12${
        flushTop ? '' : ' mt-16 sm:mt-20'
      }`}
    >
      <div className="relative min-w-0">
        <div className="mb-4 space-y-1 text-sm font-medium uppercase tracking-[0.14em] text-neutral-600 sm:text-base">
          <p>Canada map · click a province or territory</p>
          <p className="text-[9px] font-light normal-case tracking-normal text-neutral-500">
            Rates shown in CAD as published by operators
          </p>
        </div>
        <div className="relative mx-auto w-full max-w-[88%]">
          <ComposableMap
            projection="geoAlbers"
            projectionConfig={CANADA_PROJECTION}
            width={MAP_W}
            height={MAP_H}
            className="h-auto w-full max-w-full [&_.rsm-geography]:outline-none"
          >
            <g transform={`translate(${FIT_TRANSLATE_NUDGE.x} ${FIT_TRANSLATE_NUDGE.y})`}>
              <Geographies geography={CANADA_PROVINCES_GEO_URL}>
                {({ geographies }) => (
                  <>
                    {geographies.map((geo) => {
                      const code = provinceCodeFromGeo(geo);
                      if (!code) return null;
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          style={styleForProvince(code, selected)}
                          onClick={() => onSelect(code)}
                          tabIndex={0}
                          aria-label={provinceLabel(code)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onSelect(code);
                            }
                          }}
                        />
                      );
                    })}
                  </>
                )}
              </Geographies>
            </g>
          </ComposableMap>
        </div>
      </div>

      <aside className="border-t border-sage-200 pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
        <div>
          {!selected ? (
            <p className="text-sm font-light leading-relaxed text-neutral-600">
              Select a province or territory on the map for property count, unit count, and average
              retail daily rate.
            </p>
          ) : (
            <div className="space-y-6">
              <h2 className="text-[11px] font-medium uppercase tracking-widest text-neutral-500">
                {provinceLabel(selected)}
              </h2>
              <dl className="space-y-5 text-sm">
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-neutral-500">
                    Property count
                  </dt>
                  <dd className="mt-1 font-light tabular-nums text-2xl tracking-tight text-neutral-900">
                    {formatInt(row?.propertyCount ?? 0)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-neutral-500">
                    Unit count
                  </dt>
                  <dd className="mt-1 font-light tabular-nums text-2xl tracking-tight text-neutral-900">
                    {formatInt(row?.unitCount ?? 0)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-neutral-500">
                    Avg. retail daily rate (ARDR, CAD)
                  </dt>
                  <dd className="mt-1 space-y-0.5 font-light tabular-nums text-lg tracking-tight text-neutral-900">
                    <div>
                      <span className="text-neutral-500">Mean</span>{' '}
                      {formatGlampingMarketOverviewRate(
                        row?.avgRetailDailyRateMean ?? null,
                        'ca'
                      )}
                    </div>
                    <div>
                      <span className="text-neutral-500">Median</span>{' '}
                      {formatGlampingMarketOverviewRate(
                        row?.avgRetailDailyRateMedian ?? null,
                        'ca'
                      )}
                    </div>
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
