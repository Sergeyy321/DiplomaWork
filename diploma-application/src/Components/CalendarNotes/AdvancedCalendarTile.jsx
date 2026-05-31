import React from "react";

export default function AdvancedCalendarTile({ 
  tileDate, 
  dayEvents, 
  setSelectedEvent, 
  setIsPreviewOpen, 
  deleteNotification
}) {
  const dateStr = tileDate.toISOString().split("T")[0];

  const handleDragStart = (e, eventId) => {
    e.stopPropagation();
    e.dataTransfer.setData("text/plain", eventId);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div 
      style={tileWrapper} 
      data-date={dateStr}
      onDragOver={(e) => e.preventDefault()} // Let individual tiles capture item tracking directly
    >
      <div style={tileNotesScrollArea}>
        {dayEvents.map((event) => (
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
              ...modernInlineBadge,
              background: `${event.color}12`,
              borderLeft: `4px solid ${event.color}`,
            }}
            title="Drag node to reschedule"
          >
            {/* pointerEvents: 'none' stops child layouts from blocking HTML5 transfers */}
            <span style={{ ...badgeTime, pointerEvents: "none" }}>{event.time}</span>
            <span style={{ ...badgeText, pointerEvents: "none" }}>{event.title}</span>
            <button
              style={miniQuickDeleteBtn}
              onClick={(e) => {
                e.stopPropagation();
                deleteNotification(event.id);
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {dayEvents.length > 0 && (
        <div style={modernMatrixIndicator}>
          {dayEvents.slice(0, 4).map((e) => (
            <span key={e.id} style={{ ...miniDot, background: e.color }} />
          ))}
          {dayEvents.length > 4 && <span style={plusMoreIndicator}>+{dayEvents.length - 4}</span>}
        </div>
      )}
    </div>
  );
}

const tileWrapper = { display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between", minHeight: "75px", padding: "2px", boxSizing: "border-box", position: "relative" };
const tileNotesScrollArea = { display: "flex", flexDirection: "column", gap: "4px", overflowY: "auto", maxHeight: "56px", paddingRight: "2px", width: "100%" };
const modernInlineBadge = { fontSize: "11px", borderRadius: "6px", padding: "3px 6px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "4px", cursor: "grab", position: "relative", overflow: "hidden" };
const badgeTime = { fontWeight: "700", opacity: 0.7, fontSize: "10px", whiteSpace: "nowrap" };
const badgeText = { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left" };
const miniQuickDeleteBtn = { background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "9px", padding: "2px", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 };
const modernMatrixIndicator = { display: "flex", gap: "3px", alignItems: "center", justifyContent: "flex-start", paddingTop: "2px", marginTop: "auto", pointerEvents: "none" };
const miniDot = { width: "5px", height: "5px", borderRadius: "50%" };
const plusMoreIndicator = { fontSize: "9px", color: "#9ca3af", fontWeight: "700" };