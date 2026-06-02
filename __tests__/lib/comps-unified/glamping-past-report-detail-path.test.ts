import {
  glampingPastReportDetailPath,
  glampingPastReportDetailUrl,
} from '@/lib/comps-unified/glamping-past-report-detail-path';

describe('glampingPastReportDetailPath', () => {
  it('builds admin study detail URL', () => {
    expect(glampingPastReportDetailPath('25-257A-07')).toBe(
      '/admin/glamping-properties/25-257A-07'
    );
  });
});

describe('glampingPastReportDetailUrl', () => {
  it('uses window origin for map InfoWindow links', () => {
    const origin = window.location.origin;
    expect(glampingPastReportDetailUrl('25-257A-07')).toBe(
      `${origin}/admin/glamping-properties/25-257A-07`
    );
  });
});
