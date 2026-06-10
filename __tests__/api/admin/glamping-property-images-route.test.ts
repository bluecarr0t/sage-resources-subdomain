/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET, DELETE } from '@/app/api/admin/sage-glamping-data/properties/[id]/images/route';

jest.mock('@/lib/require-admin-auth', () => ({
  withAdminAuth:
    <T,>(
      handler: (
        req: NextRequest,
        auth: unknown,
        ctx?: T
      ) => Promise<Response>
    ) =>
    async (req: NextRequest, ctx?: T) =>
      handler(req, { supabase: {}, session: { user: { id: 'u1', email: 'a@test.com' } } }, ctx),
}));

const mockMaybeSingleProperty = jest.fn();
const mockImagesSelectChain = jest.fn();

jest.mock('@/lib/supabase', () => ({
  createServerClient: jest.fn(() => ({
    from: jest.fn((table: string) => {
      if (table === 'all_sage_data') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: mockMaybeSingleProperty,
            }),
          }),
        };
      }
      if (table === 'glamping_property_images') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                order: mockImagesSelectChain,
              }),
            }),
          }),
          delete: () => ({
            eq: () => ({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          }),
        };
      }
      return {};
    }),
    storage: {
      from: jest.fn(() => ({
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://test.supabase.co/storage/v1/object/public/glamping-media/${path}` },
        }),
        remove: jest.fn().mockResolvedValue({ error: null }),
      })),
    },
  })),
}));

describe('/api/admin/sage-glamping-data/properties/[id]/images', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMaybeSingleProperty.mockResolvedValue({ data: { id: 9 }, error: null });
    mockImagesSelectChain.mockResolvedValue({
      data: [
        {
          id: 'img-1',
          property_id: 9,
          storage_bucket: 'glamping-media',
          storage_path: '9/gallery/a.png',
          kind: 'gallery',
          sort_order: 0,
          mime_type: 'image/png',
          byte_size: 100,
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
      error: null,
    });
  });

  it('GET returns 400 for invalid property id', async () => {
    const req = new NextRequest('http://localhost/api/admin/sage-glamping-data/properties/x/images');
    const res = await GET(req, { params: Promise.resolve({ id: 'x' }) });
    expect(res.status).toBe(400);
  });

  it('GET returns images with public_url when property exists', async () => {
    const req = new NextRequest('http://localhost/api/admin/sage-glamping-data/properties/9/images');
    const res = await GET(req, { params: Promise.resolve({ id: '9' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.images).toHaveLength(1);
    expect(body.images[0].public_url).toContain('9/gallery/a.png');
  });

  it('GET returns 404 when property is missing', async () => {
    mockMaybeSingleProperty.mockResolvedValueOnce({ data: null, error: null });
    const req = new NextRequest('http://localhost/api/admin/sage-glamping-data/properties/99/images');
    const res = await GET(req, { params: Promise.resolve({ id: '99' }) });
    expect(res.status).toBe(404);
  });

  it('DELETE returns 400 without imageId', async () => {
    const req = new NextRequest('http://localhost/api/admin/sage-glamping-data/properties/9/images');
    const res = await DELETE(req, { params: Promise.resolve({ id: '9' }) });
    expect(res.status).toBe(400);
  });
});
