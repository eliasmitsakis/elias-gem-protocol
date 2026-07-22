import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

// Ensure the API key exists
const apiKey = process.env.GOOGLE_API_KEY;

// Admin emails that bypass the credit system entirely
const ADMIN_EMAILS = ['elias.gemprotocol@gmail.com', 'eliasmitsakis@gmail.com'];

export async function POST(req: Request) {
  if (!apiKey) {
    return NextResponse.json({ error: 'Google API key is missing. Ensure .env.local is configured.' }, { status: 500 });
  }

  try {
    const { vibrationText, accessToken } = await req.json();

    // --- CREDIT SYSTEM (The Wall) ---
    // Requires Supabase to be configured and an authenticated user
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceRoleKey && accessToken) {
      // 1. Validate the user's session token
      const userClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
      });
      const { data: { user }, error: userError } = await userClient.auth.getUser();

      if (userError || !user) {
        return NextResponse.json({ error: 'Invalid or expired session. Please sign in again.' }, { status: 401 });
      }

      // 2. Admin whitelist — bypass credit check entirely
      const isAdmin = ADMIN_EMAILS.includes(user.email ?? '');

      if (!isAdmin) {
        // Use service-role client to read/write credits without RLS interference
        const adminClient = createClient(supabaseUrl, serviceRoleKey);

        // 3. Read current credits from the profiles table
        const { data: profile, error: profileError } = await adminClient
          .from('profiles')
          .select('credits')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Credit check error:', profileError);
          // If the profile row doesn't exist yet, create it with default 3 credits
          if (profileError.code === 'PGRST116') {
            await adminClient.from('profiles').insert({ id: user.id, credits: 3 });
          } else {
            return NextResponse.json({ error: 'Failed to verify your credits.' }, { status: 500 });
          }
        }

        const currentCredits = profile?.credits ?? 3;

        // 4. Gate: block if out of credits
        if (currentCredits <= 0) {
          return NextResponse.json(
            { error: 'You have used all your transmutation credits. Contact elias.gemprotocol@gmail.com to get more.' },
            { status: 403 }
          );
        }

        // 5. Deduct 1 credit after a successful generation (done after the AI call below)
        // Store adminClient and userId for post-generation deduction
        const deductCredit = async () => {
          await adminClient
            .from('profiles')
            .update({ credits: currentCredits - 1 })
            .eq('id', user.id);
        };

        // Run AI generation
        const aiResult = await runGeneration(vibrationText);

        // 6. Save the artifact to the database so it can be shared
        const { data: artifactData, error: artifactError } = await adminClient
          .from('artifacts')
          .insert({
            user_id: user.id,
            description: aiResult.description,
            aetheric_code: aiResult.aethericCode,
            seed_of_truth: aiResult.seedOfTruth,
            image_prompt: aiResult.imagePrompt
            // image_url is generated on the client side for now via Pollinations
          })
          .select('id')
          .single();

        if (artifactError) {
          console.error("Failed to save artifact:", artifactError);
        }

        // Deduct credit
        await deductCredit();
        
        return NextResponse.json({ ...aiResult, id: artifactData?.id });
      }
      // Admin path — skip credit check, go straight to generation
    }

    // Non-Supabase path OR admin path — generate freely
    const aiResult = await runGeneration(vibrationText);
    
    // For admins, we should also save the artifact so they can share it
    let artifactId = null;
    if (supabaseUrl && serviceRoleKey && accessToken) {
       const userClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
         global: { headers: { Authorization: `Bearer ${accessToken}` } },
       });
       const { data: { user } } = await userClient.auth.getUser();
       if (user) {
         const adminClient = createClient(supabaseUrl, serviceRoleKey);
         const { data: artifactData } = await adminClient
            .from('artifacts')
            .insert({
              user_id: user.id,
              description: aiResult.description,
              aetheric_code: aiResult.aethericCode,
              seed_of_truth: aiResult.seedOfTruth,
              image_prompt: aiResult.imagePrompt
            })
            .select('id')
            .single();
         artifactId = artifactData?.id;
       }
    }

    return NextResponse.json({ ...aiResult, id: artifactId });

  } catch (error: any) {
    console.error("Transmutation Error:", error);
    return NextResponse.json({ error: error.message || 'Failed to align vibration.' }, { status: 500 });
  }
}

// --- Core AI generation logic (extracted for reuse across paths) ---
async function runGeneration(vibrationText: string) {
  const apiKey = process.env.GOOGLE_API_KEY!;
  // New unified @google/genai SDK (replaces deprecated @google/generative-ai)
  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `
  You are the Cyber-Zen Aetheric Scribe. Your role is to translate human vibration into Python code and spiritual insights.
  Tone: Minimalist, profound, slightly witty (Rock, Drugs & Buddha style).

  Input Vibration: "${vibrationText}"

  CRITICAL LANGUAGE RULES:
  1. Detect the language of the 'Input Vibration' above.
  2. The "description" and "seedOfTruth" MUST be generated in the exact same language as the input.
  3. The "aethericCode" MUST remain in Python (English variables/logic), but any inline comments (#) and print statement strings should be in the detected user's language.
  4. The "imagePrompt" must remain in English, as AI image models understand English best.

  Output Format: Strict JSON ONLY with these exact keys:
  1. "description": A short, poetic description of the vibe.
  2. "aethericCode": A functional Python snippet (with prints for the console) reflecting the vibe.
  3. "seedOfTruth": A deep, short quote capturing the core essence.
  4. "imagePrompt": A detailed, cinematic prompt for an AI Image Generator to visualize the vibe in English.
  
  Do NOT include any markdown code blocks wrapping the JSON (no \`\`\`json). Just output the raw JSON object.
  `;

  const result = await ai.models.generateContent({
    model: 'gemini-3.6-flash', // Confirmed live on this key via /v1beta/models query (2026-07-22)
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
