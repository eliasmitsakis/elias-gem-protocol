import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isSupabaseConfigured } from '@/lib/supabaseClient';

interface TransmutationRecord {
  id: string;
  timestamp: string;
  vibrationText: string;
  description?: string;
  aethericCode: string;
  seedOfTruth: string;
  imagePrompt: string;
  executionOutput?: { stdout: string; stderr: string };
  is_diary?: boolean;
}

export async function GET(req: Request) {
  try {
    // 1. SUPABASE CLOUD (Primary) — filter by user_id when authenticated
    if (isSupabaseConfigured && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const authHeader = req.headers.get('Authorization');
      const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

      // Require authentication — no token means no records
      if (!accessToken) {
        return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
      }

      // Build a user-scoped client so auth.uid() resolves correctly
      const userSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
      );

      // Validate the token and resolve the user's ID
      const { data: { user }, error: userError } = await userSupabase.auth.getUser();
      if (userError || !user) {
        return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
      }

      // Fetch only this user's records
      const { data, error } = await userSupabase
        .from('akashic_records')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Supabase GET Error", error);
        throw error;
      }

      const transformedData = (data || []).map((row: any) => {
        return {
          id: row.id,
          timestamp: row.created_at,
          vibrationText: row.vibrationtext,
          description: row.description,
          aethericCode: row.aethericcode,
          seedOfTruth: row.seedoftruth,
          imagePrompt: row.imageprompt,
          imageUrl: row.image_url,
          executionOutput: row.executionoutput,
          is_diary: row.is_diary || false
        };
      });

      return NextResponse.json(transformedData, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    return NextResponse.json({ error: 'Records service unavailable' }, { status: 503 });
  } catch (error) {
    console.error("Failed to read Akashic Records", error);
    return NextResponse.json({ error: 'Failed to access the Akashic Records database.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { accessToken, recordId, imageUrl, ...record }: { accessToken?: string, recordId?: string, imageUrl?: string } & Omit<TransmutationRecord, 'id' | 'timestamp'> = body;

    // 1. SUPABASE CLOUD (Primary)
    if (isSupabaseConfigured && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      // Gate: require an authenticated user token for INSERT
      if (!accessToken) {
        return NextResponse.json({ error: 'Authentication required to transmute.' }, { status: 401 });
      }

      // Create a user-scoped Supabase client so auth.uid() resolves correctly in RLS
      const userSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          global: {
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        }
      );

      // Resolve the user's ID from their JWT
      const { data: { user }, error: userError } = await userSupabase.auth.getUser();
      if (userError || !user) {
        console.error("Invalid access token", userError);
        return NextResponse.json({ error: 'Invalid or expired session. Please sign in again.' }, { status: 401 });
      }

      let dbError;
      let dbData;

      if (!recordId) {
        return NextResponse.json(
          { error: 'Record was not created by the credit-gated generation endpoint.' },
          { status: 409 }
        );
      }
      // Only update a record that was already created by /api/transmute
      // or /api/diary; do not let this route create free records.
      const { data, error } = await userSupabase
        .from('akashic_records')
        .update({ executionoutput: record.executionOutput })
        .eq('id', recordId)
        .eq('user_id', user.id)
        .select('id');
      dbError = error;
      dbData = data;
      if (!error && (!data || data.length === 0)) {
        return NextResponse.json({ error: 'Record not found' }, { status: 404 });
      }

      if (dbError) {
         console.error("Supabase POST Error", dbError);
         throw dbError;
      }

       // Fal.ai image generation has been moved to /api/transmute to avoid duplicate calls.


       return NextResponse.json({ message: 'Record written to Supabase successfully.', record: dbData });
    }
    
    return NextResponse.json({ error: 'Records service unavailable' }, { status: 503 });
  } catch (error) {
    console.error("Error writing to Akashic Records", error);
    return NextResponse.json({ error: 'Failed to imprint the Akashic vibration.' }, { status: 500 });
  }
}

// Missing-image regeneration is disabled until it is integrated with
// atomic per-user credit billing and rate limiting.
export async function PATCH() {
  return NextResponse.json(
    { error: 'Image regeneration is unavailable.' },
    { status: 403 }
  );
}
