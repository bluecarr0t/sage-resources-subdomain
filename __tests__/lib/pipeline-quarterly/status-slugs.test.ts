import {
  GATED_PAGE_PIPELINE_QUARTERLY,
  getGatedPageRedirectPath,
  isGatedPageSlug,
} from '@/lib/gated-access';
import {
  PIPELINE_QUARTERLY_FUNNEL_SLUGS,
  PIPELINE_QUARTERLY_MARKET,
  parsePipelineQuarterlyStatusSlug,
  pipelineQuarterlyOverviewPath,
  pipelineQuarterlyStatusPath,
} from '@/lib/pipeline-quarterly/status-slugs';
import { isPipelineQuarterlyProductEnabled } from '@/lib/pipeline-quarterly/is-enabled';

describe('pipeline-quarterly status slugs', () => {
  it('parses known status slugs', () => {
    expect(parsePipelineQuarterlyStatusSlug('proposed-development')?.label).toBe(
      'Proposed Development'
    );
    expect(parsePipelineQuarterlyStatusSlug('newly-opened')?.isQuarterlyTransition).toBe(true);
    expect(parsePipelineQuarterlyStatusSlug('invalid')).toBeNull();
  });

  it('defines the supply-forecast funnel stages', () => {
    expect(PIPELINE_QUARTERLY_FUNNEL_SLUGS).toEqual([
      'proposed-development',
      'under-construction',
      'open',
    ]);
  });

  it('builds overview and status paths (US-only, no tier filter)', () => {
    expect(PIPELINE_QUARTERLY_MARKET).toBe('us');
    expect(pipelineQuarterlyOverviewPath()).toBe('/outdoor-hospitality-pipeline');
    expect(pipelineQuarterlyStatusPath('under-construction')).toBe(
      '/outdoor-hospitality-pipeline/under-construction'
    );
    expect(pipelineQuarterlyStatusPath('open')).toBe('/outdoor-hospitality-pipeline/open');
    expect(pipelineQuarterlyStatusPath('under-construction', { state: 'TX' })).toBe(
      '/outdoor-hospitality-pipeline/under-construction?state=TX'
    );
  });
});

describe('pipeline-quarterly gated access', () => {
  it('registers the pipeline quarterly slug', () => {
    expect(isGatedPageSlug(GATED_PAGE_PIPELINE_QUARTERLY)).toBe(true);
    expect(getGatedPageRedirectPath(GATED_PAGE_PIPELINE_QUARTERLY)).toBe(
      '/outdoor-hospitality-pipeline'
    );
  });
});

describe('isPipelineQuarterlyProductEnabled', () => {
  const original = process.env.ENABLE_PIPELINE_QUARTERLY_PRODUCT;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.ENABLE_PIPELINE_QUARTERLY_PRODUCT;
    } else {
      process.env.ENABLE_PIPELINE_QUARTERLY_PRODUCT = original;
    }
  });

  it('is disabled unless env flag is true', () => {
    delete process.env.ENABLE_PIPELINE_QUARTERLY_PRODUCT;
    expect(isPipelineQuarterlyProductEnabled()).toBe(false);
    process.env.ENABLE_PIPELINE_QUARTERLY_PRODUCT = 'true';
    expect(isPipelineQuarterlyProductEnabled()).toBe(true);
  });
});
