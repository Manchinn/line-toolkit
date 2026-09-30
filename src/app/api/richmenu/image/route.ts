import { NextResponse } from 'next/server';

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
  const { searchParams } = new URL(req.url);
  const richMenuId = searchParams.get('richMenuId');

  if (!token) {
    return NextResponse.json(
      { error: 'Missing or invalid Authorization header (Bearer token required)' },
      { status: 401 }
    );
  }

  if (!richMenuId) {
    return NextResponse.json(
      { error: 'Missing richMenuId parameter' },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(`https://api-data.line.me/v2/bot/richmenu/${encodeURIComponent(richMenuId)}/content`, {
      headers: { Authorization: 'Bearer ' + token },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => 'Failed to fetch image');
      return NextResponse.json(
        { error: `LINE API Error: ${errText}` },
        { status: res.status }
      );
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const buffer = await res.arrayBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
