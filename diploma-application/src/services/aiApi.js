/**
 * aiApi.js
 * Direct DeepSeek AI Service & Local Fallback Engine
 * Uses user's working DeepSeek API key stored in localStorage ('deepseek_custom_key')
 */

import {
  localAnalyzeNote,
  localChatAboutNote,
  localImportPdf,
  stripHtml
} from "./localAnalyzer";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

/**
 * Get active API key from localStorage or env
 */
export function getActiveApiKey() {
  try {
    return (
      localStorage.getItem("deepseek_custom_key") ||
      process.env.REACT_APP_DEEPSEEK_API_KEY ||
      ""
    ).trim();
  } catch (e) {
    return "";
  }
}

/**
 * Get active model from localStorage or default to deepseek-chat
 */
export function getActiveModel() {
  try {
    return localStorage.getItem("deepseek_model") || "deepseek-chat";
  } catch (e) {
    return "deepseek-chat";
  }
}

/**
 * Test DeepSeek API connection directly
 */
export async function testDeepSeekConnection(customKey = null, customModel = null) {
  const apiKey = (customKey || getActiveApiKey()).trim();
  const model = customModel || getActiveModel();

  if (!apiKey) {
    throw new Error("No DeepSeek API key found. Please enter your API key.");
  }

  const response = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant.",
        },
        {
          role: "user",
          content: "Respond with the single word 'OK' to verify API connection.",
        },
      ],
      max_tokens: 10,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error?.message || `HTTP ${response.status} (${response.statusText})`;
    throw new Error(`DeepSeek API error: ${message}`);
  }

  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content || "";
  return { ok: true, reply, model };
}

/**
 * Check AI health / key status
 */
export async function checkAiHealth() {
  const apiKey = getActiveApiKey();
  const model = getActiveModel();
  if (apiKey) {
    return { ok: true, hasKey: true, model };
  }
  return { ok: true, hasKey: false, model: "Local Engine (Offline)" };
}

/**
 * Direct DeepSeek Note Analyzer
 */
export async function analyzeNote({ title, content, mode = "full" }) {
  const apiKey = getActiveApiKey();
  const model = getActiveModel();
  const plainText = stripHtml(content || "");

  if (!apiKey) {
    console.info("[Analyzer] No DeepSeek key found, using local analyzer engine.");
    return localAnalyzeNote({ title, content, mode });
  }

  const systemPrompt = `You are an expert cognitive note analyst for a smart productivity workspace.
Analyze the user's note and return a STRICT JSON response adhering exactly to this schema:
{
  "summary": "Clear, concise multi-sentence synthesis of the note.",
  "readingTimeMinutes": 2,
  "complexity": "simple" | "moderate" | "complex",
  "tone": "Formal" | "Analytical" | "Brainstorm" | "Practical",
  "keyPoints": [
    { "id": "kp_1", "text": "Core takeaway or key fact", "importance": "high" | "medium" | "low" }
  ],
  "actionItems": [
    { "id": "ai_1", "text": "Actionable task or next step", "priority": "urgent" | "normal" }
  ],
  "openQuestions": [
    { "id": "q_1", "text": "Thought-provoking question or missing gap to explore" }
  ],
  "concepts": [
    { "id": "c_1", "term": "Key Term/Concept", "definition": "Clear concise definition" }
  ],
  "insights": [
    "Practical productivity insight or recommendation based on note content"
  ]
}
IMPORTANT: Return ONLY valid, parseable JSON with no markdown backticks or commentary.`;

  const userPrompt = `Note Title: "${title || "Untitled"}"
Note Content:
${plainText.slice(0, 8000)}

Mode: ${mode}`;

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `DeepSeek HTTP ${response.status}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || "{}";
    
    // Clean up potential markdown formatting or codeblocks
    const cleanJson = rawContent
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    const parsed = JSON.parse(cleanJson);
    return {
      ...parsed,
      generatedAt: new Date().toISOString(),
      model: model,
      isLocal: false,
    };
  } catch (err) {
    console.warn("[DeepSeek API] Error during analysis, falling back to local engine:", err);
    const localResult = localAnalyzeNote({ title, content, mode });
    return {
      ...localResult,
      apiError: err.message,
    };
  }
}

/**
 * Direct DeepSeek Note Chat
 */
export async function chatAboutNote({ title, content, message, history = [] }) {
  const apiKey = getActiveApiKey();
  const model = getActiveModel();
  const plainText = stripHtml(content || "");

  if (!apiKey) {
    console.info("[Chat] No DeepSeek key found, using local chat fallback.");
    const reply = localChatAboutNote({ title, content, message });
    return { reply };
  }

  const systemPrompt = `You are a helpful, intelligent AI assistant discussing a specific note in the user's workspace.
Note Title: "${title || "Untitled"}"
Note Content:
${plainText.slice(0, 6000)}

Answer the user's questions clearly, accurately, and concisely based on this note.`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.slice(-8).map((msg) => ({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: msg.text || msg.content || "",
    })),
    { role: "user", content: message },
  ];

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `DeepSeek HTTP ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "I couldn't generate a response.";
    return { reply };
  } catch (err) {
    console.warn("[DeepSeek Chat] Error, falling back to local chat:", err);
    const reply = localChatAboutNote({ title, content, message });
    return { reply: `${reply}\n\n*(Note: DeepSeek error: ${err.message})*` };
  }
}

/**
 * PDF Import (extract text and structure via DeepSeek or local fallback)
 */
export async function importPdf({ file, folders }) {
  return localImportPdf({ file, folders });
}
