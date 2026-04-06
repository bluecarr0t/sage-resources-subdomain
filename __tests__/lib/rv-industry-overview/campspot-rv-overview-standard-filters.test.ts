import {
  passesStandardCampspotOccupancyPercent,
  passesStandardCampspotRetailRateUsd,
  rowPassesStandardCampspot2025Quality,
} from '@/lib/rv-industry-overview/campspot-rv-overview-standard-filters';

describe('campspot-rv-overview-standard-filters', () => {
  describe('passesStandardCampspotOccupancyPercent', () => {
    it('accepts 10–99% inclusive', () => {
      expect(passesStandardCampspotOccupancyPercent(10)).toBe(true);
      expect(passesStandardCampspotOccupancyPercent(50)).toBe(true);
      expect(passesStandardCampspotOccupancyPercent(99)).toBe(true);
    });

    it('rejects below 10%, at 100%, and above 100%', () => {
      expect(passesStandardCampspotOccupancyPercent(9.99)).toBe(false);
      expect(passesStandardCampspotOccupancyPercent(100)).toBe(false);
      expect(passesStandardCampspotOccupancyPercent(100.01)).toBe(false);
      expect(passesStandardCampspotOccupancyPercent(null)).toBe(false);
    });
  });

  describe('passesStandardCampspotRetailRateUsd', () => {
    it('accepts $10–$3,000 inclusive', () => {
      expect(passesStandardCampspotRetailRateUsd(10)).toBe(true);
      expect(passesStandardCampspotRetailRateUsd(250)).toBe(true);
      expect(passesStandardCampspotRetailRateUsd(3_000)).toBe(true);
    });

    it('rejects below $10 and above $3,000', () => {
      expect(passesStandardCampspotRetailRateUsd(9.99)).toBe(false);
      expect(passesStandardCampspotRetailRateUsd(3_000.01)).toBe(false);
      expect(passesStandardCampspotRetailRateUsd(null)).toBe(false);
    });
  });

  describe('rowPassesStandardCampspot2025Quality', () => {
    it('requires 2025 occupancy in band and 2025 ARDR from annual column in band', () => {
      expect(
        rowPassesStandardCampspot2025Quality({
          occupancy_rate_2025: '50',
          avg_retail_daily_rate_2025: '100',
        })
      ).toBe(true);
      expect(
        rowPassesStandardCampspot2025Quality({
          occupancy_rate_2025: '5',
          avg_retail_daily_rate_2025: '100',
        })
      ).toBe(false);
      expect(
        rowPassesStandardCampspot2025Quality({
          occupancy_rate_2025: '100',
          avg_retail_daily_rate_2025: '100',
        })
      ).toBe(false);
      expect(
        rowPassesStandardCampspot2025Quality({
          occupancy_rate_2025: '50',
          avg_retail_daily_rate_2025: '5',
        })
      ).toBe(false);
    });
  });
});
