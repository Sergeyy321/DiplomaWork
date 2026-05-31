import React, { useState, useEffect, useRef } from "react";
import { pipeline, env } from "@huggingface/transformers";

env.allowLocalModels = false;
env.remoteObjectURL = "https://cdnjs.cloudflare.com/ajax/libs/transformers/2.14.0/models/"; 
env.backends.onnx.wasm.simd = false; 
env.backends.onnx.wasm.proxy = false;

export default function AiAnalyzerSuite({ filteredEvents, aiTargetNote, setAiTargetNote, setEvents }) {
  const [summary, setSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [aiEngine, setAiEngine] = useState(null);
  const [statusMessage, setStatusMessage] = useState("Initializing AI model...");

  // Editing States
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const typingTimeoutRef = useRef(null);

  // Load Model Instance on mount
  useEffect(() => {
    async function loadModel() {
      try {
        setStatusMessage("Downloading robust AI model core (~45MB)...");
        
        const summarizer = await pipeline("summarization", "Xenova/t5-small", {
          dtype: "fp32", 
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

  // Synchronize internal text editor state when target note switches
  useEffect(() => {
    if (aiTargetNote) {
      setEditContent(aiTargetNote.content || "");
      setIsEditing(false); // Reset edit mode on document swap
    }
  }, [aiTargetNote]);

  // Handle generative AI inference routines
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
          setStatusMessage("Summary updated successfully.");
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

  // Handler to update parent state modifications
  const handleContentChange = (newText) => {
    setEditContent(newText);

    // Update parent global app array instantly so other views stay in sync
    setEvents((prev) =>
      prev.map((evt) => (evt.id === aiTargetNote.id ? { ...evt, content: newText } : evt))
    );

    // Debounce state reassignment to prevent firing AI models on every single keystroke
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      setAiTargetNote((prev) => ({ ...prev, content: newText }));
    }, 1200); // Wait 1.2s after user stops typing to run model inference
  };

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
        {/* Left column list panel */}
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
                <div style={{ fontSize: "11px", color: "#6b7280" }}>🕒 {e.time}</div>
              </div>
            ))}
            {filteredEvents.length === 0 && (
              <p style={{ color: "#9ca3af", fontSize: "13px" }}>No active logs in this space.</p>
            )}
          </div>
        </div>

        {/* Right workspace interactive engine report layout */}
        <div style={aiReportWorkspace}>
          {aiTargetNote ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px", height: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e5e7eb", paddingBottom: "12px" }}>
                <div>
                  <span style={{ fontSize: "12px", textTransform: "uppercase", color: "#9ca3af", fontWeight: "700" }}>Analyzing File</span>
                  <h3 style={{ margin: "4px 0 0 0", color: "#111827" }}>{aiTargetNote.title}</h3>
                </div>
                <button 
                  onClick={() => setIsEditing(!isEditing)} 
                  style={{ ...actionBtnToggle, background: isEditing ? "#10b981" : "#e5e7eb", color: isEditing ? "white" : "#374151" }}
                >
                  {isEditing ? "💾 Reading Mode" : "✏️ Live Edit Text"}
                </button>
              </div>

              {/* Summary Block */}
              <div style={summaryOutputCard}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "#4f46e5", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    AI Summary Output
                  </span>
                  {isLoading && <span style={loadingSpinnerStyle}>⚡ Regenerating Summary...</span>}
                </div>
                
                <p style={{ margin: 0, fontSize: "15px", color: summary ? "#1f2937" : "#9ca3af", lineHeight: "1.6", fontStyle: summary ? "normal" : "italic" }}>
                  {summary || (isLoading ? "The neural network is re-processing changes..." : "Select a document parameter instance to execute summary.")}
                </p>
              </div>

              {/* Source Context Block with Live Input Option */}
              <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: "6px" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase" }}>
                  Source Document Context {isEditing && <span style={{ color: "#6366f1" }}>(Auto-summarizes when you stop typing)</span>}
                </div>
                
                {isEditing ? (
                  <textarea
                    value={editContent}
                    onChange={(e) => handleContentChange(e.target.value)}
                    style={editorTextarea}
                    placeholder="Modify source content variables..."
                  />
                ) : (
                  <div style={{ background: "#f9fafb", padding: "14px", borderRadius: "10px", border: "1px solid #e5e7eb", flex: 1, overflowY: "auto" }}>
                    <p style={{ margin: 0, color: "#4b5563", fontSize: "13px", lineHeight: "1.5", whiteSpace: "pre-wrap" }}>
                      {aiTargetNote.content || "No body text present."}
                    </p>
                  </div>
                )}
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

// Stylesheet elements
const aiSuiteContainer = { display: "flex", flexDirection: "column", gap: "20px", background: "#ffffff", borderRadius: "20px", padding: "24px", border: "1px solid #e5e7eb" };
const aiHeaderCard = { padding: "16px 20px", borderRadius: "12px", border: "1px solid #cbd5e1", transition: "all 0.3s ease" };
const aiDashboardSplitter = { display: "grid", gridTemplateColumns: "240px 1fr", gap: "20px", minHeight: "450px" };
const aiSelectorCard = { background: "#f9fafb", border: "1px solid #e5e7eb", padding: "16px", borderRadius: "12px", maxHeight: "500px", overflowY: "auto" };
const aiItemRow = { padding: "12px", borderRadius: "8px", border: "1px solid #e5e7eb", transition: "all 0.15s ease", display: "flex", flexDirection: "column", gap: "4px" };
const aiReportWorkspace = { border: "1px solid #e5e7eb", borderRadius: "12px", padding: "24px", background: "#ffffff", display: "flex", flexDirection: "column" };
const summaryOutputCard = { background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px", minHeight: "100px" };
const loadingSpinnerStyle = { fontSize: "11px", color: "#4f46e5", fontWeight: "700" };
const actionBtnToggle = { padding: "8px 16px", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: "600", cursor: "pointer", transition: "all 0.2s" };
const editorTextarea = { width: "100%", flex: 1, minHeight: "150px", padding: "12px", borderRadius: "10px", border: "2px solid #6366f1", outline: "none", fontSize: "13px", lineHeight: "1.5", color: "#374151", resize: "none", fontFamily: "inherit" };