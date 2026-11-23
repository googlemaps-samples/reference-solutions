import { NextRequest, NextResponse } from 'next/server';

interface ValidateAddressRequestBody {
  addressLines?: string[];
  regionCode?: string;
  previousResponseId?: string;
  enableUspsCass?: boolean;
}

export async function POST(request: NextRequest) {
  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
    return NextResponse.json(
      {
        error:
          'Google Maps Platform API key is not configured. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (or GOOGLE_MAPS_API_KEY) in .env.local.',
      },
      { status: 500 }
    );
  }

  let body: ValidateAddressRequestBody;
  try {
    body = (await request.json()) as ValidateAddressRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const addressLines = Array.isArray(body.addressLines)
    ? body.addressLines.map((line) => String(line).trim()).filter(Boolean)
    : [];

  if (addressLines.length === 0) {
    return NextResponse.json(
      { error: 'At least one non-empty address line is required.' },
      { status: 400 }
    );
  }

  const upstreamPayload: Record<string, unknown> = {
    address: {
      regionCode: body.regionCode || 'US',
      addressLines,
    },
    enableUspsCass: body.enableUspsCass ?? true,
  };

  if (body.previousResponseId) {
    upstreamPayload.previousResponseId = body.previousResponseId;
  }

  try {
    const upstreamRes = await fetch(
      'https://addressvalidation.googleapis.com/v1:validateAddress',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
        },
        body: JSON.stringify(upstreamPayload),
        cache: 'no-store',
      }
    );

    const data = await upstreamRes.json();

    if (!upstreamRes.ok) {
      return NextResponse.json(
        {
          error:
            data?.error?.message ||
            `Address Validation API returned status ${upstreamRes.status}`,
          details: data?.error ?? data,
        },
        { status: upstreamRes.status }
      );
    }

    return NextResponse.json({
      responseId: data.responseId,
      result: {
        verdict: data.result?.verdict,
        address: data.result?.address,
        geocode: data.result?.geocode,
        metadata: data.result?.metadata,
        uspsData: data.result?.uspsData,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to reach Address Validation API.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
