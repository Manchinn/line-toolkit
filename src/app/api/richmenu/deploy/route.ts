import { NextResponse } from 'next/server';

interface DeployPayload {
  token: string;
  tab: {
    aliasId: string;
    chatBarText: string;
    size: { width: number; height: number };
    selected: boolean;
    areas: Array<{
      bounds: { x: number; y: number; width: number; height: number };
      action: any;
    }>;
  };
  imageBase64: string; // data:image/png;base64,... or pure base64
  isDefault?: boolean;
}

export async function POST(req: Request) {
  try {
    const body: DeployPayload = await req.json();
    const { token, tab, imageBase64, isDefault } = body;

    if (!token) {
      return NextResponse.json({ error: 'Missing Channel Access Token' }, { status: 400 });
    }

    // Clean base64 string
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const contentType = imageBase64.includes('image/jpeg') ? 'image/jpeg' : 'image/png';

    // 1. Create Rich Menu Schema
    const richMenuPayload = {
      size: tab.size,
      selected: tab.selected ?? true,
      name: tab.aliasId || `Menu_${Date.now()}`,
      chatBarText: tab.chatBarText || 'เมนู',
      areas: tab.areas.map(a => {
        const action: Record<string, any> = { type: a.action.type };
        if (a.action.label) action.label = a.action.label;
        if (a.action.type === 'message') {
          action.text = a.action.text || ' ';
        } else if (a.action.type === 'uri') {
          action.uri = a.action.uri || 'https://line.me';
        } else if (a.action.type === 'richmenuswitch') {
          action.richMenuAliasId = a.action.richMenuAliasId;
          action.data = a.action.data || `switch-to-${a.action.richMenuAliasId}`;
        } else if (a.action.type === 'postback') {
          action.data = a.action.data || 'postback-click';
        }
        return {
          bounds: {
            x: Math.round(a.bounds.x),
            y: Math.round(a.bounds.y),
            width: Math.round(a.bounds.width),
            height: Math.round(a.bounds.height),
          },
          action,
        };
      }),
    };

    const createRes = await fetch('https://api.line.me/v2/bot/richmenu', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(richMenuPayload),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      return NextResponse.json({ error: `LINE API Error (Create): ${errText}` }, { status: createRes.status });
    }

    const { richMenuId } = await createRes.json();

    // 2. Upload Image Binary
    const uploadRes = await fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': contentType,
      },
      body: imageBuffer,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      return NextResponse.json({ error: `LINE API Error (Upload Image): ${errText}` }, { status: uploadRes.status });
    }

    // 3. Setup Rich Menu Alias (if aliasId is set)
    if (tab.aliasId) {
      // First try deleting existing alias if exists
      await fetch(`https://api.line.me/v2/bot/richmenu/alias/${tab.aliasId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const aliasRes = await fetch('https://api.line.me/v2/bot/richmenu/alias', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
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
        headers: { 'Authorization': `Bearer ${token}` },
      });
    }

    return NextResponse.json({
      success: true,
      richMenuId,
      aliasId: tab.aliasId,
      isDefault: !!isDefault,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
