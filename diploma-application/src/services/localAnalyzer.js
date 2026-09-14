/**
 * Local Fallback Analyzer and Offline Engine
 * Allows the entire application to analyze notes, answer questions,
 * and import PDFs seamlessly even without active Gemini API keys.
 */

export function stripHtml(html = "") {
  return String(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function localAnalyzeNote({ title, content, mode = "full" }) {
  const plain = stripHtml(content || "");
  const words = plain.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 180));
  
  // Extract sentences
  const sentences = plain
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 5);

  // Summary
  const summary = sentences.slice(0, mode === "quick" ? 2 : 3).join(" ") || plain.slice(0, 200) || "No text available in this note.";

  // Key points
  const keyPoints = (sentences.length > 0 ? sentences.slice(0, mode === "quick" ? 3 : 5) : [title || "Key overview"])
    .map((text, i) => ({
      id: `kp_${i + 1}`,
      text: text.replace(/^[-*•]\s*/, ""),
      importance: i === 0 ? "high" : i === 1 ? "medium" : "low"
    }));

  // Action items: look for sentences with action verbs or bullet points
  const actionRegex = /\b(todo|must|need|should|review|implement|create|fix|update|deploy|write|design|complete|test|check|verify|plan)\b/i;
  const taskCandidates = sentences.filter(s => actionRegex.test(s));
  
  const actionItems = taskCandidates.length > 0
    ? taskCandidates.slice(0, 4).map((text, i) => ({
        id: `ai_${i + 1}`,
        text: text.replace(/^[-*•]\s*/, ""),
        priority: i === 0 ? "urgent" : "normal"
      }))
    : [
        { id: "ai_1", text: `Review and structure core concepts in "${title || "this note"}"`, priority: "normal" },
        { id: "ai_2", text: "Create practical test cases and summary notes", priority: "low" }
      ];

  // Concepts: look for bold tags in HTML or capitalized phrases
  const boldMatches = Array.from((content || "").matchAll(/<(strong|b)>([^<]+)<\/\1>/gi)).map(m => m[2].trim());
  const concepts = boldMatches.length > 0
    ? boldMatches.slice(0, 4).map((term, i) => ({
        id: `c_${i + 1}`,
        term,
        definition: `Key term emphasized in "${title || "note"}" for study review.`
      }))
    : [
        {
          id: "c_1",
          term: title || "Main Subject",
          definition: "Core topic documented in this workspace entry."
        }
      ];

  // Open questions
  const openQuestions = [
    { id: "q_1", text: `How can the methods described in "${title || "this note"}" be applied directly?` },
    { id: "q_2", text: "What are the primary constraints, trade-offs, and expected outcomes?" }
  ];

  return {
    summary,
    readingTimeMinutes: readingTime,
    complexity: wordCount > 250 ? "complex" : wordCount > 100 ? "moderate" : "simple",
    tone: "Informative & Structured",
    keyPoints,
    actionItems,
    openQuestions,
    concepts,
    insights: [
      `Analyzed ${wordCount} words (~${readingTime} min estimated reading time).`,
      "Action tasks and main takeaways mapped for structured review."
    ],
    generatedAt: new Date().toISOString(),
    mode,
    model: "Local Engine (Offline)",
    isLocal: true,
  };
}

export function localChatAboutNote({ title, content, message }) {
  const query = (message || "").toLowerCase().trim();
  const plain = stripHtml(content || "");
  const sentences = plain.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 5);

  // Search for matching sentences
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

  if (query.includes("missing") || query.includes("next")) {
    return `To expand "${title || "this topic"}", consider adding concrete milestones, test cases, and references.`;
  }

  return `Context from "${title || "Note"}":\n\n${sentences.slice(0, 2).join(" ") || plain.slice(0, 150)}`;
}

export function localImportPdf({ file, folders }) {
  const rawName = file?.name || "Imported Document";
  const cleanTitle = rawName
    .replace(/\.pdf$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());

  return {
    title: cleanTitle,
    content: `<p>Imported document: <strong>${rawName}</strong></p><p>File attached below for study and reference.</p>`,
    summary: `Imported PDF document: ${rawName}`,
    placement: {
      folderAction: "existing",
      folderId: folders?.[0]?.id || "work",
      subcategoryAction: "none",
      reasoning: "Placed into workspace with original PDF attached.",
      confidence: "high"
    },
    fileName: rawName,
    model: "Local Engine (Offline)",
    isLocal: true,
  };
}
