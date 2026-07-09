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

      const crypto = require('crypto');
      const transformedData = (data || []).map((row: any) => {
        let imageUrl = null;
        if (row.imageprompt && process.env.NEXT_PUBLIC_SUPABASE_URL) {
          const promptHash = crypto.createHash('md5').update(row.imageprompt).digest('hex');
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL.endsWith('/') ? process.env.NEXT_PUBLIC_SUPABASE_URL.slice(0, -1) : process.env.NEXT_PUBLIC_SUPABASE_URL;
          imageUrl = `${supabaseUrl}/storage/v1/object/public/akashic_visions/${promptHash}.jpg`;
        }

        return {
          id: row.id,
          timestamp: row.created_at,
          vibrationText: row.vibrationtext,
          description: row.description,
          aethericCode: row.aethericcode,
          seedOfTruth: row.seedoftruth,
          imagePrompt: row.imageprompt,
          imageUrl: imageUrl,
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
    const { accessToken, ...record }: { accessToken?: string } & Omit<TransmutationRecord, 'id' | 'timestamp'> = body;

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
             executionoutput: record.executionOutput
           }
        ]);
       
       if (error) {
          console.error("Supabase POST Error", error);
          throw error;
       }

       // Generate and upload image to Supabase Storage using Fal.ai Flux.1 Schnell
       if (record.imagePrompt && process.env.FAL_KEY) {
         try {
           // 1. Generate image via Fal.ai Flux.1 Schnell (square_hd = 1344×1344px)
           const falRes = await fetch('https://fal.run/fal-ai/flux/schnell', {
             method: 'POST',
             headers: {
               'Authorization': `Key ${process.env.FAL_KEY}`,
               'Content-Type': 'application/json',
             },
             body: JSON.stringify({
               prompt: record.imagePrompt,
               image_size: 'square_hd',
               num_inference_steps: 4,
               num_images: 1,
               enable_safety_checker: false,
             }),
           });

           if (falRes.ok) {
             const falData = await falRes.json();
             const falImageUrl = falData?.images?.[0]?.url;

             if (falImageUrl) {
               // 2. Fetch the image bytes from Fal CDN
               const imgRes = await fetch(falImageUrl);
               if (imgRes.ok) {
                 const buffer = await imgRes.arrayBuffer();

                 const crypto = require('crypto');
                 const promptHash = crypto.createHash('md5').update(record.imagePrompt).digest('hex');
                 const fileName = `${promptHash}.jpg`;

                 // 3. Upload to Supabase Storage
                 const { error: uploadError } = await userSupabase.storage
                   .from('akashic_visions')
                   .upload(fileName, buffer, {
                     contentType: 'image/jpeg',
                     upsert: true
                   });

                 if (uploadError) {
                   console.error("Supabase Storage Upload Error", uploadError);
                 }
               }
             }
           } else {
             const errText = await falRes.text();
             console.error("Fal.ai image generation failed:", falRes.status, errText);
           }
         } catch (e) {
           console.error("Failed to generate/upload vision via Fal.ai", e);
         }
       }

       return NextResponse.json({ message: 'Record written to Supabase successfully.', record: data });
    }
    
    // 2. LOCAL JSON FALLBACK (no auth gate in local mode)
    ensureDataFile();
    const fileData = fs.readFileSync(dataFilePath, 'utf-8');
    let records: TransmutationRecord[] = [];
    try {
      records = JSON.parse(fileData);
    } catch(e) {}

    const newRecord: TransmutationRecord = {
      ...record,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    };

    records.push(newRecord);
    fs.writeFileSync(dataFilePath, JSON.stringify(records, null, 2), 'utf-8');

    return NextResponse.json({ message: 'Record written to local JSON successfully.', record: newRecord });
  } catch (error) {
    console.error("Error writing to Akashic Records", error);
    return NextResponse.json({ error: 'Failed to imprint the Akashic vibration.' }, { status: 500 });
  }
}
