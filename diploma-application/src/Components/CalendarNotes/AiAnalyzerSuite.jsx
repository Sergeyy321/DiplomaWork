import React, { useState, useEffect } from "react";
import { pipeline, env } from "@huggingface/transformers";


env.allowLocalModels = false;
env.remoteObjectURL = "https://cdnjs.cloudflare.com/ajax/libs/transformers/2.14.0/models/"; 

env.backends.onnx.wasm.simd = false; 
env.backends.onnx.wasm.proxy = false;

export default function AiAnalyzerSuite({ filteredEvents, aiTargetNote, setAiTargetNote }) {
  const [summary, setSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [aiEngine, setAiEngine] = useState(null);
  const [statusMessage, setStatusMessage] = useState("Initializing AI model...");

  useEffect(() => {
    async function loadModel() {
      try {
        setStatusMessage("Downloading robust AI model core (~45MB)...");
        
        // 🌟 CRITICAL FIX: Explicitly enforce 'fp32' precision to kill dequantize linear crashes
        const summarizer = await pipeline("summarization", "Xenova/t5-small", {
          dtype: "fp32", // Forces clean uncompressed arrays bypassing broken MatMulNBits scales
        });
        
        setAiEngine(() => summarizer);
        setStatusMessage("AI Engine is ready.");
      } catch (error) {
        console.error("Critical fault loading AI model layer:", error);
        setStatusMessage(`Error loading model: ${error.message || "Session Creation Failure"}`);
      }
    }
    if (!aiEngine) {
      loadModel();
    }
  }, [aiEngine]);

  useEffect(() => {
    async function generateSummary() {
      if (!aiEngine || !aiTargetNote) return;
      
      const textToAnalyze = aiTargetNote.content || aiTargetNote.title;
      if (!textToAnalyze || textToAnalyze.trim().length < 10) {
        setSummary("The document content is too short for AI to process. Please write a longer note.");
        return;
      }

      setIsLoading(true);
      setSummary("");
      setStatusMessage("AI is compiling natural language parameters...");

      try {
        const output = await aiEngine(textToAnalyze, {
          max_length: 50,
          min_length: 15,
        });

        if (output && output[0]?.summary_text) {
          setSummary(output[0].summary_text);
          setStatusMessage("Summary generated successfully.");
        } else {
          setSummary("AI compiled empty outputs for this text layout.");
        }
      } catch (error) {
        console.error("AI Generation error parameters:", error);
        setSummary("Generation failed. Try extending the text content lengths.");
        setStatusMessage("Ready.");
      } finally {
        setIsLoading(false);
      }
    }

    generateSummary();
  }, [aiTargetNote, aiEngine]);

  return (
    <div style={aiSuiteContainer}>
      <div style={{ ...aiHeaderCard, background: aiEngine ? "#f0fdf4" : "#fffbeb", borderColor: aiEngine ? "#bbf7d0" : "#fef3c7" }}>
        <h2 style={{ margin: 0, color: aiEngine ? "#065f46" : "#b45309", fontSize: "18px" }}>
          {aiEngine ? "✨ Generative AI Workspace" : "⏳ Setting Up AI Infrastructure"}
        </h2>
        <p style={{ margin: "4px 0 0 0", color: aiEngine ? "#047857" : "#d97706", fontSize: "13px" }}>
          Status: {statusMessage}
        </p>
      </div>

      <div style={aiDashboardSplitter}>
        <div style={aiSelectorCard}>
          <h3 style={{ marginTop: 0, fontSize: "14px", color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em" }}>Documents</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {filteredEvents.map((e) => (
              <div 
                key={e.id} 
                onClick={() => !isLoading && setAiTargetNote(e)}
                style={{
                  ...aiItemRow,
                  borderLeft: `4px solid ${e.color}`,
                  background: aiTargetNote?.id === e.id ? "#f5f3ff" : "#ffffff",
                  borderColor: aiTargetNote?.id === e.id ? "#6366f1" : e.color,
                  cursor: isLoading ? "not-allowed" : "pointer",
                  opacity: isLoading && aiTargetNote?.id !== e.id ? 0.6 : 1
                }}
              >
                <div style={{ fontWeight: "600", fontSize: "13px", color: "#111827", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                  {e.title || "Untitled Note"}
                </div>
                {e.time ? <div style={{ fontSize: "11px", color: "#6b7280" }}>🕒 {e.time}</div> : null}
              </div>
            ))}
            {filteredEvents.length === 0 && (
              <p style={{ color: "#9ca3af", fontSize: "13px" }}>No active logs in this space.</p>
            )}
          </div>
        </div>

        <div style={aiReportWorkspace}>
          {aiTargetNote ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px", height: "100%" }}>
              <div style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: "12px" }}>
                <span style={{ fontSize: "12px", textTransform: "uppercase", color: "#9ca3af", fontWeight: "700" }}>Analyzing File</span>
                <h3 style={{ margin: "4px 0 0 0", color: "#111827" }}>{aiTargetNote.title}</h3>
              </div>

              <div style={summaryOutputCard}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "#4f46e5", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    AI Summary Output
                  </span>
                  {isLoading && <span style={loadingSpinnerStyle}>⚡ Generating Summary...</span>}
                </div>
                
                <p style={{ margin: 0, fontSize: "15px", color: summary ? "#1f2937" : "#9ca3af", lineHeight: "1.6", fontStyle: summary ? "normal" : "italic" }}>
                  {summary || (isLoading ? "The neural network is processing your strings..." : "Select a document parameter instance to execute summary.")}
                </p>
              </div>

              <div style={{ marginTop: "auto", background: "#f9fafb", padding: "14px", borderRadius: "10px", border: "1px solid #e5e7eb" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase" }}>Source Document Context</div>
                <p style={{ margin: "6px 0 0 0", color: "#4b5563", fontSize: "13px", lineHeight: "1.5" }}>
                  {aiTargetNote.content || "No body text present."}
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: "300px", color: "#9ca3af", textAlign: "center" }}>
              <span style={{ fontSize: "36px" }}>🤖</span>
              <p style={{ marginTop: "12px", fontSize: "14px", maxWidth: "260px" }}>
                Select any custom note layout from the left panel. The browser model will extract the natural linguistic summary.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const aiSuiteContainer = { display: "flex", flexDirection: "column", gap: "20px", background: "#ffffff", borderRadius: "20px", padding: "24px", border: "1px solid #e5e7eb" };
const aiHeaderCard = { padding: "16px 20px", borderRadius: "12px", border: "1px solid #cbd5e1", transition: "all 0.3s ease" };
const aiDashboardSplitter = { display: "grid", gridTemplateColumns: "240px 1fr", gap: "20px", minHeight: "400px" };
const aiSelectorCard = { background: "#f9fafb", border: "1px solid #e5e7eb", padding: "16px", borderRadius: "12px", maxHeight: "450px", overflowY: "auto" };
const aiItemRow = { padding: "12px", borderRadius: "8px", border: "1px solid #e5e7eb", transition: "all 0.15s ease", display: "flex", flexDirection: "column", gap: "4px" };
const aiReportWorkspace = { border: "1px solid #e5e7eb", borderRadius: "12px", padding: "24px", background: "#ffffff" };
const summaryOutputCard = { background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px", minHeight: "120px" };
const loadingSpinnerStyle = { fontSize: "11px", color: "#4f46e5", fontWeight: "700" };