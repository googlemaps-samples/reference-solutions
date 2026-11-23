import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
    return NextResponse.json(
      {
        error:
          'Google Maps Platform API key is not configured for Maps Static API proxy.',
      },
      { status: 500 }
    );
  }

  const { searchParams } = request.nextUrl;
  const originLat = Number(searchParams.get('originLat'));
  const originLng = Number(searchParams.get('originLng'));
  const destLat = Number(searchParams.get('destLat'));
  const destLng = Number(searchParams.get('destLng'));
  const encodedPolyline = searchParams.get('polyline') || '';

  if (
    !Number.isFinite(originLat) ||
    !Number.isFinite(originLng) ||
    !Number.isFinite(destLat) ||
    !Number.isFinite(destLng)
  ) {
    return NextResponse.json(
      { error: 'Valid originLat, originLng, destLat, and destLng query params are required.' },
      { status: 400 }
    );
  }

  const staticParams = new URLSearchParams({
    size: '600x260',
    scale: '2',
    maptype: 'roadmap',
    format: 'png',
    key: apiKey,
  });

  staticParams.append(
    'markers',
    `color:0x0f766e|label:K|${originLat.toFixed(6)},${originLng.toFixed(6)}`
  );
  staticParams.append(
    'markers',
    `color:0xe11d48|label:D|${destLat.toFixed(6)},${destLng.toFixed(6)}`
  );

  if (encodedPolyline && encodedPolyline.length <= 1800) {
    staticParams.append('path', `weight:5|color:0x2563ebFF|enc:${encodedPolyline}`);
  } else {
    staticParams.append(
      'path',
      `weight:5|color:0x2563ebFF|${originLat.toFixed(6)},${originLng.toFixed(6)}|${destLat.toFixed(6)},${destLng.toFixed(6)}`
    );
  }

  try {
    const upstreamRes = await fetch(
      `https://maps.googleapis.com/maps/api/staticmap?${staticParams.toString()}`,
      { cache: 'no-store' }
    );

    if (!upstreamRes.ok) {
      const text = await upstreamRes.text();
      return NextResponse.json(
        {
          error: `Maps Static API returned status ${upstreamRes.status}`,
          details: text.slice(0, 300),
        },
        { status: upstreamRes.status }
      );
    }

    const imageBuffer = await upstreamRes.arrayBuffer();

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': upstreamRes.headers.get('content-type') || 'image/png',
        'Cache-Control': 'private, max-age=300',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch static route map.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
