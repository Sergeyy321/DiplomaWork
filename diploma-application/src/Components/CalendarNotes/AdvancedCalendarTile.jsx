import React from "react";
import { formatLocalDate } from "../../utils/dateUtils";

export default function AdvancedCalendarTile({ 
  tileDate, 
  dayEvents, 
  setSelectedEvent, 
  setIsPreviewOpen 
}) {
  const dateStr = formatLocalDate(tileDate);

  const handleDragStart = (e, eventId) => {
    e.stopPropagation();
    e.dataTransfer.setData("text/plain", eventId);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div style={tileWrapper} data-date={dateStr}>
      <div style={tileNotesScrollArea}>
        {dayEvents.map((event) => {
          const isDone = event.status === "done";
          return (
            <div
              key={event.id}
              draggable
              onDragStart={(e) => handleDragStart(e, event.id)}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedEvent(event);
                setIsPreviewOpen(true);
              }}
              style={{
                ...notionCalendarTag,
                borderLeft: "3px solid " + (event.color || "#37352f"),
                opacity: isDone ? 0.75 : 1,
              }}
              title={"Drag note to reschedule • " + (isDone ? "Completed" : "Active")}
            >
              <span style={{ 
                ...badgeText, 
                fontFamily: event.fontStyle || "inherit",
                fontWeight: event.isBold ? "600" : "500",
                fontStyle: event.isItalic ? "italic" : "normal",
                textDecoration: isDone ? "line-through" : "none",
                color: isDone ? "var(--notion-placeholder, #9b9a97)" : "var(--notion-text, #37352f)",
              }}>
                {isDone && <span style={{ marginRight: 3, color: "#10b981", textDecoration: "none" }}>✓</span>}
                {event.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const tileWrapper = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  width: "100%",
  justifyContent: "flex-start",
  minHeight: "75px",
  padding: "2px",
  boxSizing: "border-box",
  position: "relative",
};

const tileNotesScrollArea = {
  display: "flex",
  flexDirection: "column",
  gap: "3px",
  overflowY: "auto",
  maxHeight: "80px",
  width: "100%",
  marginTop: "2px",
};

const notionCalendarTag = {
  fontSize: "11px",
  borderRadius: "4px",
  padding: "2px 5px",
  display: "flex",
  alignItems: "center",
  background: "var(--notion-plate, var(--notion-sidebar, #f7f7f5))",
  border: "1px solid var(--notion-border, #edece9)",
  cursor: "grab",
  zIndex: 10,
  transition: "background 0.12s ease",
  marginBottom: "1px",
  width: "100%",
  boxSizing: "border-box",
};

const badgeText = { 
  flex: 1, 
  overflow: "hidden", 
  textOverflow: "ellipsis", 
  whiteSpace: "nowrap", 
  textAlign: "left", 
  pointerEvents: "none", 
  lineHeight: "1.3",
};
