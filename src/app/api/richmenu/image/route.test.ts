import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';

describe('API Route: /api/richmenu/image (Image Streaming Proxy)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects GET with 401 when Authorization header is missing', async () => {
    const req = new Request('http://localhost:3000/api/richmenu/image?richMenuId=rm_test', {
      method: 'GET',
    });

    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('Authorization header');
  });

  it('rejects GET with 400 when richMenuId is missing', async () => {
    const req = new Request('http://localhost:3000/api/richmenu/image', {
      method: 'GET',
      headers: { Authorization: 'Bearer valid_token' },
    });

    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('richMenuId');
  });

  it('proxies image data with correct Content-Type and Cache-Control headers', async () => {
    const dummyImageBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // PNG header bytes
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(dummyImageBytes, {
        status: 200,
        headers: { 'content-type': 'image/png' },
      })
    );
    vi.stubGlobal('fetch', mockFetch);

    const req = new Request('http://localhost:3000/api/richmenu/image?richMenuId=richmenu-12345', {
      method: 'GET',
      headers: { Authorization: 'Bearer test_image_token' },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    expect(res.headers.get('cache-control')).toBe('private, max-age=300');

    const buffer = await res.arrayBuffer();
    expect(buffer.byteLength).toBe(dummyImageBytes.byteLength);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api-data.line.me/v2/bot/richmenu/richmenu-12345/content',
      expect.objectContaining({
        headers: { Authorization: 'Bearer test_image_token' },
      })
    );
  });

  it('handles case-insensitive bearer token in Authorization header', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { 'content-type': 'image/jpeg' },
      })
    );
    vi.stubGlobal('fetch', mockFetch);

    const req = new Request('http://localhost:3000/api/richmenu/image?richMenuId=rm_abc', {
      headers: { Authorization: 'bearer lowercase_bearer_token' },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: { Authorization: 'Bearer lowercase_bearer_token' },
      })
    );
  });

  it('forwards error when LINE API fails to find image (404)', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response('Image not found', { status: 404 })
    );
    vi.stubGlobal('fetch', mockFetch);

    const req = new Request('http://localhost:3000/api/richmenu/image?richMenuId=rm_notfound', {
      headers: { Authorization: 'Bearer valid_token' },
    });

    const res = await GET(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain('LINE API Error');
  });
});
