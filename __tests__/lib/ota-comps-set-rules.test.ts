/**
 * @jest-environment node
 */
import {
  hasParkWaterfrontAccess,
  isDestinationParkName,
  isFhuQualityAnalog,
  isHipcampBellTentSku,
  isLocalCorePark,
  isMobileHomeParkName,
  isSparseCoverageParkName,
  isWaterfrontSiteName,
} from '@/lib/ota-comps-set-rules';

describe('Sparta primary-set classifiers', () => {
  it('keeps true waterfront SKUs and drops inland / non-waterfront / van-tent', () => {
    expect(isWaterfrontSiteName('Standard Water-Front')).toBe(true);
    expect(isWaterfrontSiteName('Deluxe Water-Front')).toBe(true);
    expect(isWaterfrontSiteName('Classic Waterfront')).toBe(true);
    expect(isWaterfrontSiteName('On River 50 AMP RV Site')).toBe(true);
    expect(isWaterfrontSiteName('Lake View RV Site')).toBe(true);
    expect(isWaterfrontSiteName('Water Access 50 Amp')).toBe(true);
    expect(isWaterfrontSiteName('Creekside 30 Amp RV')).toBe(true);
    expect(isWaterfrontSiteName('Premium Inland')).toBe(false);
    expect(isWaterfrontSiteName('Non-Waterfront 30/50 Amp RV Site')).toBe(false);
    expect(isWaterfrontSiteName('On River Van - Pop Up - Tent Site')).toBe(false);
  });

  it('drops mobile-home parks from the local core', () => {
    expect(
      isMobileHomeParkName('Pine Grove Mobile Home & RV Campground - Cookeville, TN'),
    ).toBe(true);
    expect(
      isLocalCorePark({
        miles: 19.2,
        rvSiteCount: 21,
        propertyName: 'Pine Grove Mobile Home & RV Campground - Cookeville, TN',
      }),
    ).toBe(false);
    expect(
      isLocalCorePark({
        miles: 9.7,
        rvSiteCount: 30,
        propertyName: "Frank's at Cane Hollow - Sparta, TN",
      }),
    ).toBe(true);
    expect(
      isLocalCorePark({
        miles: 5.3,
        rvSiteCount: 14,
        propertyName: 'Calfkiller Bend Campground - Doyle, TN',
      }),
    ).toBe(false);
  });

  it('keeps 25–80 FHU analogs and sends Elm Hill / Watts Bar to destination', () => {
    expect(isDestinationParkName('Elm Hill RV Resort')).toBe(true);
    expect(isDestinationParkName('Jellystone Park™ Watts Bar Lake')).toBe(true);
    expect(
      isFhuQualityAnalog({
        fhuSiteCount: 39,
        propertyName: 'Full Throttle Campground - Robbins, TN',
      }),
    ).toBe(true);
    expect(isFhuQualityAnalog({ fhuSiteCount: 126, propertyName: 'Elm Hill RV Resort' })).toBe(
      false,
    );
    expect(
      isLocalCorePark({
        miles: 10,
        rvSiteCount: 50,
        propertyName: 'Elm Hill RV Resort',
      }),
    ).toBe(false);
    expect(isSparseCoverageParkName('Full Throttle Campground - Robbins, TN')).toBe(true);
  });

  it('treats park Waterfront/Beach amenities or view/access SKUs as waterfront access', () => {
    expect(
      hasParkWaterfrontAccess({
        hasWaterfrontAmenity: true,
        siteNames: ['Back-In 50 Amp'],
      }),
    ).toBe(true);
    expect(
      hasParkWaterfrontAccess({
        hasBeachAmenity: true,
        siteNames: ['Pull Through'],
      }),
    ).toBe(true);
    expect(
      hasParkWaterfrontAccess({
        hasWaterfrontAmenity: false,
        siteNames: ['Lake View RV Site'],
      }),
    ).toBe(true);
    expect(
      hasParkWaterfrontAccess({
        hasWaterfrontAmenity: false,
        hasBeachAmenity: false,
        siteNames: ['Pull Through 50 Amp'],
      }),
    ).toBe(false);
  });

  it('matches Hipcamp bell / safari / canvas tent SKUs only', () => {
    expect(isHipcampBellTentSku({ category: 'bell-tent', siteName: 'Lost Creek Falls Glamping Tent' })).toBe(
      true,
    );
    expect(isHipcampBellTentSku({ category: 'canvas-tent', siteName: 'Glamping Wall Tent' })).toBe(true);
    expect(isHipcampBellTentSku({ category: 'tents', siteName: 'Tent Site' })).toBe(false);
    expect(isHipcampBellTentSku({ category: 'rv-tent', siteName: 'Pull through and back-ins' })).toBe(
      false,
    );
  });
});
