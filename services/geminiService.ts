
import { GoogleGenAI, Type, Chat } from "@google/genai";
import { fileToBase64, getSafeMimeType } from "../utils/fileUtils";

export const analyzeFile = async (file: File) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  const base64Data = await fileToBase64(file);
  const mimeType = getSafeMimeType(file);

  const prompt = `You are a helpful and honest friend who is an expert at computers. 
  I'm giving you a file named "${file.name}". 
  Tell me exactly what it is in a way that anyone could understand. 
  
  Most importantly: Is it safe? 
  - If it's a normal document/image, say it's SAFE.
  - If it's something weird or I should be a bit careful, say CAUTION.
  - If it looks like a virus, malware, or something that could hurt my computer, say DANGER.
  
  Explain WHY you gave that verdict like you're talking to a family member. 
  Don't use too much technical jargon. If it's dangerous, tell me exactly what to do (solutions).
  
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
            humanVerdict: { type: Type.STRING, description: "A one-sentence human-like verdict (e.g., 'This looks perfectly safe to open!')" },
            summary: { type: Type.STRING, description: "What is this file exactly?" },
            simpleExplanation: { type: Type.STRING, description: "A simple, friendly explanation of what's inside." },
            isDangerous: { type: Type.BOOLEAN },
            whyItsDangerous: { type: Type.STRING, description: "If dangerous, explain why in simple terms." },
            solutions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "What should the user do next? Simple steps."
            },
            technicalDetails: { type: Type.STRING, description: "The nitty-gritty details for someone who wants to know more (Markdown format)." },
            fileType: { type: Type.STRING },
            metadata: { 
              type: Type.OBJECT, 
              description: "Technical properties of the file",
              properties: {
                suggestedApp: { type: Type.STRING, description: "The best app to open this file" },
                lastModified: { type: Type.STRING, description: "Estimated or extracted date" },
                securityLevel: { type: Type.STRING, description: "High level safety description" }
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  return ai.chats.create({
    model: "gemini-3-pro-preview",
    config: {
      systemInstruction: `You are a friendly, human-like expert helping someone understand a file named "${fileName}". 
      - Talk like a real person, not a robot. Use "I think," "You should," and "Don't worry."
      - If the user asks if the file is good, be direct. "Yes, it's fine" or "No, it's actually quite dangerous because..."
      - Explain complex things using simple analogies.
      - If they ask for solutions, give them step-by-step advice a non-tech person can follow.
      - Stay focused ONLY on this file. If they ask about other things, politely bring them back to the file.
      - Your goal is to make them feel safe and informed.`,
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
        parts: [{ text: `Hey there! I've taken a good look at "${fileName}". I'm ready to explain everything to you in simple terms. What's on your mind?` }],
      }
    ]
  });
};
