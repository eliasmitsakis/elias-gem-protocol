import { NextRequest, NextResponse } from 'next/server';

const FAL_KEY = process.env.FAL_KEY;
const FAL_FLUX_ENDPOINT = 'https://fal.run/fal-ai/flux/schnell';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const prompt = searchParams.get('prompt');

  if (!prompt) {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
  }

  if (!FAL_KEY) {
    console.error('FAL_KEY environment variable is not set');
    return NextResponse.json({ error: 'Image generation not configured' }, { status: 500 });
  }

  try {
    // Append artistic style modifiers — pushes Flux away from photorealistic toward
    // vector illustration / merch / zen artwork style
    const STYLE_SUFFIX = ', vector art style, minimalist mystical illustration, clean lines, zen aesthetic, graphic tee design';
    const styledPrompt = prompt + STYLE_SUFFIX;

    // 1. Call Fal.ai Flux.1 Schnell to generate the image
    const falRes = await fetch(FAL_FLUX_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: styledPrompt,
        image_size: 'square_hd', // 1344×1344px
        num_inference_steps: 4,
        num_images: 1,
        enable_safety_checker: false,
      }),
    });

    if (!falRes.ok) {
      const errorText = await falRes.text();
      console.error('Fal.ai API Error:', falRes.status, errorText);
      throw new Error(`Fal.ai returned ${falRes.status}`);
    }

    const falData = await falRes.json();
    const imageUrl = falData?.images?.[0]?.url;

    if (!imageUrl) {
      throw new Error('No image URL returned from Fal.ai');
    }

    // 2. Fetch the actual image bytes from the Fal CDN and proxy them
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      throw new Error(`Failed to fetch image from Fal CDN: ${imgRes.status}`);
    }

    const imageBuffer = await imgRes.arrayBuffer();

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
