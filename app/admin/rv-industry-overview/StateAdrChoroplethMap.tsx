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
  GLAMPING_STATE_ADR_CHOROPLETH_MIN_N,
  STATE_ADR_CHOROPLETH_MIN_N,
  type StateAdrChoroplethEntry,
} from '@/lib/rv-industry-overview/campspot-rv-map-data';
import {
  adrChoroplethFill,
  deriveGlampingAdrColorRange,
  legendTickValues,
  normalizeStateAdrChoroplethEntry,
  normalizeStateAdrChoroplethMap,
  stateAdrChoroplethDisplayKind,
  type StateAdrChoroplethDisplayKind,
} from '@/lib/rv-industry-overview/state-adr-choropleth-display';
import {
  ALASKA_ALBERS_INSET_NUDGE,
  EXCLUDE_FROM_MAP_ABBR,
  fullStateNameToUspsAbbr,
  getRvIndustryRegionForStateAbbr,
  hawaiiInsetSlotInnerStyle,
  hawaiiInsetSlotOuterStyle,
} from '@/lib/rv-industry-overview/us-rv-regions';
import { US_STATE_NAMES } from '@/lib/us-states';
import { useUsStatesTopology } from '@/lib/rv-industry-overview/use-us-states-topology';

const MAP_W = 960;
const MAP_H = 580;
const HAWAII_INSET_W = 124;
const HAWAII_INSET_H = 80;

const ADR_COLOR_LO_RV = 40;
const ADR_COLOR_HI_RV = 80;

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

function stateDisplayName(abbr: string): string {
  return US_STATE_NAMES[abbr as keyof typeof US_STATE_NAMES] ?? abbr;
}

function fillForKind(
  kind: StateAdrChoroplethDisplayKind,
  meanAdr: number | null,
  colorLo: number,
  colorHi: number
): string {
  if (kind === 'na') return '#e5e7eb';
  if (kind === 'insufficient') return '#d1d5db';
  if (meanAdr == null) return '#e5e7eb';
  return adrChoroplethFill(meanAdr, colorLo, colorHi);
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
  productVariant?: 'rv' | 'glamping';
};

export default function StateAdrChoroplethMap({
  byStateAdr,
  productVariant = 'rv',
}: Props) {
  const { geography } = useUsStatesTopology();
  const t = useTranslations(
    productVariant === 'glamping'
      ? 'admin.glampingIndustryOverview.stateAdrChoropleth'
      : 'admin.rvIndustryOverview.stateAdrChoropleth'
  );
  const minN =
    productVariant === 'glamping'
      ? GLAMPING_STATE_ADR_CHOROPLETH_MIN_N
      : STATE_ADR_CHOROPLETH_MIN_N;

  const byState = useMemo(
    () => normalizeStateAdrChoroplethMap(byStateAdr),
    [byStateAdr]
  );

  const { colorLo, colorHi } = useMemo(() => {
    if (productVariant === 'glamping') {
      return deriveGlampingAdrColorRange(byState, minN);
    }
    return { colorLo: ADR_COLOR_LO_RV, colorHi: ADR_COLOR_HI_RV };
  }, [byState, minN, productVariant]);

  const legendTicks = useMemo(
    () =>
      legendTickValues(colorLo, colorHi).map((v) => ({
        v,
        label: t('legendTick', { n: v }),
      })),
    [colorLo, colorHi, t]
  );

  const calloutRows = useMemo(() => {
    return CALLOUT_STATE_ORDER.map((abbr) => {
      const entry = normalizeStateAdrChoroplethEntry(byState[abbr]);
      const kind = stateAdrChoroplethDisplayKind(entry, minN);
      let valueLabel: string;
      if (kind === 'na') valueLabel = t('na');
      else if (kind === 'insufficient') valueLabel = t('insufficientData');
      else valueLabel = `$${Math.round(entry.meanAdr!)}`;
      return { abbr, name: stateDisplayName(abbr), valueLabel, kind };
    });
  }, [byState, minN, t]);

  return (
    <div className="rounded-lg bg-white px-3 py-4 sm:px-5 sm:py-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <div className="relative min-w-0 flex-1 overflow-visible rounded-lg bg-white pb-3">
          <ComposableMap
            projection="geoAlbersUsa"
            width={MAP_W}
            height={MAP_H}
            className="w-full h-auto max-h-[min(70vh,640px)] [&_.rsm-geography]:outline-none"
          >
            <Geographies
              geography={geography}
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
                    const entry = abbr ? normalizeStateAdrChoroplethEntry(byState[abbr]) : null;
                    const kind =
                      entry && inRegion
                        ? stateAdrChoroplethDisplayKind(entry, minN)
                        : ('na' as StateAdrChoroplethDisplayKind);
                    const fill = inRegion
                      ? fillForKind(kind, entry?.meanAdr ?? null, colorLo, colorHi)
                      : '#d1d5db';
                    if (!abbr) return null;
                    if (abbr === 'AK') {
                      return (
                        <g
                          key={geo.rsmKey}
                          transform={`translate(${ALASKA_ALBERS_INSET_NUDGE.x}, ${ALASKA_ALBERS_INSET_NUDGE.y})`}
                        >
                          <Geography geography={geo} style={geographyChoroStyle(fill)} />
                        </g>
                      );
                    }
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
                    const entry = normalizeStateAdrChoroplethEntry(byState[abbr]);
                    const kind = stateAdrChoroplethDisplayKind(entry, minN);
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
                      const labelEl = (
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
                      );
                      return (
                        <Marker key={`lbl-${geo.rsmKey}`} coordinates={c as [number, number]}>
                          {abbr === 'AK' ? (
                            <g
                              transform={`translate(${ALASKA_ALBERS_INSET_NUDGE.x}, ${ALASKA_ALBERS_INSET_NUDGE.y})`}
                            >
                              {labelEl}
                            </g>
                          ) : (
                            labelEl
                          )}
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

          <div
            className="pointer-events-none absolute z-10 max-[480px]:bottom-[6%]"
            style={hawaiiInsetSlotOuterStyle(HAWAII_INSET_W)}
          >
            <div
              className="pointer-events-auto w-[min(14vw,132px)] [&_svg]:h-auto [&_svg]:w-full"
              style={hawaiiInsetSlotInnerStyle()}
            >
              <ComposableMap
                projection="geoMercator"
                projectionConfig={{
                  center: [-157.2, 20.2] as [number, number],
                  scale: 4200,
                }}
                width={HAWAII_INSET_W}
                height={HAWAII_INSET_H}
              >
                <Geographies
                  geography={geography}
                  parseGeographies={(geos) => parseOnlyHawaii(geos as GeoJSON.Feature[])}
                >
                  {({ geographies }) => (
                    <>
                      {geographies.map((geo) => {
                        const entry = normalizeStateAdrChoroplethEntry(byState.HI);
                        const kind = stateAdrChoroplethDisplayKind(entry, minN);
                        const fill = fillForKind(kind, entry.meanAdr, colorLo, colorHi);
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
                          const entry = normalizeStateAdrChoroplethEntry(byState.HI);
                          const kind = stateAdrChoroplethDisplayKind(entry, minN);
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
            background: `linear-gradient(to right, ${adrChoroplethFill(colorLo, colorLo, colorHi)}, ${adrChoroplethFill(colorHi, colorLo, colorHi)})`,
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
