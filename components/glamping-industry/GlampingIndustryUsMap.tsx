'use client';

import { useCallback, useState } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import type { GlampingUsStateMetricsMap } from '@/lib/fetch-glamping-industry-us-state-metrics';
import {
  ALASKA_ALBERS_INSET_NUDGE,
  EXCLUDE_FROM_MAP_ABBR,
  fullStateNameToUspsAbbr,
} from '@/lib/rv-industry-overview/us-rv-regions';
import { US_STATE_NAMES } from '@/lib/us-states';

const US_STATES_TOPO_URL =
  'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

/** County polygons give clearer Hawaiian island shapes than the single state feature. */
const US_COUNTIES_TOPO_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json';

const MAP_W = 880;
const MAP_H = 520;
/** Mercator inset for HI only — placed above Alaska (Albers lower-left) so it does not cover AK. */
const HAWAII_INSET_W = 160;
const HAWAII_INSET_H = 96;

function parseHawaiiInsetGeos(geos: GeoJSON.Feature[]) {
  return geos.filter((g) => {
    const id = String((g as unknown as { id?: string | number }).id ?? '');
    if (/^15\d{3}$/.test(id)) return true;
    const geoid = String((g.properties as { GEOID?: string })?.GEOID ?? '');
    if (/^15\d{3}$/.test(geoid)) return true;
    const stateFp = String((g.properties as { STATEFP?: string })?.STATEFP ?? '');
    return stateFp === '15';
  });
}

function stateLabel(abbr: string): string {
  return (US_STATE_NAMES as Record<string, string>)[abbr] ?? abbr;
}

function formatInt(n: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);
}

function formatUsd(n: number | null): string {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function styleForState(abbr: string, selected: string | null) {
  const isSel = selected === abbr;
  const fill = isSel ? '#d4d4d4' : '#fafafa';
  return {
    default: {
      fill,
      stroke: '#0a0a0a',
      strokeWidth: 0.4,
      outline: 'none' as const,
      cursor: 'pointer' as const,
    },
    hover: {
      fill: isSel ? '#d4d4d4' : '#ececec',
      stroke: '#0a0a0a',
      strokeWidth: 0.75,
      outline: 'none' as const,
      cursor: 'pointer' as const,
    },
    pressed: {
      fill: '#d4d4d4',
      stroke: '#0a0a0a',
      strokeWidth: 0.75,
      outline: 'none' as const,
      cursor: 'pointer' as const,
    },
  };
}

/** Slightly heavier strokes for the small Mercator Hawaii inset. */
function styleForHawaiiInset(selected: string | null) {
  const isSel = selected === 'HI';
  const fill = isSel ? '#d4d4d4' : '#fafafa';
  const sw = { default: 0.75, hover: 0.95, pressed: 0.95 } as const;
  return {
    default: {
      fill,
      stroke: '#0a0a0a',
      strokeWidth: sw.default,
      outline: 'none' as const,
      cursor: 'pointer' as const,
      vectorEffect: 'non-scaling-stroke' as const,
    },
    hover: {
      fill: isSel ? '#d4d4d4' : '#ececec',
      stroke: '#0a0a0a',
      strokeWidth: sw.hover,
      outline: 'none' as const,
      cursor: 'pointer' as const,
      vectorEffect: 'non-scaling-stroke' as const,
    },
    pressed: {
      fill: '#d4d4d4',
      stroke: '#0a0a0a',
      strokeWidth: sw.pressed,
      outline: 'none' as const,
      cursor: 'pointer' as const,
      vectorEffect: 'non-scaling-stroke' as const,
    },
  };
}

type Props = { byState: GlampingUsStateMetricsMap };

export default function GlampingIndustryUsMap({ byState }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const row = selected ? byState[selected] : undefined;

  const onSelect = useCallback((abbr: string) => {
    setSelected((prev) => (prev === abbr ? null : abbr));
  }, []);

  return (
    <div className="relative mt-16 space-y-12 sm:mt-20 lg:space-y-0 lg:pr-[calc(220px+3rem)]">
      <div className="relative min-w-0 overflow-visible">
        <div className="mb-4 space-y-1 text-[10px] uppercase tracking-[0.25em] text-neutral-400">
          <p>United States map · click a state</p>
          <p className="text-[9px] font-light normal-case tracking-normal text-neutral-400">
            Alaska lower left · Hawaii inset lower left, west of the lower 48
          </p>
        </div>
        <ComposableMap
          projection="geoAlbersUsa"
          width={MAP_W}
          height={MAP_H}
          className="h-auto w-full max-w-full [&_.rsm-geography]:outline-none"
        >
          <Geographies
            geography={US_STATES_TOPO_URL}
            parseGeographies={(geos) =>
              (geos as GeoJSON.Feature[]).filter((g) => {
                const name = (g.properties as { name?: string })?.name;
                const abbr = fullStateNameToUspsAbbr(name);
                if (!abbr) return false;
                if (EXCLUDE_FROM_MAP_ABBR.has(abbr)) return false;
                return true;
              })
            }
          >
            {({ geographies }) => (
              <>
                {geographies.map((geo) => {
                  const name = geo.properties?.name;
                  const abbr = fullStateNameToUspsAbbr(name);
                  if (!abbr) return null;
                  if (abbr === 'AK') {
                    return (
                      <g
                        key={geo.rsmKey}
                        className="pointer-events-auto"
                        transform={`translate(${ALASKA_ALBERS_INSET_NUDGE.x}, ${ALASKA_ALBERS_INSET_NUDGE.y})`}
                      >
                        <Geography
                          geography={geo}
                          style={styleForState(abbr, selected)}
                          onClick={() => onSelect(abbr)}
                          tabIndex={0}
                          aria-label={stateLabel(abbr)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onSelect(abbr);
                            }
                          }}
                        />
                      </g>
                    );
                  }
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      style={styleForState(abbr, selected)}
                      onClick={() => onSelect(abbr)}
                      tabIndex={0}
                      aria-label={stateLabel(abbr)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelect(abbr);
                        }
                      }}
                    />
                  );
                })}
              </>
            )}
          </Geographies>
        </ComposableMap>

        <div className="pointer-events-none absolute bottom-[8%] left-0 z-10 w-[min(26vw,160px)] -translate-x-16 sm:bottom-[11%] sm:-translate-x-32 md:bottom-[13%] md:-translate-x-44 lg:-translate-x-56">
          <div className="w-full [&_svg]:pointer-events-none [&_svg]:h-auto [&_svg]:w-full [&_path.rsm-geography]:pointer-events-auto">
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{
                center: [-157.25, 20.35] as [number, number],
                scale: 6700,
              }}
              width={HAWAII_INSET_W}
              height={HAWAII_INSET_H}
              className="[&_.rsm-geography]:outline-none"
            >
              <Geographies
                geography={US_COUNTIES_TOPO_URL}
                parseGeographies={(geos) => parseHawaiiInsetGeos(geos as GeoJSON.Feature[])}
              >
                {({ geographies }) => (
                  <>
                    {geographies.map((geo) => (
                      <Geography
                        key={`hi-${geo.rsmKey}`}
                        geography={geo}
                        style={styleForHawaiiInset(selected)}
                        onClick={() => onSelect('HI')}
                        tabIndex={0}
                        aria-label={stateLabel('HI')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onSelect('HI');
                          }
                        }}
                      />
                    ))}
                  </>
                )}
              </Geographies>
            </ComposableMap>
          </div>
        </div>
      </div>

      <aside className="border-t border-neutral-200 pt-6 lg:absolute lg:inset-y-0 lg:right-0 lg:mt-0 lg:flex lg:min-h-0 lg:w-[220px] lg:flex-col lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
        <div className="min-h-0 flex-1 overflow-y-auto lg:min-h-0">
          {!selected ? (
            <p className="text-xs font-light leading-relaxed text-neutral-500">
              Select a state on the map for property count, site count, and average retail daily rate.
            </p>
          ) : (
            <div className="space-y-6">
              <h2 className="text-[11px] font-medium uppercase tracking-widest text-neutral-400">
                {stateLabel(selected)}
              </h2>
              <dl className="space-y-5 text-sm">
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-neutral-400">
                    Property count
                  </dt>
                  <dd className="mt-1 font-light tabular-nums text-2xl tracking-tight text-neutral-900">
                    {formatInt(row?.propertyCount ?? 0)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-neutral-400">
                    Site count
                  </dt>
                  <dd className="mt-1 font-light tabular-nums text-2xl tracking-tight text-neutral-900">
                    {formatInt(row?.siteCount ?? 0)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-neutral-400">
                    Avg. retail daily rate
                  </dt>
                  <dd className="mt-1 space-y-0.5 font-light tabular-nums text-lg tracking-tight text-neutral-900">
                    <div>
                      <span className="text-neutral-400">Mean</span>{' '}
                      {formatUsd(row?.avgRetailDailyRateMean ?? null)}
                    </div>
                    <div>
                      <span className="text-neutral-400">Median</span>{' '}
                      {formatUsd(row?.avgRetailDailyRateMedian ?? null)}
                    </div>
                  </dd>
                  <p className="mt-2 text-[10px] leading-relaxed text-neutral-400">
                    From operating properties with a recorded rate.
                  </p>
                </div>
              </dl>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
