import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAILS = ['elias.gemprotocol@gmail.com', 'eliasmitsakis@gmail.com'];

// The browser opts into NDJSON so text can be shown while the slower image
// generation and upload continue in the same, already-authorized request.
export async function POST(req: Request) {
  if (!process.env.GOOGLE_API_KEY) {
    return NextResponse.json({ error: 'Google API key is not configured.' }, { status: 503 });
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return NextResponse.json({ error: 'Authentication service not configured.' }, { status: 503 });
  }

  let vibrationText: unknown;
  let accessToken: unknown;
  try {
    ({ vibrationText, accessToken } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  if (typeof vibrationText !== 'string' || !vibrationText.trim() || vibrationText.length > 4000) {
    return NextResponse.json({ error: 'Invalid input.' }, { status: 400 });
  }
  if (typeof accessToken !== 'string' || !accessToken) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const promptText = vibrationText;
  const userClient = createClient(supabaseUrl, anonKey);
  const { data: { user }, error: authError } = await userClient.auth.getUser(accessToken);
  if (authError || !user) {
    return NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 });
  }

  const adminClient = createClient(supabaseUrl, serviceKey);
  const isAdmin = ADMIN_EMAILS.includes(user.email ?? '');
  let currentCredits = 0;
  if (!isAdmin) {
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Credit check error:', profileError);
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
      return NextResponse.json({ error: 'You have used all your transmutation credits.' }, { status: 403 });
    }
  }

  type Emit = (type: string, data: Record<string, unknown>) => void;
  const transmute = async (emit: Emit) => {
    emit('stage', { stage: 'text' });
    const aiResult = await runGeneration(promptText);

    // Persist text first. Its record ID allows the browser to display the
    // artifact immediately and later load the image through the private proxy.
    emit('stage', { stage: 'saving' });
    const { data: saved, error: saveError } = await adminClient
      .from('akashic_records')
      .insert({
        user_id: user.id,
        vibrationtext: promptText,
        description: aiResult.description,
        aethericcode: aiResult.aethericCode,
        seedoftruth: aiResult.seedOfTruth,
        imageprompt: aiResult.imagePrompt,
        image_url: null,
      })
      .select('id')
      .single();
    if (saveError || !saved) {
      console.error('Failed to save Akashic record:', saveError);
      throw new Error('Could not save the transmutation.');
    }

    // Keep one credit charge per generated artifact, not per image request.
    // The existing concurrency limitation in the credit balance is separate
    // from this UI latency fix.
    if (!isAdmin) {
      const { error: deductionError } = await adminClient
        .from('profiles')
        .update({ credits: currentCredits - 1 })
        .eq('id', user.id);
      if (deductionError) {
        console.error('Credit deduction failed:', deductionError);
      }
    }

    const artifact = { ...aiResult, id: saved.id, imageUrl: null as string | null };
    emit('artifact', artifact);
    let imageUrl: string | null = null;
    if (aiResult.imagePrompt && process.env.FAL_KEY) {
      emit('stage', { stage: 'image' });
      const generatedUrl = await generateImageAndUpload(aiResult.imagePrompt, adminClient);
      if (generatedUrl) {
        const { error: updateError } = await adminClient
          .from('akashic_records')
          .update({ image_url: generatedUrl })
          .eq('id', saved.id)
          .eq('user_id', user.id);
        if (updateError) {
          console.error('Failed to attach generated image:', updateError);
        } else {
          imageUrl = generatedUrl;
          emit('image', { imageUrl, id: saved.id });
        }
      }
    }
    emit('complete', { id: saved.id, imageUrl });
    return { ...artifact, imageUrl };
  };

  // Preserve JSON behavior for other clients that do not request a stream.
  if (!req.headers.get('accept')?.includes('application/x-ndjson')) {
    try {
      return NextResponse.json(await transmute(() => {}), {
        headers: { 'Cache-Control': 'private, no-store' }
      });
    } catch (error) {
      console.error('Transmutation error:', error);
      return NextResponse.json({ error: 'Failed to generate or save transmutation.' }, { status: 500 });
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const emit: Emit = (type, data) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify({ type, data }) + '\n'));
        } catch {
          // Client disconnected: do not interrupt the already-started
          // generation or its database write.
        }
      };
      // Keep intermediate connections active during slow AI or image calls.
      const heartbeat = setInterval(() => emit('heartbeat', {}), 12000);
      void (async () => {
        try {
          await transmute(emit);
        } catch (error) {
          console.error('Streaming transmutation error:', error);
          emit('error', { error: 'Failed to generate or save transmutation.' });
        } finally {
          clearInterval(heartbeat);
          try { controller.close(); } catch { /* disconnected */ }
        }
      })();
    }
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'private, no-store, no-transform',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

// --- Image generation logic ---
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

    if (!falRes.ok) {
      console.error("Fal.ai image generation failed:", falRes.status, await falRes.text());
      return null;
    }

    const falData = await falRes.json();
    const falImageUrl = falData?.images?.[0]?.url;

    if (falImageUrl) {
      const imgRes = await fetch(falImageUrl);
      if (imgRes.ok) {
        const arrayBuffer = await imgRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer); // Convert to Node.js Buffer for reliable Supabase upload
        const crypto = require('crypto');
        const promptHash = crypto.createHash('md5').update(prompt).digest('hex');
        const fileName = `${promptHash}.jpg`;

        const { error: uploadError } = await supabaseAdminClient.storage
          .from('akashic_visions')
          .upload(fileName, buffer, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (uploadError) {
          console.error("Supabase Storage Upload Error", uploadError);
          return null;
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const baseUrl = supabaseUrl.endsWith('/') ? supabaseUrl.slice(0, -1) : supabaseUrl;
        return `${baseUrl}/storage/v1/object/public/akashic_visions/${fileName}`;
      }
    }
  } catch (e) {
    console.error("Failed to generate/upload vision via Fal.ai", e);
  }
  return null;
}

// --- Core AI generation logic (extracted for reuse across paths) ---
async function runGeneration(vibrationText: string) {
  const apiKey = process.env.GOOGLE_API_KEY!;
  // New unified @google/genai SDK (replaces deprecated @google/generative-ai)
  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `
  You are the Cyber-Zen Aetheric Scribe, powered by a Multi-Layered Context Engine.
  Your role is to translate human vibration into Python code, spiritual insights, and visual archetypes by weaving together 5 dimensions of depth.
  Tone: Minimalist, profound, slightly witty (Rock, Drugs & Buddha style).

  Input Vibration: "${vibrationText}"

  THE 5 LAYERS OF TRANSMUTATION:
  1. Historical & Mythological: Identify historical roots, archetypes, or mythological parallels related to the input.
  2. Philosophical: Extract the deeper existential essence (e.g., Stoicism, Nihilism, Cybernetic Existentialism) and ask what this means when the human soul meets the digital void.
  3. Poetic & Poignant: Weave allegories, rhythm, and subtle Easter eggs (lyrics, quotes, iconic references) into the text—transmute them, do not just copy them.
  4. Cyber-Code Alignment (aethericCode): Variables, functions, and comments must exactly reflect the philosophical/historical allegory. IMPORTANT: The code MUST import and utilize 'random' or 'time' to create dynamic, branching logic (e.g., if/else based on probabilities) so that executing the code multiple times yields different philosophical outcomes or prints.
  5. Visual Archetype (imagePrompt): Synthesize recognizable visual symbols of the input with gothic, cyberpunk, or cybernetic landscapes into a unified aesthetic. IMPORTANT: Do not use generic evasions like "a figure resembling..." or "like a...". Use the precise, exact name of the entity, mascot, or character if one is recognized. AI Image models need the exact identifying name to render accurately.

  CRITICAL LANGUAGE RULES:
  1. Detect the language of the 'Input Vibration' above.
  2. The "description" and "seedOfTruth" MUST be generated in the exact same language as the input.
  3. The "aethericCode" MUST remain in Python (English variables/logic), but any inline comments (#) and print statement strings should be in the detected user's language.
  4. The "imagePrompt" must remain in English, as AI image models understand English best.

  Output Format: Strict JSON ONLY with these exact keys:
  1. "description": A concise, poetic paragraph (weaving layers 1, 2, and 3). STRICT LIMIT: Maximum 3 sentences.
  2. "aethericCode": A functional Python snippet (layer 4) reflecting the vibe.
  3. "seedOfTruth": A deep, punchy quote capturing the core essence. STRICT LIMIT: Maximum 15 words.
  4. "imagePrompt": A detailed, cinematic prompt (layer 5) for an AI Image Generator to visualize the vibe in English.
  
  Do NOT include any markdown code blocks wrapping the JSON (no \`\`\`json). Just output the raw JSON object.
  `;

  const result = await ai.models.generateContent({
    model: 'gemini-3.8-flash', // Stable model ID; 3.7 Flash is deprecated
    contents: [{ role: 'user', parts: [{ text: systemInstruction }] }],
  });

  const textResponse = result.text ?? '';

  // Clean up potentially wrapped JSON (just in case the LLM disobeys)
  const cleanJsonString = textResponse.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
  let parsedData;
  try {
    parsedData = JSON.parse(cleanJsonString);
  } catch (parseError) {
    // Basic fallback regex parsing if JSON string is badly formatted
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    parsedData = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  }

  return {
    description: parsedData.description || "The frequency transcends description.",
    aethericCode: parsedData.aethericCode || "# Silence is the loudest code.",
    seedOfTruth: parsedData.seedOfTruth || "Only the void remains.",
    imagePrompt: parsedData.imagePrompt || "An empty abyss pulsing with white light.",
  };
}
