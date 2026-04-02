'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from 'react-simple-maps';
import { geoCentroid } from 'd3-geo';
import {
  STATE_ADR_CHOROPLETH_MIN_N,
  type StateAdrChoroplethEntry,
} from '@/lib/rv-industry-overview/campspot-rv-map-data';
import {
  EXCLUDE_FROM_MAP_ABBR,
  fullStateNameToUspsAbbr,
  getRvIndustryRegionForStateAbbr,
} from '@/lib/rv-industry-overview/us-rv-regions';
import { US_STATE_NAMES } from '@/lib/us-states';

const US_STATES_TOPO_URL =
  'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

const MAP_W = 960;
const MAP_H = 580;
const HAWAII_INSET_W = 118;
const HAWAII_INSET_H = 76;

const ADR_COLOR_LO = 40;
const ADR_COLOR_HI = 80;

/** East-coast / small states: labels and leader lines in the right column (order top → bottom). */
const CALLOUT_STATE_ORDER = [
  'NH',
  'VT',
  'MA',
  'RI',
  'CT',
  'NJ',
  'DE',
  'MD',
  'VA',
  'WV',
  'SC',
  'FL',
] as const;

const CALLOUT_SET = new Set<string>(CALLOUT_STATE_ORDER);

type DisplayKind = 'ok' | 'insufficient' | 'na';

function adrToFill(adr: number): string {
  const t = Math.min(
    1,
    Math.max(0, (adr - ADR_COLOR_LO) / (ADR_COLOR_HI - ADR_COLOR_LO))
  );
  const r = Math.round(254 + t * (165 - 254));
  const g = Math.round(229 + t * (15 - 229));
  const b = Math.round(217 + t * (21 - 217));
  return `rgb(${r},${g},${b})`;
}

function stateDisplayName(abbr: string): string {
  return US_STATE_NAMES[abbr as keyof typeof US_STATE_NAMES] ?? abbr;
}

function getEntry(
  byStateAdr: Record<string, StateAdrChoroplethEntry>,
  abbr: string
): StateAdrChoroplethEntry {
  return byStateAdr[abbr] ?? { n: 0, meanAdr: null };
}

function displayKind(
  entry: StateAdrChoroplethEntry,
  minN: number
): DisplayKind {
  if (entry.n === 0) return 'na';
  if (entry.n < minN) return 'insufficient';
  return 'ok';
}

function fillForKind(kind: DisplayKind, meanAdr: number | null): string {
  if (kind === 'na') return '#e5e7eb';
  if (kind === 'insufficient') return '#d1d5db';
  if (meanAdr == null) return '#e5e7eb';
  return adrToFill(meanAdr);
}

function geographyChoroStyle(fill: string) {
  return {
    default: {
      fill,
      stroke: '#ffffff',
      strokeWidth: 0.65,
      outline: 'none' as const,
    },
    hover: {
      fill,
      stroke: '#0f172a',
      strokeWidth: 1.05,
      outline: 'none' as const,
    },
    pressed: {
      fill,
      stroke: '#0f172a',
      strokeWidth: 1.05,
      outline: 'none' as const,
    },
  };
}

function parseOnlyHawaii(geos: GeoJSON.Feature[]) {
  return geos.filter((g) => {
    const name = (g.properties as { name?: string })?.name;
    const abbr = fullStateNameToUspsAbbr(name);
    return abbr === 'HI';
  });
}

type Props = {
  byStateAdr: Record<string, StateAdrChoroplethEntry>;
};

export default function StateAdrChoroplethMap({ byStateAdr }: Props) {
  const t = useTranslations('admin.rvIndustryOverview.stateAdrChoropleth');
  const minN = STATE_ADR_CHOROPLETH_MIN_N;

  const legendTicks = useMemo(
    () => [40, 50, 60, 70, 80].map((v) => ({ v, label: t('legendTick', { n: v }) })),
    [t]
  );

  const calloutRows = useMemo(() => {
    return CALLOUT_STATE_ORDER.map((abbr) => {
      const entry = getEntry(byStateAdr, abbr);
      const kind = displayKind(entry, minN);
      let valueLabel: string;
      if (kind === 'na') valueLabel = t('na');
      else if (kind === 'insufficient') valueLabel = t('insufficientData');
      else valueLabel = `$${Math.round(entry.meanAdr!)}`;
      return { abbr, name: stateDisplayName(abbr), valueLabel, kind };
    });
  }, [byStateAdr, minN, t]);

  return (
    <div className="rounded-lg bg-white px-3 py-4 sm:px-5 sm:py-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <div className="relative min-w-0 flex-1 overflow-hidden rounded-lg bg-white">
          <ComposableMap
            projection="geoAlbersUsa"
            width={MAP_W}
            height={MAP_H}
            className="w-full h-auto max-h-[min(70vh,640px)] [&_.rsm-geography]:outline-none"
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
              {({ geographies, projection }) => (
                <>
                  {geographies.map((geo) => {
                    const name = geo.properties?.name;
                    const abbr = fullStateNameToUspsAbbr(name);
                    const inRegion = abbr
                      ? getRvIndustryRegionForStateAbbr(abbr) != null
                      : false;
                    const entry = abbr ? getEntry(byStateAdr, abbr) : null;
                    const kind =
                      entry && inRegion
                        ? displayKind(entry, minN)
                        : ('na' as DisplayKind);
                    const fill = inRegion
                      ? fillForKind(kind, entry?.meanAdr ?? null)
                      : '#d1d5db';
                    if (!abbr) return null;
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        style={geographyChoroStyle(fill)}
                      />
                    );
                  })}
                  {geographies.map((geo) => {
                    const name = geo.properties?.name;
                    const abbr = fullStateNameToUspsAbbr(name);
                    if (!abbr || CALLOUT_SET.has(abbr)) return null;
                    const inRegion = getRvIndustryRegionForStateAbbr(abbr) != null;
                    if (!inRegion) return null;
                    const entry = getEntry(byStateAdr, abbr);
                    const kind = displayKind(entry, minN);
                    let label: string;
                    if (kind === 'na') label = `${stateDisplayName(abbr)} ${t('na')}`;
                    else if (kind === 'insufficient')
                      label = `${stateDisplayName(abbr)} ${t('insufficientMap')}`;
                    else
                      label = `${stateDisplayName(abbr)} $${Math.round(entry.meanAdr!)}`;
                    try {
                      const c = geoCentroid({
                        type: 'Feature',
                        properties: geo.properties,
                        geometry: geo.geometry as GeoJSON.Geometry,
                      } as GeoJSON.Feature);
                      if (!c || c.length < 2) return null;
                      return (
                        <Marker key={`lbl-${geo.rsmKey}`} coordinates={c as [number, number]}>
                          <text
                            textAnchor="middle"
                            pointerEvents="none"
                            style={{
                              fill: '#111827',
                              fontSize: 8,
                              fontWeight: 600,
                              paintOrder: 'stroke',
                              stroke: 'rgba(255,255,255,0.88)',
                              strokeWidth: 2,
                            }}
                          >
                            {label}
                          </text>
                        </Marker>
                      );
                    } catch {
                      return null;
                    }
                  })}
                  <g pointerEvents="none">
                    {CALLOUT_STATE_ORDER.map((abbr, i) => {
                      const geo = geographies.find((g) => {
                        const n = g.properties?.name;
                        return fullStateNameToUspsAbbr(n) === abbr;
                      });
                      if (!geo) return null;
                      try {
                        const c = geoCentroid({
                          type: 'Feature',
                          properties: geo.properties,
                          geometry: geo.geometry as GeoJSON.Geometry,
                        } as GeoJSON.Feature);
                        if (!c || c.length < 2) return null;
                        const p = projection(c as [number, number]);
                        if (!p) return null;
                        const [x, y] = p;
                        const yEnd = 28 + i * 18;
                        const xEnd = MAP_W - 4;
                        return (
                          <line
                            key={`lead-${abbr}`}
                            x1={x}
                            y1={y}
                            x2={xEnd}
                            y2={yEnd}
                            stroke="#9ca3af"
                            strokeWidth={0.45}
                          />
                        );
                      } catch {
                        return null;
                      }
                    })}
                  </g>
                </>
              )}
            </Geographies>
          </ComposableMap>

          <div className="pointer-events-none absolute z-10 left-[1.25%] bottom-[33%] w-[min(12.5vw,124px)]">
            <div className="pointer-events-auto w-full [&_svg]:h-auto [&_svg]:w-full">
              <ComposableMap
                projection="geoMercator"
                projectionConfig={{
                  center: [-157.35, 20.05] as [number, number],
                  scale: 4400,
                }}
                width={HAWAII_INSET_W}
                height={HAWAII_INSET_H}
              >
                <Geographies
                  geography={US_STATES_TOPO_URL}
                  parseGeographies={(geos) => parseOnlyHawaii(geos as GeoJSON.Feature[])}
                >
                  {({ geographies }) => (
                    <>
                      {geographies.map((geo) => {
                        const entry = getEntry(byStateAdr, 'HI');
                        const kind = displayKind(entry, minN);
                        const fill = fillForKind(kind, entry.meanAdr);
                        return (
                          <Geography
                            key={`hi-${geo.rsmKey}`}
                            geography={geo}
                            style={geographyChoroStyle(fill)}
                          />
                        );
                      })}
                      {geographies.map((geo) => {
                        try {
                          const c = geoCentroid({
                            type: 'Feature',
                            properties: geo.properties,
                            geometry: geo.geometry as GeoJSON.Geometry,
                          } as GeoJSON.Feature);
                          if (!c || c.length < 2) return null;
                          const entry = getEntry(byStateAdr, 'HI');
                          const kind = displayKind(entry, minN);
                          let label: string;
                          if (kind === 'na') label = `HI ${t('na')}`;
                          else if (kind === 'insufficient')
                            label = `HI ${t('insufficientMap')}`;
                          else label = `HI $${Math.round(entry.meanAdr!)}`;
                          return (
                            <Marker key={`hi-lbl-${geo.rsmKey}`} coordinates={c as [number, number]}>
                              <text
                                textAnchor="middle"
                                pointerEvents="none"
                                style={{
                                  fill: '#111827',
                                  fontSize: 7,
                                  fontWeight: 600,
                                  paintOrder: 'stroke',
                                  stroke: 'rgba(255,255,255,0.88)',
                                  strokeWidth: 2,
                                }}
                              >
                                {label}
                              </text>
                            </Marker>
                          );
                        } catch {
                          return null;
                        }
                      })}
                    </>
                  )}
                </Geographies>
              </ComposableMap>
            </div>
          </div>
        </div>

        <div
          className="w-full shrink-0 space-y-1 rounded-md bg-white px-2.5 py-2 lg:w-[200px] lg:self-center"
          aria-label={t('calloutAria')}
        >
          {calloutRows.map((row) => (
            <div
              key={row.abbr}
              className="flex flex-wrap items-baseline justify-between gap-x-1 border-b border-stone-100 pb-1 text-[11px] leading-snug text-gray-900 last:border-b-0 last:pb-0"
            >
              <span className="font-medium">{row.name}</span>
              <span className="tabular-nums text-gray-800">{row.valueLabel}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-col items-center gap-2 px-2">
        <div className="text-center text-xs font-medium text-gray-800">{t('legendLabel')}</div>
        <div
          className="h-3 w-[min(100%,360px)] max-w-md rounded-sm"
          style={{
            background: `linear-gradient(to right, ${adrToFill(ADR_COLOR_LO)}, ${adrToFill(ADR_COLOR_HI)})`,
          }}
          aria-hidden
        />
        <div className="flex w-[min(100%,360px)] max-w-md justify-between text-[10px] tabular-nums text-gray-600">
          {legendTicks.map(({ v, label }) => (
            <span key={v}>{label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
