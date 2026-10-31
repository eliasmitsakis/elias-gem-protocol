import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Private image proxy: both the user and the artifact owner must match.
export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });
  }

  const token = req.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const userClient = createClient(supabaseUrl, anonKey);
  const { data: { user }, error: authError } = await userClient.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  let recordId: unknown;
  try {
    ({ recordId } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  if (!((typeof recordId === 'string' && /^\d+$/.test(recordId)) ||
        (typeof recordId === 'number' && Number.isSafeInteger(recordId) && recordId > 0))) {
    return NextResponse.json({ error: 'Invalid record ID' }, { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: record, error: queryError } = await admin
    .from('akashic_records')
    .select('image_url')
    .eq('id', recordId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (queryError) return NextResponse.json({ error: 'Unable to read record' }, { status: 500 });
  if (!record?.image_url) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const prefix = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/akashic_visions/`;
  if (!record.image_url.startsWith(prefix)) {
    return NextResponse.json({ error: 'Unsupported image source' }, { status: 404 });
  }
  const objectPath = decodeURIComponent(record.image_url.slice(prefix.length));
  if (!objectPath || objectPath.startsWith('/') || objectPath.includes('..')) {
    return NextResponse.json({ error: 'Invalid image path' }, { status: 400 });
  }
  const { data: blob, error: downloadError } = await admin.storage
    .from('akashic_visions').download(objectPath);
  if (downloadError || !blob) return NextResponse.json({ error: 'Image unavailable' }, { status: 404 });
  return new NextResponse(await blob.arrayBuffer(), {
    headers: {
      'Content-Type': blob.type || 'image/jpeg',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
