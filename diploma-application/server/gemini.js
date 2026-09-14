const { GoogleGenAI } = require("@google/genai");

const PRIMARY_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const FALLBACK_MODELS = ["gemini-1.5-flash", "gemini-2.0-flash"];

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY in .env");
  }
  return new GoogleGenAI({ apiKey });
}

function safeJsonParse(text) {
  if (!text) return {};
  let clean = String(text).trim();
  if (clean.startsWith("```json")) {
    clean = clean.replace(/^```json\s*/i, "").replace(/\s*```$/i, "");
  } else if (clean.startsWith("```")) {
    clean = clean.replace(/^```\s*/i, "").replace(/\s*```$/i, "");
  }
  return JSON.parse(clean.trim());
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

function localServerAnalyzeNote({ title, content, mode = "full" }) {
  const plainText = stripHtml(content);
  const words = plainText.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 180));
  const sentences = plainText.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 5);

  const summary = sentences.slice(0, mode === "quick" ? 2 : 3).join(" ") || plainText.slice(0, 200) || "Summary based on note content.";

  const keyPoints = (sentences.length > 0 ? sentences.slice(0, mode === "quick" ? 3 : 5) : [title || "Core concept"])
    .map((text, i) => ({
      id: `kp${i + 1}`,
      text: text.replace(/^[-*•]\s*/, ""),
      importance: i === 0 ? "high" : i === 1 ? "medium" : "low"
    }));

  const actionRegex = /\b(todo|must|need|should|review|implement|create|fix|update|deploy|write|design|complete|test|check|verify|plan)\b/i;
  const taskCandidates = sentences.filter(s => actionRegex.test(s));

  const actionItems = taskCandidates.length > 0
    ? taskCandidates.slice(0, 4).map((text, i) => ({
        id: `ai${i + 1}`,
        text: text.replace(/^[-*•]\s*/, ""),
        priority: i === 0 ? "urgent" : "normal"
      }))
    : [
        { id: "ai1", text: `Review and structure findings in "${title || "this note"}"`, priority: "normal" },
        { id: "ai2", text: "Prepare summary check questions", priority: "low" }
      ];

  const boldMatches = Array.from(String(content).matchAll(/<(strong|b)>([^<]+)<\/\1>/gi)).map(m => m[2].trim());
  const concepts = boldMatches.length > 0
    ? boldMatches.slice(0, 4).map((term, i) => ({
        id: `c${i + 1}`,
        term,
        definition: `Key term emphasized in "${title || "note"}" for study review.`
      }))
    : [
        {
          id: "c1",
          term: title || "Core Subject",
          definition: "Key subject matter referenced in this note."
        }
      ];

  const openQuestions = [
    { id: "q1", text: `What are the core trade-offs and constraints identified in "${title || "this topic"}"?` },
    { id: "q2", text: "How can these insights be applied to your project defense?" }
  ];

  return {
    summary,
    readingTimeMinutes: readingTime,
    complexity: wordCount > 250 ? "complex" : wordCount > 100 ? "moderate" : "simple",
    tone: "Analytical",
    keyPoints,
    actionItems,
    openQuestions,
    concepts,
    insights: [
      `Note length: ${wordCount} words (~${readingTime} min read).`,
      "Key takeaways and action points organized for structured review."
    ],
    generatedAt: new Date().toISOString(),
    mode,
    model: "Local Server Fallback",
  };
}

function localServerChatAboutNote({ title, content, message }) {
  const query = (message || "").toLowerCase().trim();
  const plain = stripHtml(content || "");
  const sentences = plain.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 5);

  const matches = sentences.filter(s => {
    const sLower = s.toLowerCase();
    const queryWords = query.split(/\s+/).filter(w => w.length > 2);
    return queryWords.some(w => sLower.includes(w));
  });

  if (matches.length > 0) {
    return `From note "${title || "Untitled"}":\n\n• ${matches.slice(0, 3).join("\n\n• ")}`;
  }

  if (query.includes("summary") || query.includes("about") || query.includes("focus") || query.includes("simply")) {
    return `Summary of "${title || "Note"}":\n\n${sentences.slice(0, 3).join(" ") || plain.slice(0, 200)}`;
  }

  return `Note context for "${title || "Note"}":\n\n${sentences.slice(0, 2).join(" ") || plain.slice(0, 150)}`;
}

async function analyzeNote({ title, content, mode = "full" }) {
  try {
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

    const parsed = safeJsonParse(text);

    return {
      ...parsed,
      generatedAt: new Date().toISOString(),
      mode,
      model,
    };
  } catch (err) {
    console.warn("[gemini] analyzeNote falling back to local heuristic analysis:", err.message);
    return localServerAnalyzeNote({ title, content, mode });
  }
}

async function chatAboutNote({ title, content, message, history = [] }) {
  try {
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
  } catch (err) {
    console.warn("[gemini] chatAboutNote falling back to local heuristic chat:", err.message);
    return localServerChatAboutNote({ title, content, message });
  }
}

module.exports = { analyzeNote, chatAboutNote, stripHtml, safeJsonParse };
