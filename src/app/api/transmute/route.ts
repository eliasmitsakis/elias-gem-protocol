import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// Ensure the API key exists
const apiKey = process.env.GOOGLE_API_KEY;

export async function POST(req: Request) {
  if (!apiKey) {
    return NextResponse.json({ error: 'Google API key is missing. Ensure .env.local is configured.' }, { status: 500 });
  }

  try {
    const { vibrationText } = await req.json();

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
      model: 'gemini-2.5-pro',
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

    return NextResponse.json({
      description: parsedData.description || "The frequency transcends description.",
      aethericCode: parsedData.aethericCode || "# Silence is the loudest code.",
      seedOfTruth: parsedData.seedOfTruth || "Only the void remains.",
      imagePrompt: parsedData.imagePrompt || "An empty abyss pulsing with white light."
    });

  } catch (error: any) {
    console.error("Transmutation Error:", error);
    return NextResponse.json({ error: error.message || 'Failed to align vibration.' }, { status: 500 });
  }
}
