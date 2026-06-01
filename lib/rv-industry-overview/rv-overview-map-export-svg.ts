/**
 * Server-side fallback map images (SVG) when browser html2canvas capture fails.
 * Simplified regional summary — not a geographic clone of the interactive map.
 */

import type { RegionalAggregateRow } from '@/lib/rv-industry-overview/campspot-regional-aggregates';
import type { StateAdrChoroplethEntry } from '@/lib/rv-industry-overview/campspot-rv-map-data';
import {
  RV_INDUSTRY_REGION_IDS,
  RV_REGION_FILL,
  rvRegionMapLabelStyle,
  type RvIndustryRegionId,
} from '@/lib/rv-industry-overview/us-rv-regions';
import { US_STATE_NAMES } from '@/lib/us-states';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtPct(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return `${Math.round(v * 10) / 10}%`;
}

function fmtUsd(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return `$${Math.round(v)}`;
}

export function buildRegionalMapFallbackSvg(
  byRegion: Record<RvIndustryRegionId, RegionalAggregateRow>,
  title: string
): string {
  const w = 960;
  const h = 520;
  const boxW = 170;
  const boxH = 88;
  const cols = 3;
  const startX = (w - cols * boxW - (cols - 1) * 16) / 2;
  const startY = 100;

  let boxes = '';
  RV_INDUSTRY_REGION_IDS.forEach((id, i) => {
    const row = byRegion[id];
    const col = i % cols;
    const rowIdx = Math.floor(i / cols);
    const x = startX + col * (boxW + 16);
    const y = startY + rowIdx * (boxH + 20);
    const fill = RV_REGION_FILL[id];
    const labelFill = rvRegionMapLabelStyle(id).fill;
    boxes += `
      <g transform="translate(${x},${y})">
        <rect width="${boxW}" height="${boxH}" rx="8" fill="${fill}" opacity="0.92"/>
        <text x="${boxW / 2}" y="22" text-anchor="middle" fill="${labelFill}" font-size="13" font-weight="700" font-family="system-ui,sans-serif">${esc(id.toUpperCase())}</text>
        <text x="${boxW / 2}" y="48" text-anchor="middle" fill="${labelFill}" font-size="11" font-family="system-ui,sans-serif">Occ ${fmtPct(row?.meanOccupancyPct ?? null)}</text>
        <text x="${boxW / 2}" y="68" text-anchor="middle" fill="${labelFill}" font-size="11" font-family="system-ui,sans-serif">ARDR ${fmtUsd(row?.meanAdr ?? null)}</text>
      </g>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <text x="${w / 2}" y="48" text-anchor="middle" font-size="20" font-weight="700" fill="#111" font-family="system-ui,sans-serif">${esc(title)}</text>
  <text x="${w / 2}" y="72" text-anchor="middle" font-size="12" fill="#555" font-family="system-ui,sans-serif">Server fallback — regional 2025 means (not geographic)</text>
  ${boxes}
</svg>`;
}

export function buildStateAdrChoroplethFallbackSvg(
  byStateAdr: Record<string, StateAdrChoroplethEntry>,
  title: string,
  maxStates = 20
): string {
  const w = 960;
  const h = 560;
  const entries = Object.entries(byStateAdr)
    .filter(([, v]) => v.n > 0 && v.meanAdr != null)
    .sort((a, b) => (b[1].meanAdr ?? 0) - (a[1].meanAdr ?? 0))
    .slice(0, maxStates);

  let rows = '';
  const rowH = 22;
  entries.forEach(([abbr, v], i) => {
    const y = 96 + i * rowH;
    const name = US_STATE_NAMES[abbr] ?? abbr;
    rows += `
      <text x="80" y="${y}" font-size="12" fill="#222" font-family="system-ui,sans-serif">${esc(name)} (${esc(abbr)})</text>
      <text x="420" y="${y}" font-size="12" fill="#222" font-family="system-ui,sans-serif">${fmtUsd(v.meanAdr)}</text>
      <text x="520" y="${y}" font-size="12" fill="#666" font-family="system-ui,sans-serif">n=${v.n}</text>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <text x="${w / 2}" y="48" text-anchor="middle" font-size="20" font-weight="700" fill="#111" font-family="system-ui,sans-serif">${esc(title)}</text>
  <text x="${w / 2}" y="72" text-anchor="middle" font-size="12" fill="#555" font-family="system-ui,sans-serif">Server fallback — top states by 2025 ARDR (table)</text>
  <text x="80" y="90" font-size="11" font-weight="600" fill="#444" font-family="system-ui,sans-serif">State</text>
  <text x="420" y="90" font-size="11" font-weight="600" fill="#444" font-family="system-ui,sans-serif">Mean ARDR</text>
  ${rows}
</svg>`;
}
