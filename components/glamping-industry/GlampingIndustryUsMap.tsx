'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { trackMapInteraction } from '@/lib/analytics';
import type { GlampingUsStateMetricsMap } from '@/lib/fetch-glamping-industry-us-state-metrics';
import {
  pipelineMapStateDetailPath,
  pipelineUsStateHighlightForFilter,
  type PipelineMapStageFilter,
  type PipelineUsStateHighlight,
} from '@/lib/pipeline-quarterly/us-state-pipeline-highlight';
import {
  PIPELINE_BOTH_STAGES_COLORS,
  PIPELINE_PROPOSED_COLORS,
  PIPELINE_UNDER_CONSTRUCTION_COLORS,
} from '@/lib/pipeline-quarterly/stage-colors';
import {
  buildPipelineMapGradientRanges,
  pipelineMapGradientFill,
  pipelineMapGradientRamp,
  pipelineMapPropertyCount,
  type PipelineMapGradientRanges,
} from '@/lib/pipeline-quarterly/pipeline-map-gradient';
import {
  ALASKA_ALBERS_INSET_NUDGE,
  EXCLUDE_FROM_MAP_ABBR,
  fullStateNameToUspsAbbr,
} from '@/lib/rv-industry-overview/us-rv-regions';
import { US_STATE_NAMES } from '@/lib/us-states';

const US_STATES_TOPO_URL =
  'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

/** Sage Outdoor Advisory — matches `theme.extend.colors.sage` in tailwind.config.ts */
const SAGE_MAP = {
  fill: '#f6f7f6',
  fillHover: '#e3e7e3',
  fillSelected: '#c7d2c7',
  stroke: '#334033',
} as const;

const MAP_W = 880;
const MAP_H = 520;

export type GlampingIndustryUsMapVariant = 'market-overview' | 'pipeline-quarterly';

/** Default highlighted state on first paint (United States glamping market overview). */
const DEFAULT_MARKET_OVERVIEW_SELECTED_STATE_ABBR = 'TX';

const PIPELINE_MAP_COLORS: Record<
  PipelineUsStateHighlight,
  { fill: string; fillHover: string; fillSelected: string }
> = {
  none: {
    fill: SAGE_MAP.fill,
    fillHover: SAGE_MAP.fillHover,
    fillSelected: SAGE_MAP.fillSelected,
  },
  proposed: {
    fill: PIPELINE_PROPOSED_COLORS.mapFill,
    fillHover: PIPELINE_PROPOSED_COLORS.mapFillHover,
    fillSelected: PIPELINE_PROPOSED_COLORS.mapFillSelected,
  },
  under_construction: {
    fill: PIPELINE_UNDER_CONSTRUCTION_COLORS.mapFill,
    fillHover: PIPELINE_UNDER_CONSTRUCTION_COLORS.mapFillHover,
    fillSelected: PIPELINE_UNDER_CONSTRUCTION_COLORS.mapFillSelected,
  },
  both: {
    fill: PIPELINE_BOTH_STAGES_COLORS.mapFill,
    fillHover: PIPELINE_BOTH_STAGES_COLORS.mapFillHover,
    fillSelected: PIPELINE_BOTH_STAGES_COLORS.mapFillSelected,
  },
};
/** Mercator inset for HI only — placed left of Alaska (Albers lower-left) so it does not cover AK. */
const HAWAII_INSET_W = 80;
const HAWAII_INSET_H = 46;
/** Centroid + scale fit the full island chain inside HAWAII_INSET_* (scale 1400 clipped Kauai). */
const HAWAII_INSET_PROJECTION = {
  center: [-156.34, 20.25] as [number, number],
  scale: 520,
};

function parseHawaiiStateGeo(geos: GeoJSON.Feature[]) {
  return geos.filter((g) => {
    const name = (g.properties as { name?: string })?.name;
    return fullStateNameToUspsAbbr(name) === 'HI';
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

function stateFillColors(
  abbr: string,
  selected: string | null,
  variant: GlampingIndustryUsMapVariant,
  byState: GlampingUsStateMetricsMap,
  stageFilter: PipelineMapStageFilter,
  gradientRanges: PipelineMapGradientRanges | null
) {
  const isSel = selected === abbr;
  if (variant === 'market-overview') {
    return {
      fill: isSel ? SAGE_MAP.fillSelected : SAGE_MAP.fill,
      fillHover: isSel ? SAGE_MAP.fillSelected : SAGE_MAP.fillHover,
      fillSelected: SAGE_MAP.fillSelected,
    };
  }
  const row = byState[abbr];
  const highlight = pipelineUsStateHighlightForFilter(row, stageFilter);
  if (highlight === 'none') {
    return {
      fill: isSel ? '#e5e7eb' : SAGE_MAP.fill,
      fillHover: isSel ? '#e5e7eb' : SAGE_MAP.fillHover,
      fillSelected: '#d1d5db',
    };
  }

  const count = pipelineMapPropertyCount(row, highlight, stageFilter);
  const palette =
    gradientRanges != null
      ? pipelineMapGradientFill(highlight, count, gradientRanges, stageFilter)
      : PIPELINE_MAP_COLORS[highlight];

  return {
    fill: isSel ? palette.fillSelected : palette.fill,
    fillHover: isSel ? palette.fillSelected : palette.fillHover,
    fillSelected: palette.fillSelected,
  };
}

function styleForState(
  abbr: string,
  selected: string | null,
  variant: GlampingIndustryUsMapVariant,
  byState: GlampingUsStateMetricsMap,
  stageFilter: PipelineMapStageFilter,
  gradientRanges: PipelineMapGradientRanges | null
) {
  const { fill, fillHover, fillSelected } = stateFillColors(
    abbr,
    selected,
    variant,
    byState,
    stageFilter,
    gradientRanges
  );
  const isSel = selected === abbr;
  return {
    default: {
      fill,
      stroke: SAGE_MAP.stroke,
      strokeWidth: 0.4,
      outline: 'none' as const,
      cursor: 'pointer' as const,
    },
    hover: {
      fill: isSel ? fillSelected : fillHover,
      stroke: SAGE_MAP.stroke,
      strokeWidth: 0.75,
      outline: 'none' as const,
      cursor: 'pointer' as const,
    },
    pressed: {
      fill: fillSelected,
      stroke: SAGE_MAP.stroke,
      strokeWidth: 0.75,
      outline: 'none' as const,
      cursor: 'pointer' as const,
    },
  };
}

/** Stroke styles for the small Hawaii Mercator inset (single state outline). */
function styleForHawaiiInset(
  selected: string | null,
  variant: GlampingIndustryUsMapVariant,
  byState: GlampingUsStateMetricsMap,
  stageFilter: PipelineMapStageFilter,
  gradientRanges: PipelineMapGradientRanges | null
) {
  const { fill, fillHover, fillSelected } = stateFillColors(
    'HI',
    selected,
    variant,
    byState,
    stageFilter,
    gradientRanges
  );
  const isSel = selected === 'HI';
  const sw = { default: 0.55, hover: 0.75, pressed: 0.75 } as const;
  return {
    default: {
      fill,
      stroke: SAGE_MAP.stroke,
      strokeWidth: sw.default,
      outline: 'none' as const,
      cursor: 'pointer' as const,
    },
    hover: {
      fill: isSel ? fillSelected : fillHover,
      stroke: SAGE_MAP.stroke,
      strokeWidth: sw.hover,
      outline: 'none' as const,
      cursor: 'pointer' as const,
    },
    pressed: {
      fill: fillSelected,
      stroke: SAGE_MAP.stroke,
      strokeWidth: sw.pressed,
      outline: 'none' as const,
      cursor: 'pointer' as const,
    },
  };
}

type Props = {
  byState: GlampingUsStateMetricsMap;
  variant?: GlampingIndustryUsMapVariant;
  initialSelectedAbbr?: string | null;
  stageFilter?: PipelineMapStageFilter;
  onStageFilterChange?: (filter: PipelineMapStageFilter) => void;
};

const PIPELINE_MAP_FILTER_ACTIVE_CLASS: Record<PipelineMapStageFilter, string> = {
  'all-pre-opening': 'bg-sage-700 text-white',
  'proposed-development': PIPELINE_PROPOSED_COLORS.mapButtonActiveClass,
  'under-construction': PIPELINE_UNDER_CONSTRUCTION_COLORS.mapButtonActiveClass,
};

const PIPELINE_MAP_STAGE_FILTERS: { value: PipelineMapStageFilter; label: string }[] = [
  { value: 'all-pre-opening', label: 'All pre-opening' },
  { value: 'proposed-development', label: 'Proposed' },
  { value: 'under-construction', label: 'Under construction' },
];

function PipelineMapLegend({ stageFilter }: { stageFilter: PipelineMapStageFilter }) {
  const items: { label: string; gradient: string }[] =
    stageFilter === 'proposed-development'
      ? [
          {
            label: 'Proposed development',
            gradient: `linear-gradient(to right, ${pipelineMapGradientRamp('proposed').min}, ${pipelineMapGradientRamp('proposed').max})`,
          },
        ]
      : stageFilter === 'under-construction'
        ? [
            {
              label: 'Under construction',
              gradient: `linear-gradient(to right, ${pipelineMapGradientRamp('under_construction').min}, ${pipelineMapGradientRamp('under_construction').max})`,
            },
          ]
        : [
            {
              label: 'Proposed development',
              gradient: `linear-gradient(to right, ${pipelineMapGradientRamp('proposed').min}, ${pipelineMapGradientRamp('proposed').max})`,
            },
            {
              label: 'Under construction',
              gradient: `linear-gradient(to right, ${pipelineMapGradientRamp('under_construction').min}, ${pipelineMapGradientRamp('under_construction').max})`,
            },
            {
              label: 'Both',
              gradient: `linear-gradient(to right, ${pipelineMapGradientRamp('both').min}, ${pipelineMapGradientRamp('both').max})`,
            },
          ];
  return (
    <div className="mt-2 space-y-1">
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[9px] font-light normal-case tracking-normal text-neutral-500">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-8 shrink-0 border border-sage-700/30"
              style={{ background: item.gradient }}
              aria-hidden
            />
            {item.label}
          </li>
        ))}
      </ul>
      <p className="text-[9px] font-light text-neutral-400">Darker shades = more properties</p>
    </div>
  );
}

export default function GlampingIndustryUsMap({
  byState,
  variant = 'market-overview',
  initialSelectedAbbr,
  stageFilter = 'all-pre-opening',
  onStageFilterChange,
}: Props) {
  const defaultSelected =
    initialSelectedAbbr !== undefined
      ? initialSelectedAbbr
      : variant === 'pipeline-quarterly'
        ? null
        : DEFAULT_MARKET_OVERVIEW_SELECTED_STATE_ABBR;
  const [selected, setSelected] = useState<string | null>(defaultSelected);

  const pipelineGradientRanges = useMemo(() => {
    if (variant !== 'pipeline-quarterly') return null;
    return buildPipelineMapGradientRanges(byState, stageFilter);
  }, [byState, stageFilter, variant]);

  const row = selected ? byState[selected] : undefined;

  const onSelect = useCallback((abbr: string) => {
    setSelected((prev) => {
      const next = prev === abbr ? null : abbr;
      trackMapInteraction('region_select', {
        map: 'glamping_market_overview_us',
        region: abbr,
        selected: next != null,
        variant,
      });
      return next;
    });
  }, [variant]);

  return (
    <div className="relative mt-16 space-y-12 overflow-x-hidden sm:mt-20 sm:space-y-0 lg:grid lg:grid-cols-[minmax(0,1fr)_240px] lg:items-start lg:gap-x-12">
      <div className="relative min-w-0 overflow-x-hidden overflow-y-visible">
        {variant === 'market-overview' ? (
          <div className="mb-4 space-y-1 text-[10px] uppercase tracking-[0.25em] text-neutral-500">
            <p>United States map · click a state</p>
            <p className="text-[9px] font-light normal-case tracking-normal text-neutral-500">
              Alaska lower left · Hawaii lower left
            </p>
          </div>
        ) : (
          <div className="mb-4 space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-[Georgia] text-xl font-medium tracking-tight text-neutral-900 sm:text-2xl">
                  United States map
                </h2>
                <p className="mt-1 text-xs text-neutral-500">Click a state for pipeline counts</p>
              </div>
              {onStageFilterChange ? (
                <div
                  className="flex flex-wrap gap-1 rounded-lg border border-sage-200/90 bg-white/60 p-1"
                  role="tablist"
                  aria-label="Map stage filter"
                >
                  {PIPELINE_MAP_STAGE_FILTERS.map((tab) => {
                    const active = stageFilter === tab.value;
                    return (
                      <button
                        key={tab.value}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => onStageFilterChange(tab.value)}
                        className={`rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                          active
                            ? PIPELINE_MAP_FILTER_ACTIVE_CLASS[tab.value]
                            : 'text-neutral-600 hover:bg-sage-50 hover:text-neutral-900'
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
            <p className="text-[11px] text-neutral-500">Alaska lower left · Hawaii lower left</p>
            <PipelineMapLegend stageFilter={stageFilter} />
          </div>
        )}
        <div className="relative w-full max-w-full">
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
                          style={styleForState(abbr, selected, variant, byState, stageFilter, pipelineGradientRanges)}
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
                      style={styleForState(abbr, selected, variant, byState, stageFilter, pipelineGradientRanges)}
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

        <div
          className="pointer-events-none absolute bottom-[10%] left-1 z-10 sm:bottom-[12%] sm:left-2 md:bottom-[14%] md:left-2"
          style={{ width: HAWAII_INSET_W, height: HAWAII_INSET_H }}
        >
          <div className="h-full w-full overflow-visible [&_svg]:pointer-events-none [&_path.rsm-geography]:pointer-events-auto">
            <ComposableMap
              projection="geoMercator"
              projectionConfig={HAWAII_INSET_PROJECTION}
              width={HAWAII_INSET_W}
              height={HAWAII_INSET_H}
              className="block h-full w-full max-w-none [&_.rsm-geography]:outline-none"
            >
              <Geographies
                geography={US_STATES_TOPO_URL}
                parseGeographies={(geos) => parseHawaiiStateGeo(geos as GeoJSON.Feature[])}
              >
                {({ geographies }) => (
                  <>
                    {geographies.map((geo) => (
                      <Geography
                        key={`hi-${geo.rsmKey}`}
                        geography={geo}
                        style={styleForHawaiiInset(selected, variant, byState, stageFilter, pipelineGradientRanges)}
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
      </div>

      <aside className="border-t border-sage-200 pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
        <div>
          {!selected ? (
            <p className="text-sm font-light leading-relaxed text-neutral-600">
              {variant === 'pipeline-quarterly'
                ? 'Select a state for proposed development and under construction counts, or use the stage filter above.'
                : 'Select a state on the map for property count, unit count, and average retail daily rate.'}
            </p>
          ) : variant === 'pipeline-quarterly' ? (
            <div className="space-y-6">
              <h2 className="text-sm font-medium text-neutral-800">{stateLabel(selected)}</h2>
              <dl className="space-y-5 text-sm">
                <div>
                  <dt className="text-xs text-neutral-500">Proposed development</dt>
                  <dd className="mt-1 font-light tabular-nums text-3xl tracking-tight text-neutral-900">
                    {formatInt(row?.proposedDevelopmentProperties ?? 0)}
                  </dd>
                  <p className="mt-0.5 text-xs text-neutral-500">properties</p>
                </div>
                <div>
                  <dt className="text-xs text-neutral-500">Under construction</dt>
                  <dd className="mt-1 font-light tabular-nums text-3xl tracking-tight text-neutral-900">
                    {formatInt(row?.underConstructionProperties ?? 0)}
                  </dd>
                  <p className="mt-0.5 text-xs text-neutral-500">properties</p>
                </div>
              </dl>
              {(() => {
                const detailPath = pipelineMapStateDetailPath(
                  selected,
                  stageFilter,
                  row?.proposedDevelopmentProperties ?? 0,
                  row?.underConstructionProperties ?? 0
                );
                if (!detailPath) return null;
                return (
                  <Link
                    href={detailPath}
                    className="inline-block text-xs font-medium text-sage-700 underline-offset-2 transition-colors hover:text-sage-900 hover:underline"
                  >
                    View {stateLabel(selected)} pipeline projects →
                  </Link>
                );
              })()}
            </div>
          ) : (
            <div className="space-y-6">
              <h2 className="text-[11px] font-medium uppercase tracking-widest text-neutral-500">
                {stateLabel(selected)}
              </h2>
              <dl className="space-y-5 text-sm">
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-neutral-500">
                    Property count
                  </dt>
                  <dd>
                    <div className="mt-1 font-light tabular-nums text-2xl tracking-tight text-neutral-900">
                      {formatInt(row?.propertyCount ?? 0)}
                    </div>
                    <ul className="mt-4 space-y-2 border-l border-sage-200 pl-4 text-sm text-neutral-600">
                      <li>
                        <span className="text-neutral-500">Open</span>{' '}
                        <span className="tabular-nums text-neutral-800">
                          {formatInt(row?.openProperties ?? 0)}
                        </span>
                      </li>
                      <li>
                        <span className="text-neutral-500">Under construction</span>{' '}
                        <span className="tabular-nums text-neutral-800">
                          {formatInt(row?.underConstructionProperties ?? 0)}
                        </span>
                      </li>
                      <li>
                        <span className="text-neutral-500">Proposed development</span>{' '}
                        <span className="tabular-nums text-neutral-800">
                          {formatInt(row?.proposedDevelopmentProperties ?? 0)}
                        </span>
                      </li>
                    </ul>
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
                    Avg. retail daily rate (ARDR)
                  </dt>
                  <dd className="mt-1 space-y-0.5 font-light tabular-nums text-lg tracking-tight text-neutral-900">
                    <div>
                      <span className="text-neutral-500">Mean</span>{' '}
                      {formatUsd(row?.avgRetailDailyRateMean ?? null)}
                    </div>
                    <div>
                      <span className="text-neutral-500">Median</span>{' '}
                      {formatUsd(row?.avgRetailDailyRateMedian ?? null)}
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
