/**
 * Unit tests for Area Analysis section parsing and static map URL helpers.
 */

import {
  formatAreaAnalysisSections,
  matchAreaBucket,
  matchLabeledSectionKey,
  parseAreaAnalysisSections,
  parseLabeledSections,
} from '@/lib/ai-report-builder/area-analysis-sections';
import {
  buildLocalAreaMapUrl,
  buildStateAreaMapUrl,
  buildStaticMapUrl,
  prioritizeWeatherSparkChartUrls,
} from '@/lib/ai-report-builder/figures';

describe('parseAreaAnalysisSections', () => {
  it('parses Overview / State / County / Local delimiters', () => {
    const text = formatAreaAnalysisSections({
      overview: 'Overview para about Ravalli County in Victor, Montana.',
      state: 'Montana is Big Sky Country.',
      county: 'Ravalli County sits in the Bitterroot Valley.',
      local: 'Victor is an unincorporated community.',
    });

    const parsed = parseAreaAnalysisSections(text);
    expect(parsed.overview).toContain('Ravalli County');
    expect(parsed.state).toContain('Big Sky');
    expect(parsed.county).toContain('Bitterroot');
    expect(parsed.local).toContain('unincorporated');
  });

  it('puts unlabeled prose into overview', () => {
    const parsed = parseAreaAnalysisSections('Just a single overview blob.');
    expect(parsed.overview).toBe('Just a single overview blob.');
    expect(parsed.state).toBe('');
  });

  it('matchAreaBucket recognizes Local Area', () => {
    expect(matchAreaBucket('Local Area')).toBe('local');
    expect(matchAreaBucket('County')).toBe('county');
  });
});

describe('parseLabeledSections', () => {
  it('maps Weather heading for Demand Indicators', () => {
    const text = `=== Weather ===
Intro climate paragraph.

Summary
• Hot Months: June to September.

=== Tourism Trends ===
Tourism is strong in summer.
`;
    const labeled = parseLabeledSections(text);
    expect(labeled.weather).toContain('Hot Months');
    expect(labeled['tourism trends']).toContain('summer');
    expect(
      matchLabeledSectionKey("What's in my Community - ESRI Analysis", {
        "what's in my community - esri analysis": 'x',
        weather: 'y',
      })
    ).toBe("what's in my community - esri analysis");
  });
});

describe('buildStaticMapUrl', () => {
  const prev = process.env.GOOGLE_MAPS_API_KEY;

  afterEach(() => {
    if (prev == null) delete process.env.GOOGLE_MAPS_API_KEY;
    else process.env.GOOGLE_MAPS_API_KEY = prev;
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  });

  it('returns null without API key', () => {
    delete process.env.GOOGLE_MAPS_API_KEY;
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    expect(buildStaticMapUrl(46.4, -114.1)).toBeNull();
  });

  it('builds state and local URLs with Subject marker', () => {
    process.env.GOOGLE_MAPS_API_KEY = 'test-key';
    const state = buildStateAreaMapUrl(46.4, -114.1);
    const local = buildLocalAreaMapUrl(46.4, -114.1);
    expect(state).toContain('zoom=6');
    expect(state).toContain('markers=color%3Ared%7Clabel%3AS%7C46.4%2C-114.1');
    expect(local).toContain('zoom=12');
    expect(local).toContain('key=test-key');
  });
});

describe('prioritizeWeatherSparkChartUrls', () => {
  it('ranks temperature and tourism ahead of logos', () => {
    const ranked = prioritizeWeatherSparkChartUrls([
      'https://cdn.example.com/logo.png',
      'https://weatherspark.com/img/tourism-score.png',
      'https://weatherspark.com/img/average-temperature.png',
    ]);
    expect(ranked[0]).toContain('temperature');
    expect(ranked[1]).toContain('tourism');
    expect(ranked).not.toContain('https://cdn.example.com/logo.png');
  });
});
