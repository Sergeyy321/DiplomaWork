import React from "react";

export default function AdvancedCalendarTile({ 
  tileDate, 
  dayEvents, 
  setSelectedEvent, 
  setIsPreviewOpen 
}) {
  const dateStr = tileDate.toISOString().split("T")[0];

  const handleDragStart = (e, eventId) => {
    e.stopPropagation();
    e.dataTransfer.setData("text/plain", eventId);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div style={tileWrapper} data-date={dateStr}>
      <div style={tileNotesScrollArea}>
        {dayEvents.map((event) => (
          <div key={event.id} style={{ display: "flex", flexDirection: "column", width: "100%" }}>
            {/* Primary Document Header Card */}
            <div
              draggable
              onDragStart={(e) => handleDragStart(e, event.id)}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedEvent(event);
                setIsPreviewOpen(true);
              }}
              style={{
                ...modernInlineBadge,
                background: `${event.color}14`,
                borderLeft: `3px solid ${event.color}`,
              }}
              title="Drag node to reschedule"
            >
              <span style={{ ...badgeTime, pointerEvents: "none" }}>{event.time}</span>
              <span style={{ ...badgeText, pointerEvents: "none" }}>{event.title}</span>
            </div>

            {/* Shared Tasks List rendering inside the calendar card */}
            {event.tasks && event.tasks.length > 0 && (
              <div style={tileInlineTaskList}>
                {event.tasks.map((task) => (
                  <div key={task.id} style={tileInlineTaskRow}>
                    <span style={{ 
                      ...miniTaskDot, 
                      background: task.completed ? "#9ca3af" : event.color 
                    }} />
                    <span style={{ 
                      ...tileTaskText,
                      textDecoration: task.completed ? "line-through" : "none",
                      opacity: task.completed ? 0.5 : 1
                    }}>
                      {task.text}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const tileWrapper = { display: "flex", flexDirection: "column", height: "100%", width: "100%", justifyContent: "flex-start", minHeight: "85px", padding: "4px", boxSizing: "border-box", position: "relative" };
const tileNotesScrollArea = { display: "flex", flexDirection: "column", gap: "6px", overflowY: "auto", maxHeight: "75px", width: "100%" };
const modernInlineBadge = { fontSize: "10px", borderRadius: "4px", padding: "2px 4px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "2px", cursor: "grab", zIndex: 10 };
const badgeTime = { fontWeight: "700", opacity: 0.8, fontSize: "9px", whiteSpace: "nowrap" };
const badgeText = { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left", marginLeft: "2px", fontWeight: "600" };
const tileInlineTaskList = { display: "flex", flexDirection: "column", gap: "2px", marginTop: "4px", paddingLeft: "6px" };
const tileInlineTaskRow = { display: "flex", alignItems: "center", gap: "4px", width: "100%" };
const miniTaskDot = { width: "4px", height: "4px", borderRadius: "50%", flexShrink: 0 };
const tileTaskText = { fontSize: "9px", color: "#4b5563", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left" };