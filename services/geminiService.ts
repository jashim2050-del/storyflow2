import { GoogleGenAI, Type } from "@google/genai";
import { Scene } from "../types";

// Lazy initialization of the API client.
// We do not initialize it at the top level to prevent runtime errors (like 'process is not defined')
// from crashing the app during module loading.
let aiClient: GoogleGenAI | null = null;

const getAiClient = (): GoogleGenAI => {
  if (aiClient) return aiClient;

  // Safely access the API Key.
  const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : undefined;
  
  // Initialize the client
  // We use a fallback empty string if key is missing to allow the object to be created,
  // but actual calls will fail if the key is invalid.
  aiClient = new GoogleGenAI({ apiKey: apiKey || "" });
  return aiClient;
};

const getApiKey = (): string | undefined => {
    return (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : undefined;
}

export const generateStoryDraft = async (topic: string, customDialogue?: string, durationMinutes: number = 1): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }

  const ai = getAiClient();
  const model = "gemini-2.5-flash";
  const targetSceneCount = Math.max(1, Math.round(durationMinutes * 6));

  const prompt = `
    Write a narrative story based on this topic: "${topic}".
    
    CONSTRAINTS:
    - Target Video Length: Exactly ${durationMinutes} minute(s).
    - Scene Count Requirement: The story MUST be detailed enough to be split into exactly ${targetSceneCount} scenes of 10 seconds each.
    - Pacing: ${durationMinutes > 2 ? 'This is a longer story. Include slower moments, environmental details, and character development.' : 'This is a short story. Keep it focused but descriptive.'}
    ${customDialogue ? `- Mandatory Dialogue: You MUST incorporate this specific dialogue naturally into the story: "${customDialogue}"` : ''}
    
    Focus on visual details and clear action suitable for converting into video scenes.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: "You are a creative writer for visual storytelling.",
      },
    });

    const text = response.text;
    if (!text) {
        throw new Error("No story generated from Gemini.");
    }
    return text;
  } catch (error) {
    console.error("Gemini API Error (Story Draft):", error);
    throw error;
  }
};

export const generateScenesFromStory = async (storyText: string, durationMinutes: number, allowVariations: boolean = false): Promise<Scene[]> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }

  const ai = getAiClient();
  const model = "gemini-2.5-flash"; // Using Flash for speed and good structured output capability
  const targetSceneCount = Math.max(1, Math.round(durationMinutes * 6));

  const strictInstruction = `
    CRITICAL RULE: The 'character_appearance' field MUST contain the exact same detailed description text in every single scene to ensure the AI video generator maintains character consistency (identity preservation). Do not change clothes or physical features between scenes. Any changes in expression or pose should go in 'action_description', NOT 'character_appearance'.
  `;

  const flexibleInstruction = `
    RULE: The 'character_appearance' field must fundamentally use the core description from Step 2 to maintain identity. However, you MAY include minor variations in the appearance string itself (e.g. 'slightly messy hair', 'ripped sleeve', 'dirty face') if the story progression physically alters the character. Keep core facial features and base outfit colors consistent.
  `;

  const prompt = `
    Source Story: "${storyText}"

    Step 1: Analyze the story above.
    Step 2: Define a SINGLE, DETAILED visual description for the main character based on the story. Include hair color/style, specific clothing items (with colors), and distinct facial features.
    Step 3: Split the story into EXACTLY ${targetSceneCount} sequential scenes. Each scene represents a 10-second clip.

    CONSTRAINT: You MUST output exactly ${targetSceneCount} scenes to match the requested ${durationMinutes} minute video length.
    If the story content seems short, you must expand the pacing by adding reaction shots, close-ups on details, environmental establishment shots, or character contemplation moments to reach exactly ${targetSceneCount} scenes.

    ${allowVariations ? flexibleInstruction : strictInstruction}

    Output a JSON array of scene objects. Each object must have:
    - scene_number (integer)
    - duration_seconds (always 10)
    - setting_description (detailed visual description of the background)
    - character_appearance (The consistent, detailed character description string defined in Step 2, with optional minor variations only if allowed)
    - action_description (Specific movement and action for this 10s clip)
    - dialogue (spoken lines or empty string)
    - camera_angle (e.g., Wide Shot, Close Up, Tracking Shot)
    - lighting (e.g., Sunset, Neon, Dim)
    - mood (e.g., Tense, Joyful, Melancholic)
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: "You are an expert screenwriter and storyboard artist. You strictly adhere to scene count requirements.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              scene_number: { type: Type.INTEGER },
              duration_seconds: { type: Type.INTEGER },
              setting_description: { type: Type.STRING },
              character_appearance: { type: Type.STRING },
              action_description: { type: Type.STRING },
              dialogue: { type: Type.STRING },
              camera_angle: { type: Type.STRING },
              lighting: { type: Type.STRING },
              mood: { type: Type.STRING },
            },
            required: [
              "scene_number",
              "duration_seconds",
              "setting_description",
              "character_appearance",
              "action_description",
              "camera_angle"
            ],
          },
        },
      },
    });

    const text = response.text;
    if (!text) {
        throw new Error("No response generated from Gemini.");
    }
    
    const scenes = JSON.parse(text) as Scene[];
    return scenes;

  } catch (error) {
    console.error("Gemini API Error (Scenes):", error);
    throw error;
  }
};