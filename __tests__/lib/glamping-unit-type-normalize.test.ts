import {
  normalizeGlampingUnitTypeForDisplay,
  normalizeGlampingUnitTypeForStorage,
  primaryGlampingUnitTypeSegment,
} from '@/lib/glamping-unit-type-normalize';

describe('primaryGlampingUnitTypeSegment', () => {
  it('takes the first comma-separated label', () => {
    expect(primaryGlampingUnitTypeSegment('Safari Tent, Cabin')).toBe('Safari Tent');
  });

  it('takes the first slash-separated label', () => {
    expect(primaryGlampingUnitTypeSegment('Yurt / Dome')).toBe('Yurt');
  });

  it('takes the first "and"-separated label', () => {
    expect(primaryGlampingUnitTypeSegment('Safari Tent and Treehouse')).toBe('Safari Tent');
  });
});

describe('normalizeGlampingUnitTypeForStorage', () => {
  it('returns null for empty input', () => {
    expect(normalizeGlampingUnitTypeForStorage(null)).toBeNull();
    expect(normalizeGlampingUnitTypeForStorage('')).toBeNull();
    expect(normalizeGlampingUnitTypeForStorage('   ')).toBeNull();
  });

  it('uses known phrase map (plural to singular)', () => {
    expect(normalizeGlampingUnitTypeForStorage('safari tents')).toBe('Safari Tent');
    expect(normalizeGlampingUnitTypeForStorage('yurts')).toBe('Yurt');
  });

  it('keeps only the first segment then normalizes', () => {
    expect(normalizeGlampingUnitTypeForStorage('Luxury Tent, Cabin')).toBeNull();
    expect(normalizeGlampingUnitTypeForStorage('Safari Tents, Yurts')).toBe('Safari Tent');
  });

  it('title-cases unknown two-word plurals', () => {
    expect(normalizeGlampingUnitTypeForStorage('Beach Cabins')).toBe('Beach Cabin');
  });

  it('formats A-Frame and RV Site', () => {
    expect(normalizeGlampingUnitTypeForStorage('a-frames')).toBe('A-Frame');
    expect(normalizeGlampingUnitTypeForStorage('aframe')).toBe('A-Frame');
    expect(normalizeGlampingUnitTypeForStorage('Aframes')).toBe('A-Frame');
    expect(normalizeGlampingUnitTypeForStorage('rv sites')).toBe('RV Site');
  });

  it('maps wagon aliases to Covered Wagon (not generic Wagon)', () => {
    expect(normalizeGlampingUnitTypeForStorage('Wagon')).toBe('Covered Wagon');
    expect(normalizeGlampingUnitTypeForStorage('wagons')).toBe('Covered Wagon');
    expect(normalizeGlampingUnitTypeForStorage('covered wagon')).toBe('Covered Wagon');
    expect(normalizeGlampingUnitTypeForStorage('Conestoga Wagons')).toBe('Covered Wagon');
    expect(normalizeGlampingUnitTypeForStorage('wagonette')).toBe('Wagonette');
  });

  it('maps geodesic dome and geodome aliases to Dome', () => {
    expect(normalizeGlampingUnitTypeForStorage('geodesic dome')).toBe('Dome');
    expect(normalizeGlampingUnitTypeForStorage('Geodesic Domes')).toBe('Dome');
    expect(normalizeGlampingUnitTypeForStorage('geodome')).toBe('Dome');
  });

  it('maps bubble dome marketing labels to Bubble Tent', () => {
    expect(normalizeGlampingUnitTypeForStorage('Bubble Dome')).toBe('Bubble Tent');
    expect(normalizeGlampingUnitTypeForStorage('bubble domes')).toBe('Bubble Tent');
  });

  it('maps Jupe branded shelter aliases to Jupe', () => {
    expect(normalizeGlampingUnitTypeForStorage('Jupe')).toBe('Jupe');
    expect(normalizeGlampingUnitTypeForStorage('jupes')).toBe('Jupe');
    expect(normalizeGlampingUnitTypeForStorage('Jupe Tent')).toBe('Jupe');
    expect(normalizeGlampingUnitTypeForStorage('jupe tents')).toBe('Jupe');
  });

  it('maps Bothy / Cliffside Room / Lushna to structural types', () => {
    expect(normalizeGlampingUnitTypeForStorage('Bothy')).toBe('Cabin');
    expect(normalizeGlampingUnitTypeForStorage('bothies')).toBe('Cabin');
    expect(normalizeGlampingUnitTypeForStorage('Cliffside Room')).toBe('Hotel Room');
    expect(normalizeGlampingUnitTypeForStorage('Lushna Cabin')).toBe('A-Frame');
    expect(normalizeGlampingUnitTypeForStorage('lushna')).toBe('A-Frame');
  });

  it('maps Luxury Treehouse variants to Treehouse', () => {
    expect(normalizeGlampingUnitTypeForStorage('Luxury Treehouse')).toBe('Treehouse');
    expect(normalizeGlampingUnitTypeForStorage('Luxury Tree House')).toBe('Treehouse');
    expect(normalizeGlampingUnitTypeForStorage('luxury treehouses')).toBe('Treehouse');
  });

  it('does not store retired Property buyout or Mixed as a unit type', () => {
    expect(normalizeGlampingUnitTypeForStorage('Property buyout')).toBeNull();
    expect(normalizeGlampingUnitTypeForStorage('property buy-outs')).toBeNull();
    expect(normalizeGlampingUnitTypeForStorage('Mixed')).toBeNull();
    expect(normalizeGlampingUnitTypeForStorage('mixed glamping')).toBeNull();
  });

  it('maps canvas cabin aliases to Canvas Cabin; tent-cabin / tentalow to Cabin Tent', () => {
    expect(normalizeGlampingUnitTypeForStorage('Canvas Cabin')).toBe('Canvas Cabin');
    expect(normalizeGlampingUnitTypeForStorage('canvas cabins')).toBe('Canvas Cabin');
    expect(normalizeGlampingUnitTypeForStorage('Family Canvas Cabin')).toBe('Canvas Cabin');
    expect(normalizeGlampingUnitTypeForStorage('Classic Canvas Cabin')).toBe('Canvas Cabin');
    expect(normalizeGlampingUnitTypeForStorage('Tent-Cabin')).toBe('Cabin Tent');
    expect(normalizeGlampingUnitTypeForStorage('cabin tent')).toBe('Cabin Tent');
    expect(normalizeGlampingUnitTypeForStorage('Tentalow')).toBe('Cabin Tent');
    expect(normalizeGlampingUnitTypeForStorage('Deluxe Tent Cabin')).toBe('Cabin Tent');
  });

  it('maps wall tent to Safari Tent and teepee to Tipi', () => {
    expect(normalizeGlampingUnitTypeForStorage('wall tent')).toBe('Safari Tent');
    expect(normalizeGlampingUnitTypeForStorage('Wall Tents')).toBe('Safari Tent');
    expect(normalizeGlampingUnitTypeForStorage('teepee')).toBe('Tipi');
    expect(normalizeGlampingUnitTypeForStorage('teepees')).toBe('Tipi');
  });

  it('maps mirror / ÖÖD / glass cabin aliases to Mirror Cabin', () => {
    expect(normalizeGlampingUnitTypeForStorage('Mirror Cabin')).toBe('Mirror Cabin');
    expect(normalizeGlampingUnitTypeForStorage('mirror cabins')).toBe('Mirror Cabin');
    expect(normalizeGlampingUnitTypeForStorage('Mirrored Cabin')).toBe('Mirror Cabin');
    expect(normalizeGlampingUnitTypeForStorage('Mirror House')).toBe('Mirror Cabin');
    expect(normalizeGlampingUnitTypeForStorage('glass cabin')).toBe('Mirror Cabin');
    expect(normalizeGlampingUnitTypeForStorage('Glass Cabins')).toBe('Mirror Cabin');
    expect(normalizeGlampingUnitTypeForStorage('ÖÖD House')).toBe('Mirror Cabin');
    expect(normalizeGlampingUnitTypeForStorage('ood house')).toBe('Mirror Cabin');
    expect(normalizeGlampingUnitTypeForStorage('ood mirror cabin')).toBe('Mirror Cabin');
  });

  it('maps hobbit home and cave labels; ambiguous glamping tent → null', () => {
    expect(normalizeGlampingUnitTypeForStorage('Hobbit Home')).toBe('Hobbit House');
    expect(normalizeGlampingUnitTypeForStorage('cave')).toBe('Cave House');
    expect(normalizeGlampingUnitTypeForStorage('Cave Room')).toBe('Cave Room');
    expect(normalizeGlampingUnitTypeForStorage('glamping tent')).toBeNull();
  });

  it('returns null for ambiguous tent labels (not Safari Tent or Canvas Tent)', () => {
    expect(normalizeGlampingUnitTypeForStorage('tent')).toBeNull();
    expect(normalizeGlampingUnitTypeForStorage('tents')).toBeNull();
    expect(normalizeGlampingUnitTypeForStorage('Luxury Tent')).toBeNull();
    expect(normalizeGlampingUnitTypeForStorage('deluxe tents')).toBeNull();
    expect(normalizeGlampingUnitTypeForStorage('canvas tent')).toBeNull();
    expect(normalizeGlampingUnitTypeForStorage('Safari Tent')).toBe('Safari Tent');
  });
});
describe('normalizeGlampingUnitTypeForDisplay', () => {
  it('canonicalizes merged Sage matview unit text', () => {
    expect(normalizeGlampingUnitTypeForDisplay('Geodesic Dome Glamping Resort')).toBe('Dome');
    expect(normalizeGlampingUnitTypeForDisplay('geodesic dome glamping')).toBe('Dome');
    expect(normalizeGlampingUnitTypeForDisplay('Safari Tent Glamping Resort')).toBe('Safari Tent');
  });

  it('extracts multiple main unit types from compound strings', () => {
    expect(normalizeGlampingUnitTypeForDisplay('Tiny Home Casita Cabins')).toBe('Tiny Home, Cabin');
    expect(normalizeGlampingUnitTypeForDisplay('Safari Tent, Yurt')).toBe('Safari Tent, Yurt');
    expect(normalizeGlampingUnitTypeForDisplay('Cabin and Treehouse')).toBe('Cabin, Treehouse');
  });

  it('falls back to storage normalization for simple labels', () => {
    expect(normalizeGlampingUnitTypeForDisplay('yurts')).toBe('Yurt');
    expect(normalizeGlampingUnitTypeForDisplay('2 unit types')).toBe('2 Unit Types');
    expect(normalizeGlampingUnitTypeForDisplay('Bell Tent')).toBe('Bell Tent');
  });
});
