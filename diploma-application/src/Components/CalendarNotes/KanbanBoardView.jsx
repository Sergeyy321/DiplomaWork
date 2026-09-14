import React, { useState } from "react";
import { Plus, Search, Calendar, Clock, Bell, CheckCircle2, CircleDot, Circle, Network, Film, Image as ImageIcon, FileText, Paperclip, Pencil } from "lucide-react";
import "./KanbanBoardView.css";

const COLUMNS = [
  {
    id: "todo",
    title: "To Do",
    icon: Circle,
    tagClass: "notion-col-tag--todo",
  },
  {
    id: "in-progress",
    title: "In Progress",
    icon: CircleDot,
    tagClass: "notion-col-tag--progress",
  },
  {
    id: "done",
    title: "Completed",
    icon: CheckCircle2,
    tagClass: "notion-col-tag--done",
  },
];

function stripHtml(html = "") {
  return String(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function KanbanBoardView({
  events,
  onOpenNote,
  onCreateNote,
  onUpdateNoteStatus,
  onJumpToCalendar,
  onJumpToMindMap,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  const filteredEvents = events.filter((note) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (note.title || "").toLowerCase().includes(q) ||
      (note.content || "").toLowerCase().includes(q)
    );
  });

  const handleDragStart = (e, id) => {
    e.dataTransfer.setData("text/plain", String(id));
    e.dataTransfer.effectAllowed = "move";
    setDraggedId(id);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverCol(null);
  };

  const handleDragOver = (e, colId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverCol !== colId) {
      setDragOverCol(colId);
    }
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = (e, colId) => {
    e.preventDefault();
    setDragOverCol(null);
    const noteId = e.dataTransfer.getData("text/plain");
    if (noteId) {
      onUpdateNoteStatus(Number(noteId) || noteId, colId);
    }
  };

  return (
    <div className="notion-board-container">
      <div className="notion-board-header">
        <h3 className="notion-board-title">
          Board View
        </h3>
        <div className="notion-board-search">
          <Search size={13} color="#787774" />
          <input
            type="text"
            placeholder="Search board cards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{ background: "none", border: "none", color: "#9b9a97", cursor: "pointer", fontSize: "11px" }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="notion-board-columns">
        {COLUMNS.map((col) => {
          const colNotes = filteredEvents.filter(
            (n) => (n.status || "todo") === col.id
          );
          const ColIcon = col.icon;
          const isOver = dragOverCol === col.id;

          return (
            <div
              key={col.id}
              className={`notion-board-col ${isOver ? "is-drag-over" : ""}`}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <div className="notion-col-header">
                <span className={`notion-col-tag ${col.tagClass}`}>
                  <ColIcon size={12} /> {col.title}
                </span>
                <span className="notion-col-count">{colNotes.length}</span>
              </div>

              <div className="notion-cards-list">
                {colNotes.map((note) => {
                  const plainSnippet = stripHtml(note.content);
                  const isBeingDragged = draggedId === note.id;

                  return (
                    <div
                      key={note.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, note.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onOpenNote(note)}
                      className={`notion-board-card ${isBeingDragged ? "is-dragging" : ""}`}
                      style={{ borderLeft: `3px solid ${note.color || "#37352f"}` }}
                    >
                      <h4 className="notion-card-title">{note.title || "Untitled"}</h4>

                      {plainSnippet && (
                        <p className="notion-card-snippet">{plainSnippet}</p>
                      )}

                      {/* Media Badges */}
                      {((note.attachments && note.attachments.length > 0) || (note.mediaLinks && note.mediaLinks.length > 0) || note.drawingDataUrl) && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", margin: "4px 0 6px" }}>
                          {note.attachments?.some((a) => a.type === "image") && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "2px", fontSize: "10px", padding: "1px 5px", borderRadius: "4px", background: "rgba(16, 185, 129, 0.12)", color: "#059669", fontWeight: "600" }}>
                              <ImageIcon size={9} /> {note.attachments.filter((a) => a.type === "image").length}
                            </span>
                          )}
                          {((note.mediaLinks && note.mediaLinks.length > 0) || note.attachments?.some((a) => a.type === "video")) && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "2px", fontSize: "10px", padding: "1px 5px", borderRadius: "4px", background: "rgba(239, 68, 68, 0.12)", color: "#dc2626", fontWeight: "600" }}>
                              <Film size={9} /> Video
                            </span>
                          )}
                          {note.attachments?.some((a) => a.type === "pdf") && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "2px", fontSize: "10px", padding: "1px 5px", borderRadius: "4px", background: "rgba(220, 38, 38, 0.12)", color: "#b91c1c", fontWeight: "600" }}>
                              <FileText size={9} /> PDF
                            </span>
                          )}
                          {note.drawingDataUrl && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "2px", fontSize: "10px", padding: "1px 5px", borderRadius: "4px", background: "rgba(124, 58, 237, 0.12)", color: "#7c3aed", fontWeight: "600" }}>
                              <Pencil size={9} /> Sketch
                            </span>
                          )}
                          {note.attachments?.some((a) => !["image", "pdf", "audio", "video"].includes(a.type)) && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "2px", fontSize: "10px", padding: "1px 5px", borderRadius: "4px", background: "rgba(59, 130, 246, 0.12)", color: "#2563eb", fontWeight: "600" }}>
                              <Paperclip size={9} /> {note.attachments.filter((a) => !["image", "pdf", "audio", "video"].includes(a.type)).length}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="notion-card-footer">
                        <button
                          type="button"
                          className="notion-card-date-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onJumpToCalendar && note.date) onJumpToCalendar(note.date);
                          }}
                          title={`View on Calendar (${note.date || "Today"})`}
                        >
                          <Calendar size={11} /> {note.date || "Today"}
                        </button>
                        {note.time && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                            <Clock size={10} /> {note.time}
                          </span>
                        )}
                        {note.reminder && (
                          <span className="notion-card-reminder" title="Reminder set">
                            <Bell size={11} />
                          </span>
                        )}
                        {onJumpToMindMap && (
                          <button
                            type="button"
                            className="notion-card-jump-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              onJumpToMindMap(note.id);
                            }}
                            title="Locate on Mind Map"
                          >
                            <Network size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {colNotes.length === 0 && (
                  <div className="notion-board-empty">
                    No tasks in {col.title.toLowerCase()}
                  </div>
                )}
              </div>

              <button
                type="button"
                className="notion-col-add-btn"
                onClick={() => onCreateNote(col.id)}
              >
                <Plus size={13} /> New task
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
