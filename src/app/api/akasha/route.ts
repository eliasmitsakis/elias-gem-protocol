import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
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

export async function GET() {
  try {
    // 1. SUPABASE CLOUD (Primary)
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('akashic_records')
        .select('*')
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
    const record: Omit<TransmutationRecord, 'id' | 'timestamp'> = await req.json();

    // 1. SUPABASE CLOUD (Primary)
    if (isSupabaseConfigured && supabase) {
       const { data, error } = await supabase
          .from('akashic_records')
          .insert([
             {
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

       // Upload image to Supabase Storage if imagePrompt exists
       if (record.imagePrompt) {
         try {
           const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(record.imagePrompt)}?width=800&height=400&nologo=true`;
           const imgRes = await fetch(pollinationsUrl, { headers: { 'User-Agent': 'Cyber-Zen-Bot/1.0' }});
           if (imgRes.ok) {
             const buffer = await imgRes.arrayBuffer();
             
             // Create a safe, deterministic filename based on a hash of the prompt
             // We use a simple hash instead of a new db column
             const crypto = require('crypto');
             const promptHash = crypto.createHash('md5').update(record.imagePrompt).digest('hex');
             const fileName = `${promptHash}.jpg`;

             const { error: uploadError } = await supabase.storage
               .from('akashic_visions')
               .upload(fileName, buffer, {
                 contentType: 'image/jpeg',
                 upsert: true
               });
               
             if (uploadError) {
               console.error("Supabase Storage Upload Error", uploadError);
             }
           }
         } catch (e) {
           console.error("Failed to backup vision to Supabase Storage", e);
         }
       }

       return NextResponse.json({ message: 'Record written to Supabase successfully.', record: data });
    }
    
    // 2. LOCAL JSON FALLBACK
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
