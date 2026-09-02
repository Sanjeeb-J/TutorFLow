export const GEMINI_MODEL = "gemini-2.5-flash";

/**
 * Call the Gemini REST API directly via fetch.
 * Avoids the @google/genai SDK which has ESM bundling issues with Next.js 16 / Turbopack.
 * Server-side only — never expose the API key.
 */
async function callGeminiAPI(payload: {
  contents: Array<{ role: string; parts: Array<{ text: string }> }>;
  systemInstruction?: { parts: Array<{ text: string }> };
  generationConfig?: Record<string, unknown>;
}): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY environment variable is required");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errorText.substring(0, 200)}`);
  }

  const data = await res.json();

  const candidates = data.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error("Gemini returned no candidates");
  }

  const parts = candidates[0].content?.parts;
  if (!parts || parts.length === 0) {
    throw new Error("Gemini returned empty content");
  }

  const text = parts[0].text;
  if (!text) {
    throw new Error("Gemini returned empty text");
  }

  return text;
}

interface GenerateOptions {
  prompt: string;
  systemInstruction?: string;
  responseMimeType?: string;
  responseSchema?: object;
}

/**
 * Generate content with Gemini.
 */
export async function generateContent(options: GenerateOptions): Promise<string> {
  const { prompt, systemInstruction, responseMimeType, responseSchema } = options;

  const payload: {
    contents: Array<{ role: string; parts: Array<{ text: string }> }>;
    systemInstruction?: { parts: Array<{ text: string }> };
    generationConfig?: Record<string, unknown>;
  } = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  };

  if (systemInstruction) {
    payload.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const generationConfig: Record<string, unknown> = {};
  if (responseMimeType) {
    generationConfig.responseMimeType = responseMimeType;
  }
  if (responseSchema) {
    generationConfig.responseSchema = responseSchema;
  }
  if (Object.keys(generationConfig).length > 0) {
    payload.generationConfig = generationConfig;
  }

  return callGeminiAPI(payload);
}

/**
 * Generate structured JSON content with Gemini.
 * Uses the structured output feature for reliable JSON generation.
 */
export async function generateStructuredJSON<T>(
  prompt: string,
  schema: object,
  systemInstruction?: string,
): Promise<T> {
  const text = await generateContent({
    prompt,
    systemInstruction,
    responseMimeType: "application/json",
    responseSchema: schema,
  });

  const parsed = JSON.parse(text);
  return parsed as T;
}
