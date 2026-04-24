/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { authorizeVercelCronRequest } from '@/lib/vercel-cron-auth';

describe('authorizeVercelCronRequest', () => {
  const original = process.env.CRON_SECRET;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = original;
    }
  });

  it('returns true when CRON_SECRET is not set', () => {
    delete process.env.CRON_SECRET;
    const req = new NextRequest('https://example.com/api/cron/x');
    expect(authorizeVercelCronRequest(req)).toBe(true);
  });

  it('returns true when Bearer matches CRON_SECRET', () => {
    process.env.CRON_SECRET = 'abc';
    const req = new NextRequest('https://example.com/api/cron/x', {
      headers: { authorization: 'Bearer abc' },
    });
    expect(authorizeVercelCronRequest(req)).toBe(true);
  });

  it('returns false when CRON_SECRET is set and Authorization is wrong', () => {
    process.env.CRON_SECRET = 'abc';
    const req = new NextRequest('https://example.com/api/cron/x', {
      headers: { authorization: 'Bearer wrong' },
    });
    expect(authorizeVercelCronRequest(req)).toBe(false);
  });

  it('returns true when x-vercel-cron is 1 (scheduled cron without bearer)', () => {
    process.env.CRON_SECRET = 'abc';
    const req = new NextRequest('https://example.com/api/cron/x', {
      headers: { 'x-vercel-cron': '1' },
    });
    expect(authorizeVercelCronRequest(req)).toBe(true);
  });

  it('returns true when user-agent contains vercel-cron', () => {
    process.env.CRON_SECRET = 'abc';
    const req = new NextRequest('https://example.com/api/cron/x', {
      headers: { 'user-agent': 'vercel-cron/1.0' },
    });
    expect(authorizeVercelCronRequest(req)).toBe(true);
  });
});
