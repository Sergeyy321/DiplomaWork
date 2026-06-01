const { GoogleGenAI } = require("@google/genai");

const PRIMARY_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash";
const FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY in .env");
  return new GoogleGenAI({ apiKey });
}

const IMPORT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    content: {
      type: "string",
      description: "Note body as clean HTML using p, ul, li, strong, h3 tags",
    },
    summary: { type: "string" },
    placement: {
      type: "object",
      properties: {
        folderAction: { type: "string", enum: ["existing", "new"] },
        folderId: { type: "string" },
        newFolderTitle: { type: "string" },
        subcategoryAction: { type: "string", enum: ["existing", "new", "none"] },
        subcategoryId: { type: "string" },
        newSubcategoryTitle: { type: "string" },
        reasoning: { type: "string" },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
      },
      required: [
        "folderAction",
        "subcategoryAction",
        "reasoning",
        "confidence",
      ],
    },
  },
  required: ["title", "content", "summary", "placement"],
};

async function generateFromPdf(ai, pdfBase64, prompt, config) {
  const models = [PRIMARY_MODEL, ...FALLBACK_MODELS.filter((m) => m !== PRIMARY_MODEL)];
  let lastError;

  const parts = [
    { inlineData: { mimeType: "application/pdf", data: pdfBase64 } },
    { text: prompt },
  ];

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts }],
        config,
      });
      return { text: response.text, model };
    } catch (error) {
      lastError = error;
      console.warn(`[pdf-import] model ${model} failed:`, error.message);
    }
  }

  throw lastError || new Error("Failed to analyze PDF.");
}

async function importPdfNote({ pdfBase64, fileName, folders, subcategoriesByTopic }) {
  const ai = getClient();

  const folderList = (folders || [])
    .map((f) => `- id: "${f.id}", title: "${f.title}"`)
    .join("\n");

  const subcategoryList = Object.entries(subcategoriesByTopic || {})
    .map(([topicId, subs]) => {
      const topic = (folders || []).find((f) => f.id === topicId);
      const topicLabel = topic?.title || topicId;
      const items = (subs || [])
        .map((s) => `    - id: "${s.id}", title: "${s.title}"`)
        .join("\n");
      return `  Topic "${topicLabel}" (${topicId}):\n${items || "    (none)"}`;
    })
    .join("\n");

  const prompt = `You are an intelligent note importer for a student notes app. The user uploaded a PDF (filename: "${fileName}").

Read the PDF and create a structured study note from it.

Available workspaces (folders):
${folderList || "(none)"}

Existing subcategories by workspace:
${subcategoryList || "(none)"}

Rules:
- Respond ONLY in English.
- title: concise, descriptive note title derived from the PDF.
- content: well-structured HTML note summarizing key information from the PDF. Use <p>, <ul>, <li>, <strong>, <h3>. Do NOT wrap in markdown.
- summary: one sentence for the user preview.
- placement.folderAction: "existing" if a workspace clearly matches, else "new".
- placement.folderId: MUST be an exact id from the list when folderAction is "existing".
- placement.newFolderTitle: suggested workspace name when folderAction is "new" (e.g. subject name).
- placement.subcategoryAction: "existing" if a subcategory fits, "new" if a new one should be created, "none" if note belongs at workspace level only.
- placement.subcategoryId: exact id when subcategoryAction is "existing".
- placement.newSubcategoryTitle: when subcategoryAction is "new".
- placement.reasoning: brief explanation of why this placement fits.
- placement.confidence: high/medium/low.

Pick the best matching workspace and subcategory when possible. For lecture notes, exams, or teacher materials, prefer creating a subject-specific subcategory if none exists.`;

  const { text, model } = await generateFromPdf(ai, pdfBase64, prompt, {
    responseMimeType: "application/json",
    responseSchema: IMPORT_SCHEMA,
    temperature: 0.3,
  });

  return { ...JSON.parse(text), model, fileName };
}

module.exports = { importPdfNote };
