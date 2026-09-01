import { GoogleGenAI } from "@google/genai";

export const GEMINI_MODEL = "gemini-2.5-flash";

let _ai: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!_ai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    _ai = new GoogleGenAI({ apiKey: key });
  }
  return _ai;
}

interface GenerateOptions {
  prompt: string;
  systemInstruction?: string;
  responseMimeType?: string;
  responseSchema?: object;
}

/**
 * Generate content with Gemini.
 * Server-side only — never expose the API key.
 */
export async function generateContent(options: GenerateOptions): Promise<string> {
  const { prompt, systemInstruction, responseMimeType, responseSchema } = options;
  const client = getClient();

  const config: Record<string, unknown> = {};

  if (systemInstruction) {
    config.systemInstruction = systemInstruction;
  }

  if (responseMimeType) {
    config.responseMimeType = responseMimeType;
  }

  if (responseSchema) {
    config.responseSchema = responseSchema;
  }

  const response = await client.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config,
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  return text;
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
