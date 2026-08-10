/**
 * Capture WeatherSpark climate chart SVGs via Firecrawl (JS render) and
 * rasterize to PNG with sharp. Tavily image extract cannot see these charts
 * because WeatherSpark draws them client-side as SVG.
 */

import sharp from 'sharp';
import { isLikelyTransientNetworkError, sleepBackoffMs } from '@/lib/comps-v2/retry-transient';

export type WeatherSparkChartKey =
  | 'temperature'
  | 'precip'
  | 'snowfall'
  | 'tourism';

export interface WeatherSparkChartImage {
  key: WeatherSparkChartKey;
  title: string;
  buffer: Buffer;
  ext: 'png';
  width: number;
  height: number;
}

const CHART_TARGETS: Array<{ key: WeatherSparkChartKey; anchorId: string }> = [
  { key: 'temperature', anchorId: 'Figures-Temperature' },
  { key: 'precip', anchorId: 'Figures-PrecipitationProbability' },
  { key: 'snowfall', anchorId: 'Figures-Snowfall' },
  { key: 'tourism', anchorId: 'Figures-BestTimeTourism' },
];

const FIRECRAWL_MAX_ATTEMPTS = 3;
const FIRECRAWL_RETRY_BASE_MS = 700;

const EXTRACT_CHARTS_SCRIPT = `
(() => {
  const targets = ${JSON.stringify(
    Object.fromEntries(CHART_TARGETS.map((t) => [t.key, t.anchorId]))
  )};
  function findWrapper(anchorId) {
    const a = document.getElementById(anchorId);
    if (!a) return null;
    let n = a.nextElementSibling;
    for (let i = 0; i < 8 && n; i++, n = n.nextElementSibling) {
      const w = n.matches && n.matches('.Figure-wrapper')
        ? n
        : (n.querySelector ? n.querySelector('.Figure-wrapper') : null);
      if (w && w.querySelector('svg')) return w;
    }
    return null;
  }
  const charts = [];
  for (const [key, id] of Object.entries(targets)) {
    const wrapper = findWrapper(id);
    if (!wrapper) continue;
    const title = (wrapper.querySelector('.Figure-title')?.textContent || '').trim();
    const svg = wrapper.querySelector('.Figure-chart svg') || wrapper.querySelector('svg');
    if (!svg) continue;
    const clone = svg.cloneNode(true);
    if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const bbox = svg.getBoundingClientRect();
    const w = Math.max(svg.width?.baseVal?.value || 0, bbox.width, 800);
    const h = Math.max(svg.height?.baseVal?.value || 0, bbox.height, 300);
    if (!clone.getAttribute('width')) clone.setAttribute('width', String(w));
    if (!clone.getAttribute('height')) clone.setAttribute('height', String(h));
    const xml = new XMLSerializer().serializeToString(clone);
    charts.push({
      key,
      title,
      width: w,
      height: h,
      svgBase64: btoa(unescape(encodeURIComponent(xml))),
    });
  }
  return { charts };
})()
`;

type ExtractedSvgChart = {
  key: string;
  title?: string;
  width?: number;
  height?: number;
  svgBase64?: string;
};

function isWeatherSparkChartKey(value: string): value is WeatherSparkChartKey {
  return (
    value === 'temperature' ||
    value === 'precip' ||
    value === 'snowfall' ||
    value === 'tourism'
  );
}

async function rasterizeSvgBase64(
  svgBase64: string,
  width: number,
  height: number
): Promise<{ buffer: Buffer; width: number; height: number } | null> {
  try {
    const svgBuf = Buffer.from(svgBase64, 'base64');
    if (svgBuf.length < 200) return null;
    const targetWidth = Math.min(1600, Math.max(800, Math.round(width || 1200)));
    const png = await sharp(svgBuf, { density: 144 })
      .resize({ width: targetWidth, withoutEnlargement: false })
      .png()
      .toBuffer();
    if (png.length < 500) return null;
    const meta = await sharp(png).metadata();
    return {
      buffer: png,
      width: meta.width ?? targetWidth,
      height: meta.height ?? Math.round((height || 400) * (targetWidth / Math.max(width || 1, 1))),
    };
  } catch (err) {
    console.warn(
      '[weatherspark-charts] SVG rasterize failed:',
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

/**
 * Scrape WeatherSpark page with Firecrawl, extract figure SVGs, return PNG buffers.
 * Soft-fails (empty array) when FIRECRAWL_API_KEY is missing or capture fails.
 */
export async function captureWeatherSparkChartImages(
  weatherSparkUrl: string
): Promise<WeatherSparkChartImage[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY?.trim();
  if (!apiKey) {
    console.warn('[weatherspark-charts] FIRECRAWL_API_KEY not set; skipping chart capture');
    return [];
  }

  let u: string;
  try {
    u = weatherSparkUrl.trim();
    const parsed = new URL(u);
    if (!parsed.hostname.includes('weatherspark.com')) {
      console.warn('[weatherspark-charts] Refusing non-WeatherSpark URL');
      return [];
    }
  } catch {
    return [];
  }

  let extracted: ExtractedSvgChart[] = [];

  for (let attempt = 0; attempt < FIRECRAWL_MAX_ATTEMPTS; attempt++) {
    try {
      const Firecrawl = (await import('@mendable/firecrawl-js')).default;
      const firecrawl = new Firecrawl({ apiKey });
      const result = (await firecrawl.scrape(u, {
        formats: ['markdown'],
        waitFor: 5000,
        proxy: 'stealth',
        actions: [
          { type: 'wait', milliseconds: 5000 },
          { type: 'scroll', direction: 'down' },
          { type: 'wait', milliseconds: 1500 },
          { type: 'executeJavascript', script: EXTRACT_CHARTS_SCRIPT },
        ],
      })) as {
        actions?: { javascriptReturns?: Array<{ value?: { charts?: ExtractedSvgChart[] } }> };
      };

      const charts = result?.actions?.javascriptReturns?.[0]?.value?.charts;
      if (Array.isArray(charts) && charts.length > 0) {
        extracted = charts;
        break;
      }
      console.warn(
        `[weatherspark-charts] No charts in Firecrawl response (attempt ${attempt + 1})`
      );
    } catch (err) {
      const retry =
        attempt < FIRECRAWL_MAX_ATTEMPTS - 1 && isLikelyTransientNetworkError(err);
      console.warn(
        '[weatherspark-charts] Firecrawl scrape failed:',
        err instanceof Error ? err.message : err
      );
      if (retry) {
        await sleepBackoffMs(attempt, FIRECRAWL_RETRY_BASE_MS);
        continue;
      }
      return [];
    }
  }

  const out: WeatherSparkChartImage[] = [];
  for (const chart of extracted) {
    if (!chart?.key || !isWeatherSparkChartKey(chart.key) || !chart.svgBase64) continue;
    const raster = await rasterizeSvgBase64(
      chart.svgBase64,
      Number(chart.width) || 1200,
      Number(chart.height) || 500
    );
    if (!raster) continue;
    out.push({
      key: chart.key,
      title: chart.title?.trim() || defaultTitleForKey(chart.key),
      buffer: raster.buffer,
      ext: 'png',
      width: raster.width,
      height: raster.height,
    });
  }

  if (out.length > 0) {
    console.log(
      `[weatherspark-charts] Captured ${out.length} chart(s): ${out.map((c) => c.key).join(', ')}`
    );
  }

  return orderCharts(out);
}

function defaultTitleForKey(key: WeatherSparkChartKey): string {
  switch (key) {
    case 'temperature':
      return 'Average High and Low Temperature';
    case 'precip':
      return 'Daily Chance of Precipitation';
    case 'snowfall':
      return 'Average Monthly Snowfall';
    case 'tourism':
      return 'Tourism Score';
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}

/** Prefer completed-study order: temp → precip → snow → tourism. */
export function orderCharts(charts: WeatherSparkChartImage[]): WeatherSparkChartImage[] {
  const rank: Record<WeatherSparkChartKey, number> = {
    temperature: 0,
    precip: 1,
    snowfall: 2,
    tourism: 3,
  };
  return [...charts].sort((a, b) => rank[a.key] - rank[b.key]);
}

/** Prefer temperature + tourism when limiting embeds; keep precip/snow when room. */
export function selectChartsForEmbed(
  charts: WeatherSparkChartImage[],
  max = 4
): WeatherSparkChartImage[] {
  if (charts.length <= max) return orderCharts(charts);
  const ordered = orderCharts(charts);
  const preferred: WeatherSparkChartKey[] = [
    'temperature',
    'tourism',
    'precip',
    'snowfall',
  ];
  const picked: WeatherSparkChartImage[] = [];
  for (const key of preferred) {
    const hit = ordered.find((c) => c.key === key);
    if (hit) picked.push(hit);
    if (picked.length >= max) break;
  }
  return picked;
}
