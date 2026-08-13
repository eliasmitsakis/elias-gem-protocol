import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

// Define the file path for the Akashic Records (Local JSON fallback)
const dataFilePath = path.join(process.cwd(), 'src', 'data', 'akashic_records.json');

export interface TransmutationRecord {
  id: string;
  timestamp: string;
  vibrationText: string;
  description?: string;
  aethericCode: string;
  seedOfTruth: string;
  imagePrompt: string;
  executionOutput?: {
    stdout: string;
    stderr: string;
  };
}

const ensureDataFile = () => {
  const dirPath = path.dirname(dataFilePath);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  if (!fs.existsSync(dataFilePath)) {
    fs.writeFileSync(dataFilePath, JSON.stringify([]), 'utf-8');
  }
};

export async function GET(req: Request) {
  try {
    // 1. SUPABASE CLOUD (Primary) — filter by user_id when authenticated
    if (isSupabaseConfigured && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const authHeader = req.headers.get('Authorization');
      const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

      // Require authentication — no token means no records
      if (!accessToken) {
        return NextResponse.json([]);
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
        return NextResponse.json([]);
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
          executionOutput: row.executionoutput
        };
      });

      return NextResponse.json(transformedData);
    }

    // 2. LOCAL JSON FALLBACK
    ensureDataFile();
    const data = fs.readFileSync(dataFilePath, 'utf-8');
    const records: TransmutationRecord[] = JSON.parse(data);
    const sortedRecords = records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return NextResponse.json(sortedRecords);
    
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

      if (recordId) {
        // Update existing record created by /api/transmute
        const { data, error } = await userSupabase
          .from('akashic_records')
          .update({
            executionoutput: record.executionOutput
          })
          .eq('id', recordId)
          .eq('user_id', user.id);
        dbError = error;
        dbData = data;
      } else {
        // Fallback insert if no recordId was provided
        const { data, error } = await userSupabase
          .from('akashic_records')
          .insert([
             {
               user_id: user.id,
               vibrationtext: record.vibrationText,
               description: record.description || null,
               aethericcode: record.aethericCode,
               seedoftruth: record.seedOfTruth,
               imageprompt: record.imagePrompt,
               image_url: imageUrl,
               executionoutput: record.executionOutput
             }
          ]);
        dbError = error;
        dbData = data;
      }
       
      if (dbError) {
         console.error("Supabase POST Error", dbError);
         throw dbError;
      }

       // Fal.ai image generation has been moved to /api/transmute to avoid duplicate calls.


       return NextResponse.json({ message: 'Record written to Supabase successfully.', record: dbData });
    }
    
    // 2. LOCAL JSON FALLBACK (no auth gate in local mode)
    ensureDataFile();
    const fileData = fs.readFileSync(dataFilePath, 'utf-8');
    let records: TransmutationRecord[] = [];
    try {
      records = JSON.parse(fileData);
    } catch(e) {}

    const newRecord: TransmutationRecord & { imageUrl?: string } = {
      ...record,
      id: recordId || crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      imageUrl: imageUrl
    };

    records.push(newRecord);
    fs.writeFileSync(dataFilePath, JSON.stringify(records, null, 2), 'utf-8');

    return NextResponse.json({ message: 'Record written to local JSON successfully.', record: newRecord });
  } catch (error) {
    console.error("Error writing to Akashic Records", error);
    return NextResponse.json({ error: 'Failed to imprint the Akashic vibration.' }, { status: 500 });
  }
}

// --- Image generation and upload logic (copied from transmute) ---
async function generateImageAndUpload(prompt: string, supabaseAdminClient: any) {
  try {
    const STYLE_SUFFIX = ', vector art style, minimalist mystical illustration, clean lines, zen aesthetic, graphic tee design';
    const styledPrompt = prompt + STYLE_SUFFIX;

    const falRes = await fetch('https://fal.run/fal-ai/flux/schnell', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${process.env.FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: styledPrompt,
        image_size: 'square_hd',
        num_inference_steps: 4,
        num_images: 1,
        enable_safety_checker: false,
      }),
    });

    if (!falRes.ok) return null;

    const falData = await falRes.json();
    const falImageUrl = falData?.images?.[0]?.url;

    if (falImageUrl) {
      const imgRes = await fetch(falImageUrl);
      if (imgRes.ok) {
        const arrayBuffer = await imgRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const crypto = require('crypto');
        const promptHash = crypto.createHash('md5').update(prompt).digest('hex');
        const fileName = `${promptHash}.jpg`;

        const { error: uploadError } = await supabaseAdminClient.storage
          .from('akashic_visions')
          .upload(fileName, buffer, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (uploadError) return null;

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const baseUrl = supabaseUrl.endsWith('/') ? supabaseUrl.slice(0, -1) : supabaseUrl;
        return `${baseUrl}/storage/v1/object/public/akashic_visions/${fileName}`;
      }
    }
  } catch (e) {
    console.error("Backfill generation failed", e);
  }
  return null;
}

// PATCH: backfill image_url for old records that were saved without one
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { accessToken, recordId, prompt } = body;

    if (!accessToken || !recordId || !prompt) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    if (isSupabaseConfigured && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      // 1. Verify user session
      const userSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
      );

      const { data: { user }, error: userError } = await userSupabase.auth.getUser();
      if (userError || !user) {
        return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });
      }

      // 2. Generate and upload image using service role (for storage bypass if needed)
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      const uploadedUrl = await generateImageAndUpload(prompt, adminClient);
      if (!uploadedUrl) {
        return NextResponse.json({ error: 'Failed to generate and upload image.' }, { status: 500 });
      }

      // 3. Update the record
      const { error } = await userSupabase
        .from('akashic_records')
        .update({ image_url: uploadedUrl })
        .eq('id', recordId)
        .eq('user_id', user.id)
        .is('image_url', null); // Only backfill if still missing

      if (error) {
        console.error('PATCH image_url error:', error);
        return NextResponse.json({ error: 'Failed to backfill image_url.' }, { status: 500 });
      }

      return NextResponse.json({ message: 'image_url backfilled.', imageUrl: uploadedUrl });
    }

    return NextResponse.json({ message: 'Local mode — no backfill needed.' });
  } catch (error) {
    console.error('PATCH akasha error:', error);
    return NextResponse.json({ error: 'Unexpected error.' }, { status: 500 });
  }
}
