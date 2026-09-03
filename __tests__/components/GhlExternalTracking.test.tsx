/**
 * Server HTML for GHL External Tracking (View Source).
 * @jest-environment node
 */

import { renderToStaticMarkup } from 'react-dom/server';
import GhlExternalTracking from '@/components/GhlExternalTracking';

describe('GhlExternalTracking', () => {
  const originalVercel = process.env.VERCEL_ENV;
  const originalPublicVercel = process.env.NEXT_PUBLIC_VERCEL_ENV;

  afterEach(() => {
    process.env.VERCEL_ENV = originalVercel;
    process.env.NEXT_PUBLIC_VERCEL_ENV = originalPublicVercel;
  });

  it('emits the GHL script in HTML so View Source can find it', () => {
    delete process.env.VERCEL_ENV;
    delete process.env.NEXT_PUBLIC_VERCEL_ENV;

    const html = renderToStaticMarkup(
      <GhlExternalTracking pathname="/en" />
    );

    expect(html).toContain('external-tracking.js');
    expect(html).toContain('https://link.msgsndr.com/js/external-tracking.js');
    expect(html).toContain('data-tracking-id="tk_856ca8c83b494b0f971b30be0a84b581"');
  });

  it('does not emit on admin routes', () => {
    delete process.env.VERCEL_ENV;
    delete process.env.NEXT_PUBLIC_VERCEL_ENV;

    const html = renderToStaticMarkup(
      <GhlExternalTracking pathname="/admin/job-pipeline" />
    );

    expect(html).not.toContain('external-tracking.js');
  });
});
