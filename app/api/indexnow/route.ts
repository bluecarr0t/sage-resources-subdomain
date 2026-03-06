import { NextRequest, NextResponse } from 'next/server';

const BING_ENDPOINT = 'https://api.bing.com/indexnow';
const YANDEX_ENDPOINT = 'https://yandex.com/indexnow';

async function fetchSitemapUrls(baseUrl: string): Promise<string[]> {
  const indexRes = await fetch(`${baseUrl}/sitemap.xml`);
  if (!indexRes.ok) throw new Error(`Sitemap fetch failed: ${indexRes.status}`);

  const text = await indexRes.text();
  const sitemapLocs = [...text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());

  const urls: string[] = [];
  for (const loc of sitemapLocs) {
    if (loc.endsWith('.xml')) {
      const subRes = await fetch(loc);
      if (!subRes.ok) continue;
      const subText = await subRes.text();
      const pageUrls = [...subText.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
      urls.push(...pageUrls);
    }
  }

  return [...new Set(urls)];
}

async function submitToIndexNow(
  urls: string[],
  endpoint: string,
  key: string,
  baseUrl: string
): Promise<{ ok: boolean; count: number }> {
  const host = new URL(baseUrl).hostname;
  const body = {
    host,
    key,
    keyLocation: `${baseUrl}/${key}.txt`,
    urlList: urls.slice(0, 10000),
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`IndexNow ${endpoint}: ${res.status} ${errText}`);
    return { ok: false, count: 0 };
  }
  return { ok: true, count: urls.length };
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const indexNowKey = process.env.INDEXNOW_KEY;

  if (!indexNowKey) {
    return NextResponse.json(
      { error: 'INDEXNOW_KEY not configured' },
      { status: 503 }
    );
  }

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const baseUrl =
    process.env.SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://resources.sageoutdooradvisory.com');

  try {
    const urls = await fetchSitemapUrls(baseUrl);
    if (urls.length === 0) {
      return NextResponse.json({ error: 'No URLs found in sitemap' }, { status: 500 });
    }

    const [bing, yandex] = await Promise.all([
      submitToIndexNow(urls, BING_ENDPOINT, indexNowKey, baseUrl),
      submitToIndexNow(urls, YANDEX_ENDPOINT, indexNowKey, baseUrl),
    ]);

    return NextResponse.json({
      success: true,
      urlCount: urls.length,
      bing: bing.ok ? 'submitted' : 'failed',
      yandex: yandex.ok ? 'submitted' : 'failed',
    });
  } catch (err) {
    console.error('IndexNow error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'IndexNow submission failed' },
      { status: 500 }
    );
  }
}
