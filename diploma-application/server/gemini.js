const { GoogleGenAI } = require("@google/genai");

const PRIMARY_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash";
const FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY in .env");
  }
  return new GoogleGenAI({ apiKey });
}

function stripHtml(html = "") {
  return String(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    readingTimeMinutes: { type: "number" },
    complexity: { type: "string", enum: ["simple", "moderate", "complex"] },
    tone: { type: "string" },
    keyPoints: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          text: { type: "string" },
          importance: { type: "string", enum: ["high", "medium", "low"] },
        },
        required: ["id", "text", "importance"],
      },
    },
    actionItems: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          text: { type: "string" },
          priority: { type: "string", enum: ["urgent", "normal", "low"] },
        },
        required: ["id", "text", "priority"],
      },
    },
    openQuestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          text: { type: "string" },
        },
        required: ["id", "text"],
      },
    },
    concepts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          term: { type: "string" },
          definition: { type: "string" },
        },
        required: ["id", "term", "definition"],
      },
    },
    insights: { type: "array", items: { type: "string" } },
    relatedTopics: { type: "array", items: { type: "string" } },
    suggestedNextSteps: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "keyPoints", "actionItems", "openQuestions", "concepts", "insights"],
};

const MODE_PROMPTS = {
  full: "Prepare a full, multi-dimensional analysis of the note.",
  quick: "Prepare a quick analysis — shorter summary, max 3 key points and max 2 action items.",
  exam: "Focus on exam prep: key concepts with definitions, knowledge-check questions, and critical facts.",
  project: "Focus on project management: tasks, priorities, risks, and next steps.",
};

function formatGeminiError(error) {
  const cause = error?.cause;
  if (cause?.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE") {
    return "TLS certificate verification failed. Restart the server — dev TLS bypass is enabled automatically.";
  }
  return error?.message || "All Gemini models failed.";
}

async function generateWithFallback(ai, prompt, config) {
  const models = [PRIMARY_MODEL, ...FALLBACK_MODELS.filter((m) => m !== PRIMARY_MODEL)];
  let lastError;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config,
      });
      return { text: response.text, model };
    } catch (error) {
      lastError = error;
      console.warn(`[gemini] model ${model} failed:`, error.message);
      if (error?.cause?.code) {
        console.warn(`[gemini] cause:`, error.cause.code);
      }
    }
  }

  throw new Error(formatGeminiError(lastError));
}

async function analyzeNote({ title, content, mode = "full" }) {
  const ai = getClient();
  const plainText = stripHtml(content);
  const modeInstruction = MODE_PROMPTS[mode] || MODE_PROMPTS.full;

  const prompt = `You are an intelligent note analysis assistant in a knowledge management app.
${modeInstruction}

Rules:
- Respond ONLY in English.
- Base your analysis only on the note content — do not invent facts outside the text.
- actionItems: extract concrete tasks (if none exist, suggest sensible ones based on the content).
- openQuestions: ask questions that help the user think deeper about the topic.
- concepts: extract key terms and explain them briefly.
- insights: provide 1-3 valuable observations that go beyond a plain summary.
- Each array item must have a unique id (e.g. "kp1", "ai1", "q1").

Note title: ${title || "Untitled"}

Note content:
"""
${plainText}
"""`;

  const { text, model } = await generateWithFallback(ai, prompt, {
    responseMimeType: "application/json",
    responseSchema: ANALYSIS_SCHEMA,
    temperature: 0.4,
  });

  const parsed = JSON.parse(text);

  return {
    ...parsed,
    generatedAt: new Date().toISOString(),
    mode,
    model,
  };
}

async function chatAboutNote({ title, content, message, history = [] }) {
  const ai = getClient();
  const plainText = stripHtml(content);
  const historyText = history
    .slice(-8)
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`)
    .join("\n");

  const prompt = `You are a contextual assistant in a notes app. You have access to the user's note and answer questions about its content, implications, and next steps.

Note: "${title || "Untitled"}"
"""
${plainText}
"""

${historyText ? `Previous conversation:\n${historyText}\n` : ""}
User asks: ${message}

Reply concisely in English (max 3 paragraphs). If the question goes beyond the note, say so clearly and suggest what the user could add to the note.`;

  const { text } = await generateWithFallback(ai, prompt, { temperature: 0.6 });
  return text;
}

module.exports = { analyzeNote, chatAboutNote, stripHtml };
