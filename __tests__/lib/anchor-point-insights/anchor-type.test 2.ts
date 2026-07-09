import {
  anchorUsesSlugFilter,
  anchorUsesYearAvgStateRate,
  parseAnchorPointAnchorType,
} from '@/lib/anchor-point-insights/anchor-type';

describe('parseAnchorPointAnchorType', () => {
  it('parses ski, national-parks, and wineries', () => {
    expect(parseAnchorPointAnchorType('ski')).toBe('ski');
    expect(parseAnchorPointAnchorType('national-parks')).toBe('national-parks');
    expect(parseAnchorPointAnchorType('wineries')).toBe('wineries');
    expect(parseAnchorPointAnchorType('WINERIES')).toBe('wineries');
  });

  it('defaults unknown values to ski', () => {
    expect(parseAnchorPointAnchorType(null)).toBe('ski');
    expect(parseAnchorPointAnchorType('campground')).toBe('ski');
  });
});

describe('anchor type behavior', () => {
  it('only national parks use slug filters', () => {
    expect(anchorUsesSlugFilter('national-parks')).toBe(true);
    expect(anchorUsesSlugFilter('ski')).toBe(false);
    expect(anchorUsesSlugFilter('wineries')).toBe(false);
  });

  it('wineries use year-average state rates like parks', () => {
    expect(anchorUsesYearAvgStateRate('ski')).toBe(false);
    expect(anchorUsesYearAvgStateRate('national-parks')).toBe(true);
    expect(anchorUsesYearAvgStateRate('wineries')).toBe(true);
  });
});
