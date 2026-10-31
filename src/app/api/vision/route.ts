import { NextResponse } from 'next/server';

// Images are generated through the authenticated, credit-gated /api/transmute
// workflow. Unmetered ad-hoc generation is intentionally disabled.
export async function GET() {
  return NextResponse.json(
    { error: 'Standalone image generation is disabled. Use transmutation.' },
    { status: 403 }
  );
}
