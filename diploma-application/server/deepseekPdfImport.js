const { callDeepSeek, safeJsonParse } = require("./deepseek");

function localServerImportPdfNote({ fileName, folders }) {
  const rawName = fileName || "Imported Document";
  const cleanTitle = rawName
    .replace(/\.pdf$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    title: cleanTitle,
    content: `<p>Imported document: <strong>${rawName}</strong></p><p>Document file attached for reference and study.</p>`,
    summary: `Imported PDF: ${rawName}`,
    placement: {
      folderAction: "existing",
      folderId: folders?.[0]?.id || "work",
      subcategoryAction: "none",
      reasoning: "Placed in workspace with PDF attached.",
      confidence: "high",
    },
    fileName: rawName,
    model: "DeepSeek (Local PDF Importer)",
  };
}

async function importPdfNote({ fileName, folders, pdfText = "" }) {
  try {
    const rawName = fileName || "Imported Document";
    const cleanTitle = rawName
      .replace(/\.pdf$/i, "")
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

    const folderList = (folders || [])
      .map((f) => `- id: "${f.id}", title: "${f.title}"`)
      .join("\n");

    const systemPrompt = `You are a study note converter powered by DeepSeek. Convert the user's PDF title/content into a structured HTML study note.

Available workspaces:
${folderList || "- id: 'work', title: 'Work Workspace'"}

Output JSON schema:
{
  "title": "${cleanTitle}",
  "content": "<p>Structured study note in clean HTML (using p, ul, li, strong, h3)</p>",
  "summary": "One sentence summary",
  "placement": {
    "folderAction": "existing",
    "folderId": "work",
    "subcategoryAction": "none",
    "reasoning": "Fits current workspace",
    "confidence": "high"
  }
}
Respond with valid JSON only.`;

    const userPrompt = `Document: ${rawName}\n${pdfText ? `Extracted Content:\n"""\n${pdfText.slice(0, 3000)}\n"""` : "Create an initial study note structure for this document."}`;

    const { content: rawText, model } = await callDeepSeek(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { jsonMode: true, temperature: 0.2 }
    );

    const parsed = safeJsonParse(rawText);
    return { ...parsed, fileName, model: `DeepSeek (${model})` };
  } catch (err) {
    console.warn("[deepseek-pdf] Falling back to local note structure:", err.message);
    return localServerImportPdfNote({ fileName, folders });
  }
}

module.exports = { importPdfNote };
