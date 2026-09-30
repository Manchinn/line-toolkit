import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, DELETE, POST } from './route';

describe('API Route: /api/richmenu/list (Security & Operations)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/richmenu/list', () => {
    it('rejects GET request with 401 when Authorization header is missing', async () => {
    const req = new Request('http://localhost:3000/api/richmenu/list', {
      method: 'GET',
    });

    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('Authorization header');
  });

  it('accepts Bearer token in Authorization header and returns rich menus', async () => {
    // Mock global fetch
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/richmenu/list')) {
        return Promise.resolve(new Response(JSON.stringify({
          richmenus: [{ richMenuId: 'rm_123', name: 'Test Menu' }],
        }), { status: 200 }));
      }
      if (url.includes('/richmenu/alias/list')) {
        return Promise.resolve(new Response(JSON.stringify({
          aliases: [{ richMenuAliasId: 'tab-a', richMenuId: 'rm_123' }],
        }), { status: 200 }));
      }
      if (url.includes('/user/all/richmenu')) {
        return Promise.resolve(new Response(JSON.stringify({
          richMenuId: 'rm_123',
        }), { status: 200 }));
      }
      return Promise.reject(new Error('Unknown URL'));
    });
    vi.stubGlobal('fetch', mockFetch);

    const req = new Request('http://localhost:3000/api/richmenu/list', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer test_token_xyz',
      },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.menus).toHaveLength(1);
    expect(data.aliases).toHaveLength(1);
    expect(data.defaultMenuId).toBe('rm_123');

    // Verify Authorization header was passed to LINE API
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.line.me/v2/bot/richmenu/list',
      expect.objectContaining({
        headers: { Authorization: 'Bearer test_token_xyz' },
      })
    );
    });

    it('accepts case-insensitive "bearer " header prefix', async () => {
      const mockFetch = vi.fn().mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ richmenus: [], aliases: [] }), { status: 200 }))
      );
      vi.stubGlobal('fetch', mockFetch);

      const req = new Request('http://localhost:3000/api/richmenu/list', {
        method: 'GET',
        headers: {
          Authorization: 'bearer case_insensitive_token',
        },
      });

      const res = await GET(req);
      expect(res.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: { Authorization: 'Bearer case_insensitive_token' },
        })
      );
    });

    it('accepts legacy fallback ?token= query parameter', async () => {
      const mockFetch = vi.fn().mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ richmenus: [], aliases: [] }), { status: 200 }))
      );
      vi.stubGlobal('fetch', mockFetch);

      const req = new Request('http://localhost:3000/api/richmenu/list?token=query_token_123', {
        method: 'GET',
      });

      const res = await GET(req);
      expect(res.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: { Authorization: 'Bearer query_token_123' },
        })
      );
    });

    it('handles LINE 404 for default menu as null defaultMenuId without error', async () => {
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/richmenu/list')) {
        return Promise.resolve(new Response(JSON.stringify({ richmenus: [] }), { status: 200 }));
      }
      if (url.includes('/richmenu/alias/list')) {
        return Promise.resolve(new Response(JSON.stringify({ aliases: [] }), { status: 200 }));
      }
      if (url.includes('/user/all/richmenu')) {
        return Promise.resolve(new Response(JSON.stringify({ message: 'Not found' }), { status: 404 }));
      }
      return Promise.reject(new Error('Unknown URL'));
    });
    vi.stubGlobal('fetch', mockFetch);

    const req = new Request('http://localhost:3000/api/richmenu/list', {
      headers: { Authorization: 'Bearer valid_token' },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.defaultMenuId).toBeNull();
    });

    it('returns 401 when LINE API rejects access token with 401', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'Invalid token' }), { status: 401 })));

    const req = new Request('http://localhost:3000/api/richmenu/list', {
      headers: { Authorization: 'Bearer bad_token' },
    });

    const res = await GET(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain('Invalid LINE Channel Access Token');
    });

    it('propagates 429 Rate Limit error instead of masking as empty list', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if (url.includes('/richmenu/list')) {
        return Promise.resolve(new Response('Rate limit reached', { status: 429 }));
      }
      return Promise.resolve(new Response('{}', { status: 200 }));
    }));

    const req = new Request('http://localhost:3000/api/richmenu/list', {
      headers: { Authorization: 'Bearer valid_token' },
    });

    const res = await GET(req);
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toContain('429');
    });
  });

  describe('DELETE /api/richmenu/list', () => {
    it('rejects DELETE request with 401 when Authorization header is missing', async () => {
      const req = new Request('http://localhost:3000/api/richmenu/list?richMenuId=rm_123', {
        method: 'DELETE',
      });

      const res = await DELETE(req);
      expect(res.status).toBe(401);
    });

    it('rejects DELETE request with 400 when richMenuId and aliasId are missing', async () => {
      const req = new Request('http://localhost:3000/api/richmenu/list', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer valid_token' },
      });

      const res = await DELETE(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('Missing richMenuId or aliasId');
    });

    it('deletes specific alias when aliasId is provided via query param', async () => {
      const mockFetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
      vi.stubGlobal('fetch', mockFetch);

      const req = new Request('http://localhost:3000/api/richmenu/list?aliasId=tab-promotion', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer valid_token' },
      });

      const res = await DELETE(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.deletedAliasId).toBe('tab-promotion');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.line.me/v2/bot/richmenu/alias/tab-promotion',
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('deletes rich menu and auto-unlinks multiple attached aliases and unsets default', async () => {
      const deletedCalls: string[] = [];
      const mockFetch = vi.fn().mockImplementation((url: string, opts?: { method?: string }) => {
        const method = opts?.method || 'GET';
        if (url.includes('/richmenu/alias/list')) {
          return Promise.resolve(new Response(JSON.stringify({
            aliases: [
              { richMenuAliasId: 'tab-a', richMenuId: 'rm_target' },
              { richMenuAliasId: 'tab-b', richMenuId: 'rm_target' },
              { richMenuAliasId: 'tab-other', richMenuId: 'rm_different' },
            ],
          }), { status: 200 }));
        }
        if (url.includes('/user/all/richmenu') && method === 'GET') {
          return Promise.resolve(new Response(JSON.stringify({
            richMenuId: 'rm_target',
          }), { status: 200 }));
        }
        if (method === 'DELETE') {
          deletedCalls.push(url);
          return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
        }
        return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
      });
      vi.stubGlobal('fetch', mockFetch);

      const req = new Request('http://localhost:3000/api/richmenu/list', {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer valid_token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ richMenuId: 'rm_target' }),
      });

      const res = await DELETE(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.deletedRichMenuId).toBe('rm_target');

      // Verify both attached aliases were deleted, but not tab-other
      expect(deletedCalls.some((url) => url.includes('/richmenu/alias/tab-a'))).toBe(true);
      expect(deletedCalls.some((url) => url.includes('/richmenu/alias/tab-b'))).toBe(true);
      expect(deletedCalls.some((url) => url.includes('/richmenu/alias/tab-other'))).toBe(false);
      // Verify default was unset
      expect(deletedCalls.some((url) => url.includes('/user/all/richmenu'))).toBe(true);
      // Verify richmenu was deleted
      expect(deletedCalls.some((url) => url.includes('/richmenu/rm_target'))).toBe(true);
    });

    it('stops and reports error if unlinking an attached alias fails halfway', async () => {
      const mockFetch = vi.fn().mockImplementation((url: string, opts?: { method?: string }) => {
        const method = opts?.method || 'GET';
        if (url.includes('/richmenu/alias/list')) {
          return Promise.resolve(new Response(JSON.stringify({
            aliases: [{ richMenuAliasId: 'tab-fail', richMenuId: 'rm_test' }],
          }), { status: 200 }));
        }
        if (url.includes('/richmenu/alias/tab-fail') && method === 'DELETE') {
          return Promise.resolve(new Response('Alias delete failed due to rate limit', { status: 429 }));
        }
        return Promise.resolve(new Response('{}', { status: 200 }));
      });
      vi.stubGlobal('fetch', mockFetch);

      const req = new Request('http://localhost:3000/api/richmenu/list?richMenuId=rm_test', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer valid_token' },
      });

      const res = await DELETE(req);
      expect(res.status).toBe(429);
      const data = await res.json();
      expect(data.error).toContain('Failed to unlink attached alias');

      // Verify menu deletion was NOT attempted because alias unlinking failed
      const calledUrls = mockFetch.mock.calls.map((c) => c[0] as string);
      expect(calledUrls.some((u) => u === 'https://api.line.me/v2/bot/richmenu/rm_test')).toBe(false);
    });

    it('forwards LINE API error when deleting rich menu fails', async () => {
      const mockFetch = vi.fn().mockImplementation((url: string, opts?: { method?: string }) => {
        const method = opts?.method || 'GET';
        if (url.includes('/richmenu/alias/list') || url.includes('/user/all/richmenu')) {
          return Promise.resolve(new Response(JSON.stringify({ aliases: [] }), { status: 200 }));
        }
        if (method === 'DELETE' && url.includes('/richmenu/rm_not_found')) {
          return Promise.resolve(new Response('Menu not found', { status: 404 }));
        }
        return Promise.resolve(new Response('{}', { status: 200 }));
      });
      vi.stubGlobal('fetch', mockFetch);

      const req = new Request('http://localhost:3000/api/richmenu/list?richMenuId=rm_not_found', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer valid_token' },
      });

      const res = await DELETE(req);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe('Menu not found');
    });
  });

  describe('POST /api/richmenu/list', () => {
    it('rejects POST with 401 when Authorization header is missing', async () => {
      const req = new Request('http://localhost:3000/api/richmenu/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setDefault', richMenuId: 'rm_123' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('rejects POST with 400 when request body is invalid JSON', async () => {
      const req = new Request('http://localhost:3000/api/richmenu/list', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid_token',
          'Content-Type': 'application/json',
        },
        body: 'invalid-json-content',
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Invalid JSON');
    });

    it('rejects POST with 400 for unknown action', async () => {
      const req = new Request('http://localhost:3000/api/richmenu/list', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid_token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'unknownAction' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Unknown action');
    });

    it('handles setDefault action successfully', async () => {
      const mockFetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
      vi.stubGlobal('fetch', mockFetch);

      const req = new Request('http://localhost:3000/api/richmenu/list', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid_token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'setDefault', richMenuId: 'rm_default_123' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.defaultMenuId).toBe('rm_default_123');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.line.me/v2/bot/user/all/richmenu/rm_default_123',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('rejects setDefault with 400 when richMenuId is missing', async () => {
      const req = new Request('http://localhost:3000/api/richmenu/list', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid_token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'setDefault' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('richMenuId');
    });

    it('handles unsetDefault action successfully', async () => {
      const mockFetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
      vi.stubGlobal('fetch', mockFetch);

      const req = new Request('http://localhost:3000/api/richmenu/list', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid_token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'unsetDefault' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.defaultMenuId).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.line.me/v2/bot/user/all/richmenu',
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('handles deleteAlias action successfully', async () => {
      const mockFetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
      vi.stubGlobal('fetch', mockFetch);

      const req = new Request('http://localhost:3000/api/richmenu/list', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid_token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'deleteAlias', aliasId: 'tab-promo' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.deletedAliasId).toBe('tab-promo');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.line.me/v2/bot/richmenu/alias/tab-promo',
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('rejects deleteAlias with 400 when aliasId is missing', async () => {
      const req = new Request('http://localhost:3000/api/richmenu/list', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid_token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'deleteAlias' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('aliasId');
    });
  });
});
