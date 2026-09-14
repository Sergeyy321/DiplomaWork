import React, { useState, useMemo } from "react";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Bell, 
  Plus, 
  CheckCircle2, 
  CircleDot, 
  Circle, 
  CalendarCheck,
  Film,
  Image as ImageIcon,
  FileText,
  Paperclip,
  Pencil
} from "lucide-react";
import { 
  generateGoogleCalendarEventUrl, 
  exportSingleNoteIcs 
} from "./exportIcs";

function stripHtml(html = "") {
  return String(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STATUS_CONFIG = {
  todo: { label: "To Do", icon: Circle, className: "todo", next: "in-progress" },
  "in-progress": { label: "In Progress", icon: CircleDot, className: "in-progress", next: "done" },
  done: { label: "Done", icon: CheckCircle2, className: "done", next: "todo" },
};

export default function MobileNotesFeed({
  events = [],
  categories = [],
  activeCategory = "all",
  onOpenNote,
  onCreateNote,
  onUpdateNoteStatus,
  onOpenCalendarSync,
}) {
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredNotes = useMemo(() => {
    let list = events;
    if (activeCategory !== "all") {
      list = list.filter((e) => (e.categoryId || e.folderId) === activeCategory);
    }
    if (statusFilter !== "all") {
      list = list.filter((e) => (e.status || "todo") === statusFilter);
    }
    return list;
  }, [events, activeCategory, statusFilter]);

  const handleCycleStatus = (e, note) => {
    e.stopPropagation();
    const current = note.status || "todo";
    const next = STATUS_CONFIG[current]?.next || "todo";
    if (onUpdateNoteStatus) {
      onUpdateNoteStatus(note.id, next);
    }
  };

  const handleAddGoogle = (e, note) => {
    e.stopPropagation();
    const catObj = categories.find((c) => c.id === (note.categoryId || note.folderId));
    const url = generateGoogleCalendarEventUrl(note, catObj?.title || "General");
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleAddApple = (e, note) => {
    e.stopPropagation();
    const catObj = categories.find((c) => c.id === (note.categoryId || note.folderId));
    exportSingleNoteIcs(note, catObj?.title || "General", "apple");
  };

  return (
    <div className="mobile-notes-feed-container">
      {/* Search & Top Filter Toolbar */}
      <div className="mobile-feed-toolbar">
        <div className="mobile-feed-status-tabs">
          {["all", "todo", "in-progress", "done"].map((st) => (
            <button
              key={st}
              type="button"
              className={`mobile-feed-tab-btn ${statusFilter === st ? "is-active" : ""}`}
              onClick={() => setStatusFilter(st)}
            >
              {st === "all" ? "All" : st === "in-progress" ? "Progress" : st === "done" ? "Done" : "To Do"}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="mobile-feed-sync-all-btn"
          onClick={onOpenCalendarSync}
          title="Add all notes to Google or iPhone Calendar"
        >
          <CalendarCheck size={12} />
          <span>Sync Cal</span>
        </button>
      </div>

      {/* Notes List */}
      {filteredNotes.length === 0 ? (
        <div className="mobile-feed-empty">
          <div className="mobile-feed-empty-icon">📝</div>
          <h4 className="mobile-feed-empty-title">No notes found</h4>
          <p className="mobile-feed-empty-sub">
            Tap below to capture your first note or task for this category.
          </p>
          <button
            type="button"
            className="mobile-feed-empty-btn"
            onClick={() => onCreateNote(new Date())}
          >
            <Plus size={14} />
            <span>Create New Note</span>
          </button>
        </div>
      ) : (
        filteredNotes.map((note) => {
          const catObj = categories.find((c) => c.id === (note.categoryId || note.folderId));
          const statusObj = STATUS_CONFIG[note.status || "todo"] || STATUS_CONFIG.todo;
          const StatusIcon = statusObj.icon;
          const noteColor = note.color || catObj?.color || "#4f46e5";

          return (
            <div
              key={note.id}
              className="mobile-note-card"
              onClick={() => onOpenNote(note)}
            >
              <div 
                className="mobile-note-card-accent-bar" 
                style={{ backgroundColor: noteColor }} 
              />

              <div className="mobile-note-card-header">
                <button
                  type="button"
                  className={`mobile-note-status-btn ${statusObj.className}`}
                  onClick={(e) => handleCycleStatus(e, note)}
                  title="Cycle status"
                >
                  <StatusIcon size={11} />
                  <span>{statusObj.label}</span>
                </button>

                {catObj && (
                  <span 
                    style={{ 
                      fontSize: "10px", 
                      fontWeight: "600", 
                      color: noteColor,
                      background: `${noteColor}15`,
                      padding: "2px 7px",
                      borderRadius: "6px"
                    }}
                  >
                    {catObj.title}
                  </span>
                )}
              </div>

              <h4 className="mobile-note-card-title">{note.title || "Untitled Note"}</h4>

              {note.content && (
                <p className="mobile-note-card-snippet">
                  {stripHtml(note.content)}
                </p>
              )}

              {/* Media Preview Badges */}
              {((note.attachments && note.attachments.length > 0) || (note.mediaLinks && note.mediaLinks.length > 0) || note.drawingDataUrl) && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", margin: "6px 0 8px" }}>
                  {note.attachments?.some((a) => a.type === "image") && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "10.5px", padding: "2px 6px", borderRadius: "4px", background: "rgba(16, 185, 129, 0.12)", color: "#059669", fontWeight: "600" }}>
                      <ImageIcon size={10} /> {note.attachments.filter((a) => a.type === "image").length} {note.attachments.filter((a) => a.type === "image").length === 1 ? "img" : "imgs"}
                    </span>
                  )}
                  {((note.mediaLinks && note.mediaLinks.length > 0) || note.attachments?.some((a) => a.type === "video")) && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "10.5px", padding: "2px 6px", borderRadius: "4px", background: "rgba(239, 68, 68, 0.12)", color: "#dc2626", fontWeight: "600" }}>
                      <Film size={10} /> Video
                    </span>
                  )}
                  {note.attachments?.some((a) => a.type === "pdf") && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "10.5px", padding: "2px 6px", borderRadius: "4px", background: "rgba(220, 38, 38, 0.12)", color: "#b91c1c", fontWeight: "600" }}>
                      <FileText size={10} /> PDF
                    </span>
                  )}
                  {note.drawingDataUrl && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "10.5px", padding: "2px 6px", borderRadius: "4px", background: "rgba(124, 58, 237, 0.12)", color: "#7c3aed", fontWeight: "600" }}>
                      <Pencil size={10} /> Sketch
                    </span>
                  )}
                  {note.attachments?.some((a) => !["image", "pdf", "audio", "video"].includes(a.type)) && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "10.5px", padding: "2px 6px", borderRadius: "4px", background: "rgba(59, 130, 246, 0.12)", color: "#2563eb", fontWeight: "600" }}>
                      <Paperclip size={10} /> {note.attachments.filter((a) => !["image", "pdf", "audio", "video"].includes(a.type)).length}
                    </span>
                  )}
                </div>
              )}

              <div className="mobile-note-card-footer">
                <div className="mobile-note-meta-badges">
                  {note.date && (
                    <span className="mobile-note-meta-badge">
                      <CalendarIcon size={10} /> {note.date}
                    </span>
                  )}
                  {note.time && (
                    <span className="mobile-note-meta-badge">
                      <Clock size={10} /> {note.time}
                    </span>
                  )}
                  {note.reminder && (
                    <span className="mobile-note-meta-badge reminder">
                      <Bell size={10} />
                    </span>
                  )}
                </div>

                <div className="mobile-note-card-actions">
                  <button
                    type="button"
                    className="mobile-note-action-btn cal-btn"
                    onClick={(e) => handleAddGoogle(e, note)}
                    title="Add to Google Calendar"
                  >
                    <span>+ Google</span>
                  </button>
                  <button
                    type="button"
                    className="mobile-note-action-btn cal-btn"
                    onClick={(e) => handleAddApple(e, note)}
                    title="Add to iPhone Calendar"
                  >
                    <span>+ iPhone</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
