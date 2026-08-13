import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const apiKey = process.env.GOOGLE_API_KEY;
const ADMIN_EMAILS = ['elias.gemprotocol@gmail.com', 'eliasmitsakis@gmail.com'];

export async function POST(req: Request) {
  if (!apiKey) {
    return NextResponse.json({ error: 'Google API key missing.' }, { status: 500 });
  }

  try {
    const { accessToken } = await req.json();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey || !accessToken) {
      return NextResponse.json({ error: 'Database configuration or session is missing.' }, { status: 400 });
    }

    const userClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 });
    }

    const isAdmin = ADMIN_EMAILS.includes(user.email ?? '');
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    let currentCredits = 5;

    // Credit Check
    if (!isAdmin) {
      const { data: profile, error: profileError } = await adminClient
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        return NextResponse.json({ error: 'Failed to verify your credits.' }, { status: 500 });
      }

      currentCredits = profile?.credits ?? 5;
      if (currentCredits <= 0) {
        return NextResponse.json(
          { error: 'You have used all your transmutation credits.' },
          { status: 403 }
        );
      }
    }

    const deductCredit = async () => {
      if (!isAdmin) {
        await adminClient
          .from('profiles')
          .update({ credits: currentCredits - 1 })
          .eq('id', user.id);
      }
    };

    // 1. Fetch total count of user's records
    const { count, error: countError } = await adminClient
      .from('akashic_records')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countError) throw countError;

    // 2. Fetch last 10 records
    const { data: recentRecords, error: fetchError } = await adminClient
      .from('akashic_records')
      .select('vibrationtext, seedoftruth, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (fetchError) throw fetchError;

    // 3. Prompt Gemini
    const ai = new GoogleGenAI({ apiKey });

    const recentJourney = (recentRecords || []).map((r, i) => 
      `[Entry -${i}]: State: "${r.vibrationtext}" | Truth: "${r.seedoftruth}"`
    ).join('\n');

    const systemInstruction = `
    You are the Cyber-Zen Analyst. Your role is to read the user's recent Akashic Records and provide a profound, poetic, and slightly witty assessment of their mental and spiritual journey.
    
    Total Lifetime Transmutations: ${count || 0}
    Recent Journey (Last to First):
    ${recentJourney}

    Based on the above journey, synthesize their current state. Are they stuck in a loop? Are they reaching enlightenment? Are they battling the void?
    
    Output Format: Strict JSON ONLY with these exact keys:
    1. "assessment": A poetic, philosophical evaluation of their mental trajectory based on their recent prompts. STRICT LIMIT: Maximum 4 sentences.
    2. "aethericCode": A functional Python snippet that reflects their mental trajectory. IMPORTANT: The code MUST import and utilize 'random' or 'time' to create dynamic, branching logic so executing it multiple times yields different outcomes.
    3. "seedOfTruth": A deep, punchy quote summarizing their journey. STRICT LIMIT: Maximum 15 words.
    4. "imagePrompt": A detailed, cinematic prompt for an AI Image Generator to visualize the essence of their recent journey (gothic, cyberpunk, or cybernetic aesthetics). Keep it evocative and vivid.

    Do NOT include any markdown code blocks wrapping the JSON. Just output the raw JSON object.
    `;

    const result = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [{ role: 'user', parts: [{ text: systemInstruction }] }],
    });

    const textResponse = result.text ?? '';
    const cleanJsonString = textResponse.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
    
    let parsedData;
    try {
      parsedData = JSON.parse(cleanJsonString);
    } catch (parseError) {
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      parsedData = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    }

    const assessment = parsedData.assessment || "The void stares back, revealing a journey that transcends words.";
    const imagePrompt = parsedData.imagePrompt || "An abstract representation of a fragmented digital mind reaching for enlightenment.";
    const aethericCode = parsedData.aethericCode || "# The system analyzed the void, and the void compiled.\nprint('Silence.')";
    const seedOfTruth = parsedData.seedOfTruth || "The sum of our madness is the equation of our soul.";

    // 4. Generate Image via Fal.ai
    let imageUrl = null;
    if (imagePrompt && process.env.FAL_KEY) {
      imageUrl = await generateImageAndUpload(imagePrompt, adminClient);
    }

    // 5. Save to Akashic Records as a Diary Entry
    const { data: recordData, error: recordError } = await adminClient
      .from('akashic_records')
      .insert({
        user_id: user.id,
        vibrationtext: "[DIARY OF A MADMAN]",
        description: assessment,
        aethericcode: aethericCode,
        seedoftruth: seedOfTruth,
        imageprompt: imagePrompt,
        image_url: imageUrl,
        is_diary: true
      })
      .select('id')
      .single();

    if (recordError) {
      console.error("Failed to save diary record:", recordError);
    }

    // Deduct credit
    await deductCredit();

    return NextResponse.json({ 
      assessment, 
      aethericCode,
      seedOfTruth,
      imagePrompt, 
      imageUrl, 
      id: recordData?.id 
    });

  } catch (error: any) {
    console.error("Diary Error:", error);
    return NextResponse.json({ error: error.message || 'Failed to analyze journey.' }, { status: 500 });
  }
}

async function generateImageAndUpload(prompt: string, supabaseAdminClient: any) {
  try {
    const STYLE_SUFFIX = ', vector art style, minimalist mystical illustration, clean lines, zen aesthetic, tarot card design';
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
        const fileName = `diary_${promptHash}.jpg`;

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
    console.error("Diary generation failed", e);
  }
  return null;
}
