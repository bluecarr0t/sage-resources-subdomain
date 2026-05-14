import {
  DEMAND_DRIVERS_MAX_RADIUS_MILES,
  resolveDemandDriverSearchRadii,
} from '@/lib/market-report/demand-drivers';

describe('resolveDemandDriverSearchRadii', () => {
  it('caps radii at DEMAND_DRIVERS_MAX_RADIUS_MILES', () => {
    const r = resolveDemandDriverSearchRadii(400);
    expect(r.parksRadiusMiles).toBe(DEMAND_DRIVERS_MAX_RADIUS_MILES);
    expect(r.skiRadiusMiles).toBe(DEMAND_DRIVERS_MAX_RADIUS_MILES);
    expect(r.wineriesRadiusMiles).toBe(DEMAND_DRIVERS_MAX_RADIUS_MILES);
    expect(r.majorOutdoorRadiusMiles).toBe(DEMAND_DRIVERS_MAX_RADIUS_MILES);
  });

  it('uses floor of market radius when within cap', () => {
    const r = resolveDemandDriverSearchRadii(88.7);
    expect(r.parksRadiusMiles).toBe(88);
    expect(r.majorOutdoorRadiusMiles).toBe(88);
  });

  it('floors at 1 mile for tiny inputs', () => {
    const r = resolveDemandDriverSearchRadii(0);
    expect(r.parksRadiusMiles).toBe(1);
  });
});
