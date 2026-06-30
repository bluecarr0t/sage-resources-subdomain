/**
 * @jest-environment node
 */
import { resolveOtaWarehouseBackend } from '@/lib/ota-warehouse-db';

describe('ota-warehouse-db', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('prefers Supabase when SUPABASE_DB_URL is set', () => {
    process.env.SUPABASE_DB_URL = 'postgresql://example';
    delete process.env.VERCEL;
    expect(resolveOtaWarehouseBackend()).toBe('supabase');
  });

  it('requires Supabase on Vercel', () => {
    delete process.env.SUPABASE_DB_URL;
    process.env.VERCEL = '1';
    expect(() => resolveOtaWarehouseBackend()).toThrow(/SUPABASE_DB_URL is required on Vercel/);
  });

  it('falls back to DigitalOcean off Vercel without Supabase URL', () => {
    delete process.env.SUPABASE_DB_URL;
    delete process.env.VERCEL;
    expect(resolveOtaWarehouseBackend()).toBe('digitalocean');
  });
});
