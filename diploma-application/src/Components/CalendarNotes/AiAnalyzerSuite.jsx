import React from "react";
import { Sparkles } from "lucide-react";
import NoteAnalysisView from "./NoteAnalysisView";
import "./NoteAnalysisView.css";

export default function AiAnalyzerSuite({
  filteredEvents,
  aiTargetNote,
  setAiTargetNote,
  onSaveAnalysis,
}) {
  return (
    <div className="nav-suite">
      <div className="nav-suite-header">
        <Sparkles size={20} strokeWidth={1.75} color="#4f46e5" />
        <div>
          <h2>AI Insights</h2>
          <p>Step-by-step breakdown of your notes</p>
        </div>
      </div>

      <div className="nav-suite-picker">
        <label htmlFor="ai-note-select">Note</label>
        <select
          id="ai-note-select"
          value={aiTargetNote?.id ?? ""}
          onChange={(e) => {
            const note = filteredEvents.find((n) => String(n.id) === e.target.value);
            setAiTargetNote(note || null);
          }}
        >
          <option value="">Choose a note...</option>
          {filteredEvents.map((note) => (
            <option key={note.id} value={note.id}>
              {note.title || "Untitled"}{note.aiAnalysis ? " · analyzed" : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="nav-suite-body">
        <NoteAnalysisView note={aiTargetNote} onSaveAnalysis={onSaveAnalysis} />
      </div>
    </div>
  );
}
