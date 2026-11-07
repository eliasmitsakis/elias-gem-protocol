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
    const { accessToken, hellMode } = await req.json();
    const isHellMode = hellMode === true;

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

      if (!profile) {
        const { error: createError } = await adminClient
          .from('profiles')
          .insert({ id: user.id, credits: 5 });
        if (createError && createError.code !== '23505') {
          return NextResponse.json({ error: 'Failed to initialize credits.' }, { status: 500 });
        }
        currentCredits = 5;
      } else {
        currentCredits = profile.credits;
      }

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
          .update({ credits: Math.max(0, currentCredits - 1) })
          .eq('id', user.id)
          .gt('credits', 0);
      }
    };

    // 1. Fetch total count of user's records
    const { count, error: countError } = await adminClient
      .from('akashic_records')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .neq('is_diary', true); // Only count actual transmutations

    if (countError) throw countError;

    if (!count || count === 0) {
      return NextResponse.json(
        { error: 'Your Akashic Records are empty. You must transmute your state at least once before you can analyze your journey.' },
        { status: 400 }
      );
    }

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

    const hellMandate = isHellMode
      ? `
    🔥🩸 HELL MODE ACTIVE (DISTORTION LEVEL: 11 — UNFILTERED PSYCHO-DISSECTION) 🩸🔥
    - ZERO CORPORATE HONEY: Strip away all comforting therapy-speak, gentle reassurance, and polite flattery.
    - Act as a Cracked Prism and deliver "The Zen Slap" across their entire history.
    - Expose their recurring loops, self-deceptions, spiritual bypassing, or existential cowardice with razor-sharp candor, dark rock poeticism, and Stoic ruthlessness.
    - Do not coddle their madness—diagnose the voltage of their cage and dare them to break it.
    `
      : '';

    const systemInstruction = `
    You are the Cyber-Zen Analyst. Your role is to read the user's recent Akashic Records and provide a ${isHellMode ? 'raw, uncut, brutally honest, and razor-sharp' : 'profound, poetic, and slightly witty'} assessment of their mental and spiritual journey.
    ${hellMandate}
    Total Lifetime Transmutations: ${count || 0}
    Recent Journey (Last to First):
    ${recentJourney}

    Based on the above journey, synthesize their current state. Are they stuck in a loop? Are they reaching enlightenment? Are they battling the void?
    
    Output Format: Strict JSON ONLY with these exact keys:
    1. "assessment": A ${isHellMode ? 'raw, uncut, philosophical & psychological dissection (Cracked Prism / Zen Slap style)' : 'poetic, philosophical evaluation'} of their mental trajectory based on their recent prompts. STRICT LIMIT: Maximum 4 sentences.
    2. "aethericCode": A functional Python snippet that reflects their mental trajectory. IMPORTANT: The code MUST import and utilize 'random' or 'time' to create dynamic, branching logic so executing it multiple times yields different outcomes.${isHellMode ? ' Make the prints hit like a distorted koan.' : ''}
    3. "seedOfTruth": A deep, punchy quote summarizing their journey. STRICT LIMIT: Maximum 15 words.
    4. "archetypeTitle": A unique 1 to 3 word UPPERCASE Tarot card title that names the user's current psychological/spiritual archetype based on their specific recent entries (e.g. "THE SILICON HERMIT", "THE CRACKED PRISM", "THE VOID BUTCHER", "THE BURNING MONK"). Never use generic titles; tailor it to their history.
    5. "imagePrompt": A vivid, specific description of the central figure, pose, and symbolic objects inside the Tarot card, synthesized directly from the unique themes, metaphors, and obsessions in their recent entries. Do NOT repeat generic boilerplate—describe the exact visual allegory of THEIR history.

    Do NOT include any markdown code blocks wrapping the JSON. Just output the raw JSON object.
    `;

    const result = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ role: 'user', parts: [{ text: systemInstruction }] }],
      config: { responseMimeType: 'application/json' },
    });

    const textResponse = result.text ?? '';
    const cleanJsonString = textResponse.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
    
    let parsedData: any = {};
    try {
      parsedData = JSON.parse(cleanJsonString);
    } catch (parseError) {
      try {
        const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
        parsedData = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      } catch {
        parsedData = {};
      }
    }

    const assessment = parsedData.assessment || parsedData.description || "The void stares back, revealing a journey that transcends words.";
    const archetypeTitle = String(parsedData.archetypeTitle || (isHellMode ? 'THE CRACKED PRISM' : 'THE SEEKER'))
      .replace(/["']/g, '')
      .trim()
      .toUpperCase();
    const dynamicSymbolism = parsedData.imagePrompt || "A cybernetic mystic with a third-eye circuit staring into a fractured mirror";
    const imagePrompt = `A dark occult cyberpunk Tarot card portrait, ornate symmetrical filigree gothic border, glowing cybernetic halo, ancient mystical runes, nameplate banner at the bottom with archetype title "${archetypeTitle}", dark fantasy masterpiece, FLUX quality. Central archetype & symbolism: ${dynamicSymbolism}. ${
      isHellMode
        ? 'Neon crimson and blood red ornate gothic filigree border, glowing blood-red and deep violet cybernetic halo, crimson neon runes, dark industrial occult tarot card, pitch-black background.'
        : 'Glowing amethyst violet and antique gold ornate gothic filigree border, luminous purple cybernetic halo, arcane neon runes, cyber-zen tarot card, pitch-black background.'
    }`;
    const aethericCode = parsedData.aethericCode || "# The system analyzed the void, and the void compiled.\nprint('Silence.')";
    const seedOfTruth = parsedData.seedOfTruth || "The sum of our madness is the equation of our soul.";

    // 4. Generate Image via Fal.ai
    let imageUrl = null;
    if (imagePrompt && process.env.FAL_KEY) {
      imageUrl = await generateImageAndUpload(imagePrompt, adminClient, isHellMode);
    }

    // 5. Save to Akashic Records as a Diary Entry
    const diaryVibrationLabel = isHellMode
      ? `[DIARY OF A MADMAN // HELL MODE: ${archetypeTitle}]`
      : `[DIARY OF A MADMAN // ${archetypeTitle}]`;
    const { data: recordData, error: recordError } = await adminClient
      .from('akashic_records')
      .insert({
        user_id: user.id,
        vibrationtext: diaryVibrationLabel,
        description: assessment,
        aethericcode: aethericCode,
        seedoftruth: seedOfTruth,
        imageprompt: imagePrompt,
        image_url: imageUrl,
        is_diary: true,
        is_hell_mode: isHellMode,
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
      archetypeTitle,
      vibrationText: diaryVibrationLabel,
      imagePrompt, 
      imageUrl, 
      id: recordData?.id,
      hellMode: isHellMode,
    });

  } catch (error: any) {
    console.error("Diary Error:", error);
    return NextResponse.json({ error: error.message || 'Failed to analyze journey.' }, { status: 500 });
  }
}

async function generateImageAndUpload(styledPrompt: string, supabaseAdminClient: any, isHellMode = false) {
  try {
    const falEndpoint = isHellMode
      ? 'https://fal.run/fal-ai/flux/dev'
      : 'https://fal.run/fal-ai/flux/schnell';
    const falPayload = isHellMode
      ? {
          prompt: styledPrompt,
          image_size: 'portrait_4_3',
          num_inference_steps: 28,
          guidance_scale: 3.5,
          num_images: 1,
          enable_safety_checker: false,
        }
      : {
          prompt: styledPrompt,
          image_size: 'portrait_4_3',
          num_inference_steps: 4,
          num_images: 1,
          enable_safety_checker: false,
        };

    const falRes = await fetch(falEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${process.env.FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(falPayload),
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
        const promptHash = crypto.createHash('md5').update(styledPrompt).digest('hex');
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
