import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  try {
    const [menusRes, aliasesRes] = await Promise.all([
      fetch('https://api.line.me/v2/bot/richmenu/list', {
        headers: { 'Authorization': `Bearer ${token}` },
      }),
      fetch('https://api.line.me/v2/bot/richmenu/alias/list', {
        headers: { 'Authorization': `Bearer ${token}` },
      }),
    ]);

    const menus = menusRes.ok ? await menusRes.json() : { richmenus: [] };
    const aliases = aliasesRes.ok ? await aliasesRes.json() : { aliases: [] };

    return NextResponse.json({
      menus: menus.richmenus || [],
      aliases: aliases.aliases || [],
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const richMenuId = searchParams.get('richMenuId');

  if (!token || !richMenuId) {
    return NextResponse.json({ error: 'Missing token or richMenuId' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.line.me/v2/bot/richmenu/${richMenuId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}
