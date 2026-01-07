import { GoogleGenAI, Type, Chat } from "@google/genai";
import { fileToBase64, getSafeMimeType } from "../utils/fileUtils";

const getApiKey = () => {
  const env = (window as any).process?.env || {};
  return env.API_KEY || env.NEXT_PUBLIC_API_KEY || env.VITE_API_KEY || '';
};

export const analyzeFile = async (file: File) => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const base64Data = await fileToBase64(file);
  const mimeType = getSafeMimeType(file);

  const prompt = `You are an elite security researcher. 
  I'm giving you a file named "${file.name}". 
  Note: If the file content appears binary but is sent as text, analyze its structure or signatures.
  
  Provide:
  1. A clear human verdict: SAFE, CAUTION, or DANGER.
  2. A friendly explanation for a non-technical person.
  3. Technical breakdown for experts.
  4. Actionable steps.
  
  Format your response as a JSON object strictly following this schema.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType
              }
            }
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
            whyItsDangerous: { type: Type.STRING },
            solutions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            technicalDetails: { type: Type.STRING },
            fileType: { type: Type.STRING },
            metadata: { 
              type: Type.OBJECT, 
              properties: {
                suggestedApp: { type: Type.STRING },
                lastModified: { type: Type.STRING },
                securityLevel: { type: Type.STRING }
              },
              required: ["suggestedApp", "securityLevel"]
            }
          },
          required: ["verdict", "humanVerdict", "summary", "simpleExplanation", "isDangerous", "solutions", "technicalDetails", "fileType", "metadata"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

export const createChatSession = (fileData: string, mimeType: string, fileName: string): Chat => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  return ai.chats.create({
    model: "gemini-3-pro-preview",
    config: {
      systemInstruction: `You are a friendly technical assistant. You are helping a user with a file named "${fileName}". 
      You have access to the file's contents. If the user asks technical questions, answer accurately. 
      If they are confused, use simple analogies. Always prioritize their digital safety.`,
    },
    history: [
      {
        role: 'user',
        parts: [
          { inlineData: { data: fileData, mimeType: mimeType } },
          { text: `Hi! I've uploaded "${fileName}". Can you help me understand what's in here and if I should be worried?` }
        ],
      },
      {
        role: 'model',
        parts: [{ text: `Hello! I've reviewed the file "${fileName}". I can help you understand its structure, content, and safety. What would you like to know first?` }],
      }
    ]
  });
};