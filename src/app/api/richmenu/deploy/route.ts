import { NextResponse } from 'next/server';
import type { AreaAction, AreaBounds, MenuSize } from '@/types/line';
import { ALIAS_ID_PATTERN } from '@/lib/richmenu/actions';
import { buildRichMenuPayload, validateTab, type TabLike } from '@/lib/richmenu/payload';

/** LINE rich menu image limit. */
const MAX_IMAGE_BYTES = 1024 * 1024;

interface DeployPayload {
  token: string;
  tab: {
    title?: string;
    aliasId: string;
    chatBarText: string;
    size: MenuSize;
    selected: boolean;
    areas: Array<{ bounds: AreaBounds; action: AreaAction }>;
  };
  imageBase64: string; // data:image/png;base64,... or pure base64
  isDefault?: boolean;
}

function isDeployPayload(body: unknown): body is DeployPayload {
  if (!body || typeof body !== 'object') return false;
  const b = body as Partial<DeployPayload>;
  return (
    typeof b.token === 'string' &&
    typeof b.imageBase64 === 'string' &&
    !!b.tab &&
    typeof b.tab === 'object' &&
    Array.isArray(b.tab.areas) &&
    !!b.tab.size &&
    typeof b.tab.chatBarText === 'string'
  );
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    if (!isDeployPayload(body)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const { token, tab, imageBase64, isDefault } = body;

    if (!token) {
      return NextResponse.json({ error: 'Missing Channel Access Token' }, { status: 400 });
    }

    // Validate with the same rules as the editor (integer + in-bounds areas, configured actions).
    const tabLike: TabLike = {
      title: tab.title ?? tab.aliasId,
      aliasId: tab.aliasId,
      selected: !!tab.selected,
      chatBarText: tab.chatBarText,
      size: tab.size,
      areas: tab.areas,
    };
    const issues = validateTab(tabLike);
    if (issues.length > 0) {
      return NextResponse.json({ error: issues.map((i) => i.message).join(' · ') }, { status: 422 });
    }

    // Clean base64 string
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    if (imageBuffer.byteLength === 0) {
      return NextResponse.json({ error: 'Missing rich menu image' }, { status: 400 });
    }
    if (imageBuffer.byteLength > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'รูปภาพต้องมีขนาดไม่เกิน 1 MB (ข้อกำหนดของ LINE)' }, { status: 413 });
    }
    const contentType = imageBase64.includes('image/jpeg') ? 'image/jpeg' : 'image/png';

    // 1. Create Rich Menu Schema
    const richMenuPayload = { ...buildRichMenuPayload(tabLike), name: tab.aliasId || `Menu_${Date.now()}` };

    const createRes = await fetch('https://api.line.me/v2/bot/richmenu', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(richMenuPayload),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      return NextResponse.json({ error: `LINE API Error (Create): ${errText}` }, { status: createRes.status });
    }

    const { richMenuId } = (await createRes.json()) as { richMenuId: string };

    // 2. Upload Image Binary
    const uploadRes = await fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': contentType,
      },
      body: imageBuffer,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      return NextResponse.json({ error: `LINE API Error (Upload Image): ${errText}` }, { status: uploadRes.status });
    }

    // 3. Setup Rich Menu Alias (if aliasId is set and valid)
    if (tab.aliasId && ALIAS_ID_PATTERN.test(tab.aliasId)) {
      const aliasPath = encodeURIComponent(tab.aliasId);
      // First try deleting existing alias if exists
      await fetch(`https://api.line.me/v2/bot/richmenu/alias/${aliasPath}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const aliasRes = await fetch('https://api.line.me/v2/bot/richmenu/alias', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          richMenuAliasId: tab.aliasId,
          richMenuId,
        }),
      });

      if (!aliasRes.ok) {
        const aliasErr = await aliasRes.text();
        console.warn('Alias set warning:', aliasErr);
      }
    }

    // 4. Set Default if requested
    if (isDefault) {
      await fetch(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    }

    return NextResponse.json({
      success: true,
      richMenuId,
      aliasId: tab.aliasId,
      isDefault: !!isDefault,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
