import { getTrustedAppOrigin } from '@/lib/trusted-app-origin';
import { stripContactPiiForWebQuery } from '@/lib/ai-report-builder/tavily-context';
import { isValidTempUploadPath } from '@/lib/sanitize-filename';

describe('getTrustedAppOrigin', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env.SITE_URL = original.SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = original.NEXT_PUBLIC_SITE_URL;
    process.env.VERCEL_URL = original.VERCEL_URL;
  });

  it('prefers SITE_URL over Host-style values', () => {
    process.env.SITE_URL = 'https://resources.sageoutdooradvisory.com/';
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_URL;
    expect(getTrustedAppOrigin()).toBe('https://resources.sageoutdooradvisory.com');
  });

  it('falls back to VERCEL_URL with https', () => {
    delete process.env.SITE_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.VERCEL_URL = 'my-app.vercel.app';
    expect(getTrustedAppOrigin()).toBe('https://my-app.vercel.app');
  });
});

describe('stripContactPiiForWebQuery', () => {
  it('removes email and phone from amenity briefs', () => {
    const cleaned = stripContactPiiForWebQuery(
      'Current use: farm. Client email: baikodc@gmail.com Client phone: 2166500625 Glamping wellness'
    );
    expect(cleaned).not.toMatch(/baikodc@gmail\.com/);
    expect(cleaned).not.toMatch(/2166500625/);
    expect(cleaned).toMatch(/Glamping wellness/i);
  });
});

describe('isValidTempUploadPath for comparables upload', () => {
  it('allows only temp-uploads uuid paths', () => {
    expect(
      isValidTempUploadPath('temp-uploads/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/file.xlsx')
    ).toBe(true);
    expect(isValidTempUploadPath('some-report-id/workbooks/file.xlsx')).toBe(false);
    expect(isValidTempUploadPath('../evil.xlsx')).toBe(false);
  });
});
