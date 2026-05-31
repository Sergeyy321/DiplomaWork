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
          <div
            key={event.id}
            draggable
            onDragStart={(e) => handleDragStart(e, event.id)}
            onClick={(e) => {
              e.stopPropagation(); // Opens your single unified component modal window securely
              setSelectedEvent(event);
              setIsPreviewOpen(true);
            }}
            style={{
              ...premiumLegacyBadge,
              borderLeft: `5px solid ${event.color}`, // Matches the high-density color accent bar exactly
            }}
            title="Drag note to reschedule"
          >
            <span style={{ 
              ...badgeText, 
              fontFamily: event.fontStyle || "sans-serif",
              fontWeight: event.isBold ? "700" : "600", // Dynamically supports bold weight state tags
              fontStyle: event.isItalic ? "italic" : "normal"
            }}>
              {event.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 🎨 ORIGINAL CORE PREMIUM DESIGN STYLES
// ==========================================
const tileWrapper = { display: "flex", flexDirection: "column", height: "100%", width: "100%", justifyContent: "flex-start", minHeight: "85px", padding: "4px", boxSizing: "border-box", position: "relative" };
const tileNotesScrollArea = { display: "flex", flexDirection: "column", gap: "5px", overflowY: "auto", maxHeight: "90px", width: "100%" };

// Rebuilt exactly from the original "Diploma Project Defense Planning" token metrics
const premiumLegacyBadge = {
  fontSize: "10px",
  borderRadius: "6px",
  padding: "2px 3px",
  display: "flex",
  alignItems: "center",
  background: "#ffffff", // Pure white card texture canvas background
  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)", // Premium soft spatial card shadows
  cursor: "grab",
  zIndex: 10,
  border: "1px solid #e5e7eb", // Framed card grid borders boundary
  transition: "all 0.15s ease",
  marginBottom: "2px",
  width: "100%",
  boxSizing: "border-box"
};

const badgeText = { 
  flex: 1, 
  overflow: "hidden", 
  textOverflow: "ellipsis", 
  whiteSpace: "nowrap", 
  textAlign: "left", 
  color: "#111827", // Distinct deep text coloring profile
  pointerEvents: "none" 
};