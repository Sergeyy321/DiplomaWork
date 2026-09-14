const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
require("./tls");

const express = require("express");
const cors = require("cors");
const multer = require("multer");

const { analyzeNote, chatAboutNote } = require("./deepseek");
const { importPdfNote } = require("./deepseekPdfImport");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF files are supported."));
  },
});

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: ["http://localhost:3000", "http://127.0.0.1:3000"] }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
    hasKey: Boolean(process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY),
  });
});

app.post("/api/analyze", async (req, res) => {
  try {
    const { title, content, mode = "full" } = req.body || {};

    if (!content || String(content).replace(/<[^>]+>/g, " ").trim().length < 10) {
      return res.status(400).json({
        error: "Note is too short to analyze (minimum 10 characters).",
      });
    }

    const analysis = await analyzeNote({ title, content, mode });
    res.json(analysis);
  } catch (error) {
    console.error("[analyze]", error);
    res.status(500).json({
      error: error.message || "Failed to analyze the note.",
    });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const { title, content, message, history = [] } = req.body || {};

    if (!message?.trim()) {
      return res.status(400).json({ error: "Message cannot be empty." });
    }

    const reply = await chatAboutNote({ title, content, message, history });
    res.json({ reply });
  } catch (error) {
    console.error("[chat]", error);
    res.status(500).json({
      error: error.message || "Failed to get a response.",
    });
  }
});

app.post("/api/import-pdf", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded." });
    }

    let context = {};
    try {
      context = JSON.parse(req.body.context || "{}");
    } catch {
      return res.status(400).json({ error: "Invalid context JSON." });
    }

    const pdfBase64 = req.file.buffer.toString("base64");
    const result = await importPdfNote({
      pdfBase64,
      fileName: req.file.originalname,
      folders: context.folders || [],
      subcategoriesByTopic: context.subcategoriesByTopic || {},
    });

    res.json(result);
  } catch (error) {
    console.error("[import-pdf]", error);
    res.status(500).json({
      error: error.message || "Failed to import PDF.",
    });
  }
});

// Centralized error handling for Multer and request errors (Bug 2.1)
app.use((err, _req, res, _next) => {
  console.error("[server error]", err);
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File too large. Maximum size is 15MB." });
    }
    return res.status(400).json({ error: err.message });
  }
  res.status(err.status || 400).json({
    error: err.message || "An unexpected error occurred on the server.",
  });
});

const server = app.listen(PORT, () => {
  console.log(`DeepSeek AI server running at: http://localhost:${PORT}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n⚠️ Port ${PORT} is already in use by an existing node process.`);
    console.error(`To free up port ${PORT}, run:`);
    console.error(`  npx kill-port ${PORT}`);
    console.error(`Or close any duplicate terminal running the server.\n`);
    process.exit(1);
  } else {
    console.error("[Server Error]", err);
  }
});
