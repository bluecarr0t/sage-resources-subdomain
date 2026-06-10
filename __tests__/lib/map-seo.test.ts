import {
  mapIndexLocationsTitle,
  mapIndexPropertyCountDisplay,
} from '@/lib/map-seo';

describe('mapIndexPropertyCountDisplay', () => {
  it('floors to the nearest 25 for marketing copy', () => {
    expect(mapIndexPropertyCountDisplay(718)).toBe(700);
    expect(mapIndexPropertyCountDisplay(725)).toBe(725);
    expect(mapIndexPropertyCountDisplay(532)).toBe(525);
  });
});

describe('mapIndexLocationsTitle', () => {
  it('formats the map index locations title', () => {
    expect(mapIndexLocationsTitle(700)).toBe(
      'Glamping Properties Map | 700+ Locations'
    );
  });
});
