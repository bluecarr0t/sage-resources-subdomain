'use client';

import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from 'react-simple-maps';
import { geoCentroid } from 'd3-geo';
import type { RegionalAggregateRow } from '@/lib/rv-industry-overview/campspot-regional-aggregates';
import type { StateRvMetrics } from '@/lib/rv-industry-overview/campspot-rv-map-data';
import {
  ALASKA_ALBERS_INSET_NUDGE,
  EXCLUDE_FROM_MAP_ABBR,
  HAWAII_INSET_TRANSLATE_X_PX,
  RV_INDUSTRY_REGION_IDS,
  RV_REGION_FILL,
  RV_REGION_LABEL_COORDS,
  fullStateNameToUspsAbbr,
  getRvIndustryRegionForStateAbbr,
  type RvIndustryRegionId,
} from '@/lib/rv-industry-overview/us-rv-regions';
import { US_STATE_NAMES } from '@/lib/us-states';
import { Button } from '@/components/ui/Button';
import { Modal, ModalContent } from '@/components/ui/Modal';

const US_STATES_TOPO_URL =
  'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

const MAP_W = 960;
const MAP_H = 580;

/** Hawaii-only Mercator inset (main map excludes HI; placed bottom-left, west of Alaska’s Albers inset). */
const HAWAII_INSET_W = 124;
const HAWAII_INSET_H = 80;

function geographyInteractionStyle(fill: string) {
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
      strokeWidth: 1.1,
      outline: 'none' as const,
    },
    pressed: {
      fill,
      stroke: '#0f172a',
      strokeWidth: 1.1,
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

function formatPct(n: number | null): string {
  if (n == null) return '-';
  return `${n.toFixed(1)}%`;
}

function formatAdr(n: number | null): string {
  if (n == null) return '-';
  return `$${n.toFixed(2)}`;
}

function stateDisplayName(abbr: string): string {
  return US_STATE_NAMES[abbr as keyof typeof US_STATE_NAMES] ?? abbr;
}

function hasStateMetrics(m: StateRvMetrics | undefined): boolean {
  if (!m) return false;
  return m.nMatched > 0;
}

function formatOccDelta(from: number | null, to: number | null): string {
  if (from == null || to == null) return '-';
  const d = to - from;
  if (d === 0) return '0.0';
  const sign = d > 0 ? '+' : '−';
  return `${sign}${Math.abs(d).toFixed(1)}`;
}

function formatAdrDelta(from: number | null, to: number | null): string {
  if (from == null || to == null) return '-';
  const d = to - from;
  if (d === 0) return '$0.00 (0.0%)';
  const sign = d > 0 ? '+' : '−';
  const money = `${sign}$${Math.abs(d).toFixed(2)}`;
  if (from === 0) return money;
  const pct = (d / from) * 100;
  const pSign = pct > 0 ? '+' : pct < 0 ? '−' : '';
  return `${money} (${pSign}${Math.abs(pct).toFixed(1)}%)`;
}

type DeltaTone = 'positive' | 'negative' | 'neutral' | 'empty';

function deltaTone(from: number | null, to: number | null): DeltaTone {
  if (from == null || to == null) return 'empty';
  const d = to - from;
  if (d > 0) return 'positive';
  if (d < 0) return 'negative';
  return 'neutral';
}

function deltaToneTextClass(tone: DeltaTone): string {
  switch (tone) {
    case 'positive':
      return 'text-emerald-600 dark:text-emerald-400';
    case 'negative':
      return 'text-red-600 dark:text-red-400';
    default:
      return 'text-gray-900 dark:text-gray-100';
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi);
}

type Props = {
  byRegion: Record<RvIndustryRegionId, RegionalAggregateRow>;
  byState: Record<string, StateRvMetrics>;
};

type TipState = { abbr: string; clientX: number; clientY: number };

export default function RegionalCampspotMap({ byRegion, byState }: Props) {
  const t = useTranslations('admin.rvIndustryOverview');
  const ts = useTranslations('admin.rvIndustryOverview.mapState');

  const [tip, setTip] = useState<TipState | null>(null);
  const [modalAbbr, setModalAbbr] = useState<string | null>(null);

  const legendItems = useMemo(
    () =>
      RV_INDUSTRY_REGION_IDS.map((id) => ({
        id,
        label: t(`region.${id}`),
        fill: RV_REGION_FILL[id],
      })),
    [t]
  );

  const closeModal = useCallback(() => setModalAbbr(null), []);

  const modalMetrics = modalAbbr ? byState[modalAbbr] : undefined;
  const tipMetrics = tip ? byState[tip.abbr] : undefined;

  const modalOccTone = modalMetrics
    ? deltaTone(modalMetrics.meanOcc2024, modalMetrics.meanOcc2025)
    : 'empty';
  const modalAdrTone = modalMetrics
    ? deltaTone(modalMetrics.meanAdr2024, modalMetrics.meanAdr2025)
    : 'empty';

  const tipOccTone =
    tipMetrics && hasStateMetrics(tipMetrics)
      ? deltaTone(tipMetrics.meanOcc2024, tipMetrics.meanOcc2025)
      : 'empty';
  const tipAdrTone =
    tipMetrics && hasStateMetrics(tipMetrics)
      ? deltaTone(tipMetrics.meanAdr2024, tipMetrics.meanAdr2025)
      : 'empty';

  return (
    <div
      className="relative w-full overflow-hidden rounded-lg bg-white pb-3 dark:bg-white"
      onMouseLeave={() => setTip(null)}
    >
      <ComposableMap
        projection="geoAlbersUsa"
        width={MAP_W}
        height={MAP_H}
        className="w-full h-auto max-h-[min(70vh,640px)] cursor-default [&_.rsm-geography]:cursor-pointer [&_.rsm-geography]:outline-none focus-visible:[&_.rsm-geography]:ring-2 focus-visible:[&_.rsm-geography]:ring-sage-500"
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
                const regionId = abbr
                  ? getRvIndustryRegionForStateAbbr(abbr)
                  : null;
                const fill = regionId
                  ? RV_REGION_FILL[regionId]
                  : '#d1d5db';
                if (!abbr) return null;
                const geoProps = {
                  geography: geo,
                  'aria-label': ts('selectAria', {
                    state: stateDisplayName(abbr),
                  }),
                  onMouseEnter: (e: { clientX: number; clientY: number }) => {
                    setTip({
                      abbr,
                      clientX: e.clientX,
                      clientY: e.clientY,
                    });
                  },
                  onMouseMove: (e: { clientX: number; clientY: number }) => {
                    setTip({ abbr, clientX: e.clientX, clientY: e.clientY });
                  },
                  onClick: () => setModalAbbr(abbr),
                  onKeyDown: (e: { key: string; preventDefault: () => void }) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setModalAbbr(abbr);
                    }
                  },
                  style: geographyInteractionStyle(fill),
                };
                if (abbr === 'AK') {
                  return (
                    <g
                      key={geo.rsmKey}
                      transform={`translate(${ALASKA_ALBERS_INSET_NUDGE.x}, ${ALASKA_ALBERS_INSET_NUDGE.y})`}
                    >
                      <Geography {...geoProps} />
                    </g>
                  );
                }
                return <Geography key={geo.rsmKey} {...geoProps} />;
              })}
              {geographies.map((geo) => {
                const name = geo.properties?.name;
                const abbr = fullStateNameToUspsAbbr(name);
                if (!abbr) return null;
                try {
                  const c = geoCentroid({
                    type: 'Feature',
                    properties: geo.properties,
                    geometry: geo.geometry as GeoJSON.Geometry,
                  } as GeoJSON.Feature);
                  if (!c || c.length < 2) return null;
                  const labelText = (
                    <text
                      textAnchor="middle"
                      pointerEvents="none"
                      style={{
                        fill: '#111827',
                        fontSize: 9,
                        fontWeight: 600,
                        paintOrder: 'stroke',
                        stroke: 'rgba(255,255,255,0.85)',
                        strokeWidth: 2,
                      }}
                    >
                      {abbr}
                    </text>
                  );
                  return (
                    <Marker key={`lbl-${geo.rsmKey}`} coordinates={c as [number, number]}>
                      {abbr === 'AK' ? (
                        <g
                          transform={`translate(${ALASKA_ALBERS_INSET_NUDGE.x}, ${ALASKA_ALBERS_INSET_NUDGE.y})`}
                        >
                          {labelText}
                        </g>
                      ) : (
                        labelText
                      )}
                    </Marker>
                  );
                } catch {
                  return null;
                }
              })}
              {RV_INDUSTRY_REGION_IDS.map((regionId) => {
                const stats = byRegion[regionId];
                const coords = RV_REGION_LABEL_COORDS[regionId];
                return (
                  <Marker key={`reg-${regionId}`} coordinates={coords}>
                    <text
                      textAnchor="middle"
                      pointerEvents="none"
                      style={{
                        fill: '#ffffff',
                        fontSize: 12,
                        fontWeight: 700,
                        paintOrder: 'stroke',
                        stroke: 'rgba(0,0,0,0.35)',
                        strokeWidth: 3,
                      }}
                    >
                      <tspan x={0} dy="0">
                        {t('occupancyShort')}: {formatPct(stats.meanOccupancyPct)}
                      </tspan>
                      <tspan x={0} dy="15">
                        {t('adrShort')}: {formatAdr(stats.meanAdr)}
                      </tspan>
                    </text>
                  </Marker>
                );
              })}
            </>
          )}
        </Geographies>
      </ComposableMap>

      <div
        className="pointer-events-none absolute z-10 left-[0.75%] bottom-[4%] w-[min(14vw,132px)] max-[480px]:left-[1%] max-[480px]:bottom-[6%]"
        style={{ transform: `translateX(${HAWAII_INSET_TRANSLATE_X_PX}px)` }}
      >
        <div className="pointer-events-auto w-full [&_svg]:h-auto [&_svg]:w-full">
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
              geography={US_STATES_TOPO_URL}
              parseGeographies={(geos) => parseOnlyHawaii(geos as GeoJSON.Feature[])}
            >
              {({ geographies }) => (
                <>
                  {geographies.map((geo) => {
                    const fill = RV_REGION_FILL.west;
                    return (
                      <Geography
                        key={`hi-${geo.rsmKey}`}
                        geography={geo}
                        aria-label={ts('selectAria', {
                          state: stateDisplayName('HI'),
                        })}
                        onMouseEnter={(e) => {
                          setTip({
                            abbr: 'HI',
                            clientX: e.clientX,
                            clientY: e.clientY,
                          });
                        }}
                        onMouseMove={(e) => {
                          setTip({
                            abbr: 'HI',
                            clientX: e.clientX,
                            clientY: e.clientY,
                          });
                        }}
                        onClick={() => setModalAbbr('HI')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setModalAbbr('HI');
                          }
                        }}
                        style={geographyInteractionStyle(fill)}
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
                      return (
                        <Marker key={`hi-lbl-${geo.rsmKey}`} coordinates={c as [number, number]}>
                          <text
                            textAnchor="middle"
                            pointerEvents="none"
                            style={{
                              fill: '#111827',
                              fontSize: 8,
                              fontWeight: 600,
                              paintOrder: 'stroke',
                              stroke: 'rgba(255,255,255,0.85)',
                              strokeWidth: 2,
                            }}
                          >
                            HI
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

      {tip ? (
        <div
          className="pointer-events-none fixed z-[45] isolate w-[min(calc(100vw-20px),280px)] rounded-md border border-gray-200 bg-white px-3 py-2.5 text-xs shadow-lg dark:border-gray-200 dark:bg-white"
          style={{
            left: clamp(
              tip.clientX + 14,
              8,
              (typeof window !== 'undefined' ? window.innerWidth : 1200) - 292
            ),
            top: clamp(
              tip.clientY + 14,
              8,
              (typeof window !== 'undefined' ? window.innerHeight : 800) - 200
            ),
          }}
          role="tooltip"
        >
          <div className="text-sm font-semibold text-gray-900">
            {ts('tooltipTitle', { state: stateDisplayName(tip.abbr) })}
          </div>
          {hasStateMetrics(tipMetrics) ? (
            <div className="mt-2 space-y-3 text-[11px] leading-snug text-gray-800">
              <div>
                <div className="font-semibold text-gray-900">{t('occupancyShort')}</div>
                <dl className="mt-1 grid grid-cols-[minmax(0,4.25rem)_1fr] gap-x-2 gap-y-1">
                  <dt className="text-gray-500">{ts('tooltipYear2024')}</dt>
                  <dd className="text-right font-medium tabular-nums text-gray-900">
                    {formatPct(tipMetrics!.meanOcc2024)}
                  </dd>
                  <dt className="text-gray-500">{ts('tooltipYear2025')}</dt>
                  <dd className="text-right font-medium tabular-nums text-gray-900">
                    {formatPct(tipMetrics!.meanOcc2025)}
                  </dd>
                  <dt className="text-gray-500">{ts('tooltipDelta')}</dt>
                  <dd
                    className={`text-right font-semibold tabular-nums ${deltaToneTextClass(tipOccTone)}`}
                  >
                    {formatOccDelta(tipMetrics!.meanOcc2024, tipMetrics!.meanOcc2025)} {ts('pp')}
                  </dd>
                </dl>
              </div>
              <div>
                <div className="font-semibold text-gray-900">{t('adrShort')}</div>
                <dl className="mt-1 grid grid-cols-[minmax(0,4.25rem)_1fr] gap-x-2 gap-y-1">
                  <dt className="text-gray-500">{ts('tooltipYear2024')}</dt>
                  <dd className="text-right font-medium tabular-nums text-gray-900">
                    {formatAdr(tipMetrics!.meanAdr2024)}
                  </dd>
                  <dt className="text-gray-500">{ts('tooltipYear2025')}</dt>
                  <dd className="text-right font-medium tabular-nums text-gray-900">
                    {formatAdr(tipMetrics!.meanAdr2025)}
                  </dd>
                  <dt className="text-gray-500">{ts('tooltipDelta')}</dt>
                  <dd
                    className={`text-right font-semibold tabular-nums ${deltaToneTextClass(tipAdrTone)}`}
                  >
                    {formatAdrDelta(tipMetrics!.meanAdr2024, tipMetrics!.meanAdr2025)}
                  </dd>
                </dl>
              </div>
              <p className="border-t border-gray-100 pt-2 text-[10px] text-gray-500 dark:border-gray-200">
                {ts('tooltipCohortHint')}
              </p>
              <p className="text-[10px] text-gray-500">{ts('tooltipClick')}</p>
            </div>
          ) : (
            <p className="mt-2 text-[11px] text-gray-600">{ts('noData')}</p>
          )}
        </div>
      ) : null}

      <div
        className="absolute bottom-3 right-3 z-20 rounded-md bg-white/95 dark:bg-gray-900/95 px-3 py-2 shadow-sm border border-gray-200 dark:border-gray-600 text-xs space-y-1.5 max-w-[200px]"
        aria-label={t('legendAria')}
      >
        <div className="font-semibold text-gray-800 dark:text-gray-100">
          {t('legendTitle')}
        </div>
        {legendItems.map((item) => (
          <div key={item.id} className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
            <span
              className="inline-block size-3 shrink-0 rounded-sm border border-gray-300 dark:border-gray-500"
              style={{ backgroundColor: item.fill }}
              aria-hidden
            />
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      <Modal open={modalAbbr != null} onClose={closeModal} className="max-w-lg">
        <ModalContent className="p-5">
          {modalAbbr ? (
            <>
              <div className="flex items-start justify-between gap-3 border-b border-gray-200 pb-3 dark:border-gray-600">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {stateDisplayName(modalAbbr)}
                </h2>
                <Button type="button" variant="secondary" size="sm" onClick={closeModal}>
                  {ts('close')}
                </Button>
              </div>
              {hasStateMetrics(modalMetrics) ? (
                <div className="mt-4 space-y-4">
                  <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-sm">
                    <dt className="text-gray-600 dark:text-gray-400">{ts('occ2024')}</dt>
                    <dd className="text-right font-medium text-gray-900 dark:text-gray-100">
                      {formatPct(modalMetrics!.meanOcc2024)}
                    </dd>
                    <dt className="text-gray-600 dark:text-gray-400">{ts('occ2025')}</dt>
                    <dd className="text-right font-medium text-gray-900 dark:text-gray-100">
                      {formatPct(modalMetrics!.meanOcc2025)}
                    </dd>
                    <dt className="text-gray-600 dark:text-gray-400">{ts('occChange')}</dt>
                    <dd
                      className={`text-right font-medium tabular-nums ${deltaToneTextClass(modalOccTone)}`}
                    >
                      {formatOccDelta(modalMetrics!.meanOcc2024, modalMetrics!.meanOcc2025)} {ts('pp')}
                    </dd>
                    <dt className="text-gray-600 dark:text-gray-400">{ts('adr2024')}</dt>
                    <dd className="text-right font-medium text-gray-900 dark:text-gray-100">
                      {formatAdr(modalMetrics!.meanAdr2024)}
                    </dd>
                    <dt className="text-gray-600 dark:text-gray-400">{ts('adr2025')}</dt>
                    <dd className="text-right font-medium text-gray-900 dark:text-gray-100">
                      {formatAdr(modalMetrics!.meanAdr2025)}
                    </dd>
                    <dt className="text-gray-600 dark:text-gray-400">{ts('adrChange')}</dt>
                    <dd
                      className={`text-right font-medium tabular-nums ${deltaToneTextClass(modalAdrTone)}`}
                    >
                      {formatAdrDelta(modalMetrics!.meanAdr2024, modalMetrics!.meanAdr2025)}
                    </dd>
                    <dt className="text-gray-600 dark:text-gray-400">{ts('sitesMatched')}</dt>
                    <dd className="text-right font-medium tabular-nums text-gray-900 dark:text-gray-100">
                      {modalMetrics!.nMatched}
                    </dd>
                  </dl>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{ts('methodNote')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{ts('matchedCohortNote')}</p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">{ts('noData')}</p>
              )}
            </>
          ) : null}
        </ModalContent>
      </Modal>
    </div>
  );
}
