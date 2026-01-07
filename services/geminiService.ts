import { GoogleGenAI, Type, Chat } from "@google/genai";
import { fileToBase64, getSafeMimeType } from "../utils/fileUtils";

const getApiKey = () => {
  // Check Local Storage first (User preference)
  const stored = localStorage.getItem('omni_api_key');
  if (stored && stored.trim() !== '') return stored.trim();
  
  // Check Environment Variable (Vercel injection)
  const env = (window as any).process?.env || {};
  const envKey = env.API_KEY || env.NEXT_PUBLIC_API_KEY || env.VITE_API_KEY;
  if (envKey && envKey !== 'undefined' && envKey !== '') return envKey;
  
  return '';
};

export const analyzeFile = async (file: File) => {
  const key = getApiKey();
  if (!key) throw new Error("No API key available for deep analysis.");

  const ai = new GoogleGenAI({ apiKey: key });
  const base64Data = await fileToBase64(file);
  const mimeType = getSafeMimeType(file);

  const prompt = `You are a high-level security and file analyst. Analyze the provided file: "${file.name}".
  Determine its safety and content. Provide a verdict (SAFE, CAUTION, or DANGER) and a simple human-readable explanation.
  If it contains code, explain what the code does. If it's a document, summarize the intent.
  Respond strictly in JSON format matching the schema provided.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: [
        {
          parts: [
            { text: prompt },
            { inlineData: { data: base64Data, mimeType: mimeType } }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            verdict: { type: Type.STRING, enum: ['SAFE', 'CAUTION', 'DANGER'] },
            humanVerdict: { type: Type.STRING },
            summary: { type: Type.STRING },
            simpleExplanation: { type: Type.STRING },
            isDangerous: { type: Type.BOOLEAN },
            solutions: { type: Type.ARRAY, items: { type: Type.STRING } },
            technicalDetails: { type: Type.STRING },
            fileType: { type: Type.STRING },
            metadata: { 
              type: Type.OBJECT, 
              properties: {
                suggestedApp: { type: Type.STRING },
                securityLevel: { type: Type.STRING }
              },
              required: ["suggestedApp", "securityLevel"]
            }
          },
          required: ["verdict", "humanVerdict", "summary", "simpleExplanation", "isDangerous", "solutions", "technicalDetails", "fileType", "metadata"]
        }
      }
    });

    const textResult = response.text;
    if (!textResult) throw new Error("Empty response from Gemini");
    return JSON.parse(textResult);
  } catch (error) {
    console.error("Gemini AI Analysis Error:", error);
    throw error;
  }
};

export const createChatSession = (fileData: string, mimeType: string, fileName: string): Chat => {
  const key = getApiKey();
  if (!key) throw new Error("API Key required for chat.");
  
  const ai = new GoogleGenAI({ apiKey: key });
  return ai.chats.create({
    model: "gemini-3-pro-preview",
    config: {
      systemInstruction: `You are the OmniAI Assistant. You are currently analyzing a file named "${fileName}" with a user. 
      You have access to its binary or text content. Be helpful, technical but clear, and always emphasize user security.`,
    },
    history: [
      {
        role: 'user',
        parts: [
          { inlineData: { data: fileData, mimeType: mimeType } },
          { text: `I've uploaded "${fileName}". Let's discuss it.` }
        ],
      },
      {
        role: 'model',
        parts: [{ text: `I have received "${fileName}". I'm ready to explain its contents or answer any technical questions you have about it. How can I help?` }],
      }
    ]
  });
};