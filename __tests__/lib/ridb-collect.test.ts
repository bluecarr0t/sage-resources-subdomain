import {
  isCampingFacility,
  normalizeRidbTimestamp,
  parseRidbCollectCliArgs,
} from '@/lib/ridb-collect';
import type { RIDBFacility } from '@/lib/types/ridb';

describe('parseRidbCollectCliArgs', () => {
  it('defaults to full mode', () => {
    expect(parseRidbCollectCliArgs(['node', 'script.ts'])).toEqual({
      mode: 'full',
      resetProgress: false,
    });
  });

  it('parses incremental and reset flags', () => {
    expect(
      parseRidbCollectCliArgs(['node', 'script.ts', '--mode=incremental', '--reset-progress'])
    ).toEqual({
      mode: 'incremental',
      resetProgress: true,
    });
  });

  it('throws on invalid mode', () => {
    expect(() => parseRidbCollectCliArgs(['node', 'script.ts', '--mode=weekly'])).toThrow(
      /Invalid --mode/
    );
  });
});

describe('isCampingFacility', () => {
  it('matches campground facility types', () => {
    const facility = {
      FacilityID: '1',
      FacilityName: 'Test',
      FacilityTypeDescription: 'Campground',
    } as RIDBFacility;
    expect(isCampingFacility(facility)).toBe(true);
  });

  it('rejects unrelated facilities', () => {
    const facility = {
      FacilityID: '2',
      FacilityName: 'Visitor Center',
      FacilityTypeDescription: 'Visitor Center',
    } as RIDBFacility;
    expect(isCampingFacility(facility)).toBe(false);
  });
});

describe('normalizeRidbTimestamp', () => {
  it('returns ISO string for valid dates', () => {
    const iso = normalizeRidbTimestamp('2025-12-25T12:00:00Z');
    expect(iso).toMatch(/2025-12-25T12:00:00/);
  });

  it('returns null for empty input', () => {
    expect(normalizeRidbTimestamp(null)).toBeNull();
  });
});
