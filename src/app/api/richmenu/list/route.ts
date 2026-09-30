import { NextResponse } from 'next/server';

/**
 * Extracts Bearer token from the standard Authorization header (case-insensitive).
 * Falls back to URL query `?token=` for backwards compatibility with legacy callers.
 */
function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match && match[1].trim()) {
      return match[1].trim();
    }
  }
  const { searchParams } = new URL(req.url);
  const queryToken = searchParams.get('token');
  if (queryToken && queryToken.trim()) {
    return queryToken.trim();
  }
  return null;
}

export async function GET(req: Request) {
  const token = extractBearerToken(req);

  if (!token) {
    return NextResponse.json(
      { error: 'Missing or invalid Authorization header (Bearer token required)' },
      { status: 401 }
    );
  }

  try {
    const [menusRes, aliasesRes, defaultRes] = await Promise.all([
      fetch('https://api.line.me/v2/bot/richmenu/list', {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch('https://api.line.me/v2/bot/richmenu/alias/list', {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch('https://api.line.me/v2/bot/user/all/richmenu', {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    // Handle token authorization failure immediately
    if (menusRes.status === 401 || aliasesRes.status === 401 || defaultRes.status === 401) {
      return NextResponse.json({ error: 'Invalid LINE Channel Access Token' }, { status: 401 });
    }

    // Handle upstream rate limiting or errors explicitly instead of silently swallowing as empty list
    if (!menusRes.ok) {
      const errText = await menusRes.text().catch(() => '');
      return NextResponse.json(
        { error: `LINE API Error (${menusRes.status}): ${errText || menusRes.statusText}` },
        { status: menusRes.status }
      );
    }

    if (!aliasesRes.ok && aliasesRes.status !== 404) {
      const errText = await aliasesRes.text().catch(() => '');
      return NextResponse.json(
        { error: `LINE API Error (${aliasesRes.status}): ${errText || aliasesRes.statusText}` },
        { status: aliasesRes.status }
      );
    }

    // Default richmenu returns 404 when no default menu is set, which is normal
    if (!defaultRes.ok && defaultRes.status !== 404) {
      if (defaultRes.status === 429) {
        return NextResponse.json(
          { error: 'LINE API Error (429): Rate limit exceeded' },
          { status: 429 }
        );
      }
    }

    const menus = await menusRes.json();
    const aliases = aliasesRes.ok ? await aliasesRes.json() : { aliases: [] };
    const defaultData = defaultRes.ok ? await defaultRes.json() : null;

    return NextResponse.json({
      menus: menus.richmenus || [],
      aliases: aliases.aliases || [],
      defaultMenuId: defaultData?.richMenuId || null,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const token = extractBearerToken(req);
  if (!token) {
    return NextResponse.json(
      { error: 'Missing or invalid Authorization header (Bearer token required)' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  let richMenuId = searchParams.get('richMenuId');
  let aliasId = searchParams.get('aliasId');

  if (!richMenuId && !aliasId) {
    try {
      const body = await req.json();
      if (body && typeof body === 'object') {
        richMenuId = body.richMenuId || null;
        aliasId = body.aliasId || null;
      }
    } catch {
      // Body is optional
    }
  }

  if (!richMenuId && !aliasId) {
    return NextResponse.json(
      { error: 'Missing richMenuId or aliasId parameter' },
      { status: 400 }
    );
  }

  try {
    // 1. Delete specific alias only
    if (aliasId && !richMenuId) {
      const res = await fetch(
        `https://api.line.me/v2/bot/richmenu/alias/${encodeURIComponent(aliasId)}`,
        {
          method: 'DELETE',
          headers: { Authorization: 'Bearer ' + token },
        }
      );
      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: err }, { status: res.status });
      }
      return NextResponse.json({ success: true, deletedAliasId: aliasId });
    }

    // 2. Delete rich menu (auto-unlinks aliases and default state if attached)
    if (richMenuId) {
      // Check and remove any aliases attached to this rich menu first,
      // because LINE API will reject DELETE /richmenu/{id} if an alias is attached.
      const aliasesRes = await fetch('https://api.line.me/v2/bot/richmenu/alias/list', {
        headers: { Authorization: 'Bearer ' + token },
      });

      if (!aliasesRes.ok && aliasesRes.status !== 404) {
        const err = await aliasesRes.text();
        return NextResponse.json(
          { error: `Failed to retrieve aliases before deletion: ${err}` },
          { status: aliasesRes.status }
        );
      }

      if (aliasesRes.ok) {
        const aliasData = await aliasesRes.json();
        const attachedAliases = (aliasData.aliases || []).filter(
          (a: { richMenuId: string; richMenuAliasId: string }) => a.richMenuId === richMenuId
        );
        for (const a of attachedAliases) {
          const delAliasRes = await fetch(
            `https://api.line.me/v2/bot/richmenu/alias/${encodeURIComponent(a.richMenuAliasId)}`,
            {
              method: 'DELETE',
              headers: { Authorization: 'Bearer ' + token },
            }
          );
          if (!delAliasRes.ok) {
            const err = await delAliasRes.text();
            return NextResponse.json(
              { error: `Failed to unlink attached alias "${a.richMenuAliasId}": ${err}` },
              { status: delAliasRes.status }
            );
          }
        }
      }

      // Check if it is currently set as the default menu for all users
      const defaultRes = await fetch('https://api.line.me/v2/bot/user/all/richmenu', {
        headers: { Authorization: 'Bearer ' + token },
      });
      if (defaultRes.ok) {
        const defaultData = await defaultRes.json().catch(() => null);
        if (defaultData?.richMenuId === richMenuId) {
          // Unset default menu
          const unsetRes = await fetch('https://api.line.me/v2/bot/user/all/richmenu', {
            method: 'DELETE',
            headers: { Authorization: 'Bearer ' + token },
          });
          if (!unsetRes.ok) {
            const err = await unsetRes.text();
            return NextResponse.json(
              { error: `Failed to unset default rich menu: ${err}` },
              { status: unsetRes.status }
            );
          }
        }
      }

      // Now delete the rich menu from LINE
      const res = await fetch(`https://api.line.me/v2/bot/richmenu/${encodeURIComponent(richMenuId)}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + token },
      });

      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: err }, { status: res.status });
      }

      return NextResponse.json({ success: true, deletedRichMenuId: richMenuId });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const token = extractBearerToken(req);
  if (!token) {
    return NextResponse.json(
      { error: 'Missing or invalid Authorization header (Bearer token required)' },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  try {
    const { action, richMenuId, aliasId } = body;

    if (action === 'setDefault') {
      if (!richMenuId || typeof richMenuId !== 'string') {
        return NextResponse.json({ error: 'Missing or invalid richMenuId' }, { status: 400 });
      }
      const res = await fetch(`https://api.line.me/v2/bot/user/all/richmenu/${encodeURIComponent(richMenuId)}`, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
      });
      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: err }, { status: res.status });
      }
      return NextResponse.json({ success: true, defaultMenuId: richMenuId });
    }

    if (action === 'unsetDefault') {
      const res = await fetch('https://api.line.me/v2/bot/user/all/richmenu', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + token },
      });
      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: err }, { status: res.status });
      }
      return NextResponse.json({ success: true, defaultMenuId: null });
    }

    if (action === 'deleteAlias') {
      if (!aliasId || typeof aliasId !== 'string') {
        return NextResponse.json({ error: 'Missing or invalid aliasId' }, { status: 400 });
      }
      const res = await fetch(
        `https://api.line.me/v2/bot/richmenu/alias/${encodeURIComponent(aliasId)}`,
        {
          method: 'DELETE',
          headers: { Authorization: 'Bearer ' + token },
        }
      );
      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: err }, { status: res.status });
      }
      return NextResponse.json({ success: true, deletedAliasId: aliasId });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
