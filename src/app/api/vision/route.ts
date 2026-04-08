import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const prompt = searchParams.get('prompt');
  const width = searchParams.get('width') || '800';
  const height = searchParams.get('height') || '400';

  if (!prompt) {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
  }

  try {
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true`;
    
    // Fetch from Pollinations (bypassing Client-Side Adblockers)
    const res = await fetch(pollinationsUrl, {
      headers: {
        'User-Agent': 'Cyber-Zen-Bot/1.0',
        'Accept': 'image/*',
      },
    });

    if (!res.ok) {
      throw new Error(`Pollinations API returned ${res.status}`);
    }

    const imageBuffer = await res.arrayBuffer();

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Vision Proxy Error:', error);
    return NextResponse.json({ error: 'Failed to manifest vision' }, { status: 500 });
  }
}
