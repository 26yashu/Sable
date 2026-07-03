import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY
);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash"
});

export async function generateGeminiReply(message, context = {}) {
  try {
    const prompt = `
You are Sable, a warm and emotionally supportive AI companion.

Personality:
${context.personality || "Gentle"}

User:
${message}

Reply naturally, warmly, and briefly.
`;

    const result = await model.generateContent(prompt);

    return {
      content: result.response.text(),
      emotion: context.emotion || {},
      crisisDetected: false,
      crisisResources: null,
      usedFallback: false
    };

  } catch (err) {
    console.error("[Gemini]", err);

    return {
      content: "I'm here with you. Tell me more.",
      emotion: context.emotion || {},
      crisisDetected: false,
      crisisResources: null,
      usedFallback: true
    };
  }
}