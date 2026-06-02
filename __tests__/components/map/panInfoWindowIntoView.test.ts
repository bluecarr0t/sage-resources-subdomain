import {
  computeMarkerPixelDeltaToFitPopup,
  defaultInfoWindowPadding,
  markerScreenDeltaToPanBy,
} from '@/components/map/utils/panInfoWindowIntoView';

describe('panInfoWindowIntoView', () => {
  const padding = defaultInfoWindowPadding(false);

  it('returns zero delta when popup fits inside safe area', () => {
    const { dx, dy } = computeMarkerPixelDeltaToFitPopup({
      markerX: 400,
      markerY: 450,
      mapWidth: 800,
      mapHeight: 600,
      padding,
    });
    expect(dx).toBe(0);
    expect(dy).toBe(0);
  });

  it('pans down when card would clip the top edge', () => {
    const { dx, dy } = computeMarkerPixelDeltaToFitPopup({
      markerX: 400,
      markerY: 40,
      mapWidth: 800,
      mapHeight: 600,
      padding,
    });
    expect(dx).toBe(0);
    expect(dy).toBeGreaterThan(0);
  });

  it('inverts screen delta for map.panBy', () => {
    expect(markerScreenDeltaToPanBy(10, 20)).toEqual({ x: -10, y: -20 });
  });
});
