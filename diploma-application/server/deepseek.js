const fetch = globalThis.fetch || require("node-fetch");

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const PRIMARY_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";

function getApiKey() {
  const key = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("Missing DEEPSEEK_API_KEY in .env");
  }
  return key;
}

function safeJsonParse(text) {
  if (!text) return {};
  let clean = String(text).trim();
  if (clean.startsWith("```json")) {
    clean = clean.replace(/^```json\s*/i, "").replace(/\s*```$/i, "");
  } else if (clean.startsWith("```")) {
    clean = clean.replace(/^```\s*/i, "").replace(/\s*```$/i, "");
  }
  try {
    return JSON.parse(clean.trim());
  } catch (err) {
    console.warn("[deepseek] JSON parse fallback:", err.message);
    // Attempt simple extraction if surrounded by extra commentary
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw err;
  }
}

function stripHtml(html = "") {
  return String(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const MODE_PROMPTS = {
  full: "Prepare a full, multi-dimensional structured analysis of the note.",
  quick: "Prepare a quick concise analysis — short summary, max 3 key points and max 2 action items.",
  exam: "Focus on exam prep: key concepts with definitions, knowledge-check questions, and critical facts.",
  project: "Focus on project management: tasks, priorities, risks, and next steps.",
};

async function callDeepSeek(messages, options = {}) {
  const apiKey = getApiKey();
  const model = options.model || PRIMARY_MODEL;

  const requestBody = {
    model,
    messages,
    temperature: options.temperature ?? 0.3,
    max_tokens: options.max_tokens ?? 2000,
    ...(options.jsonMode ? { response_format: { type: "json_object" } } : {}),
  };

  const response = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`DeepSeek API error (${response.status}): ${errorBody || response.statusText}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  if (!choice?.message?.content) {
    throw new Error("Empty response returned from DeepSeek API.");
  }

  return {
    content: choice.message.content,
    model: data.model || model,
    usage: data.usage,
  };
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
    model: "DeepSeek (Local Fallback Mode)",
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
    const plainText = stripHtml(content);
    const modeInstruction = MODE_PROMPTS[mode] || MODE_PROMPTS.full;

    const systemPrompt = `You are a high-intelligence note analyst powered by DeepSeek in a Notion-style knowledge workspace.
${modeInstruction}

You must output a JSON object adhering strictly to this format:
{
  "summary": "Concise paragraph summarizing the core theme",
  "readingTimeMinutes": 2,
  "complexity": "simple" | "moderate" | "complex",
  "tone": "Academic / Practical / Casual",
  "keyPoints": [
    { "id": "kp1", "text": "...", "importance": "high" | "medium" | "low" }
  ],
  "actionItems": [
    { "id": "ai1", "text": "...", "priority": "urgent" | "normal" | "low" }
  ],
  "openQuestions": [
    { "id": "q1", "text": "..." }
  ],
  "concepts": [
    { "id": "c1", "term": "...", "definition": "..." }
  ],
  "insights": [
    "Observation 1",
    "Observation 2"
  ],
  "suggestedNextSteps": [
    "Next step 1"
  ]
}

Rules:
- Respond ONLY with valid JSON.
- Base analysis ONLY on the provided note content.
- Ensure every array item has a unique id string.`;

    const userPrompt = `Note Title: "${title || "Untitled"}"\n\nNote Content:\n"""\n${plainText}\n"""`;

    const { content: rawText, model } = await callDeepSeek(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { jsonMode: true, temperature: 0.2 }
    );

    const parsed = safeJsonParse(rawText);

    return {
      ...parsed,
      generatedAt: new Date().toISOString(),
      mode,
      model: `DeepSeek (${model})`,
    };
  } catch (err) {
    console.warn("[deepseek] analyzeNote falling back to local heuristic analysis:", err.message);
    return localServerAnalyzeNote({ title, content, mode });
  }
}

async function chatAboutNote({ title, content, message, history = [] }) {
  try {
    const plainText = stripHtml(content);
    const systemPrompt = `You are an AI assistant in a Notion-style knowledge workspace with access to the user's note.
Note Title: "${title || "Untitled"}"
Note Body:
"""
${plainText}
"""

Rules:
- Answer questions directly and concisely in English.
- Base answers on the note text and logical extensions of its subject.
- If information is missing from the note, clarify what could be added.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-8).map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text,
      })),
      { role: "user", content: message },
    ];

    const { content: replyText } = await callDeepSeek(messages, { temperature: 0.5 });
    return replyText;
  } catch (err) {
    console.warn("[deepseek] chatAboutNote falling back to local heuristic chat:", err.message);
    return localServerChatAboutNote({ title, content, message });
  }
}

module.exports = {
  analyzeNote,
  chatAboutNote,
  stripHtml,
  safeJsonParse,
  callDeepSeek,
};
