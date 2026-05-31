import React, { useState } from "react";
import Calendar from "react-calendar";
import CalendarFilters from "./CalendarFilters";
import AdvancedCalendarTile from "./AdvancedCalendarTile";

export default function CalendarDashboard({
  date,
  setDate,
  filteredEvents,
  setEvents,
  handleDateClick,
  setSelectedEvent,
  setIsPreviewOpen,
  deleteNotification,
}) {
  const [filterQuery, setFilterQuery] = useState("");
  const [activeColorFilter, setActiveColorFilter] = useState(null);

  // Filter notes by query string & tag color
  const displayedEvents = filteredEvents.filter((event) => {
    const matchesQuery =
      event.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
      (event.content && event.content.toLowerCase().includes(filterQuery.toLowerCase()));
    const matchesColor = activeColorFilter ? event.color === activeColorFilter : true;
    return matchesQuery && matchesColor;
  });

  // 🛠️ THE FIX: Robust Drop Handler
  const handleDropOnDate = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const eventId = parseInt(e.dataTransfer.getData("text/plain"), 10);
    
    // Find the closest tile element containing our custom data-date attribute
    const targetTile = e.target.closest("[data-date]");
    
    if (targetTile && eventId) {
      const targetDateStr = targetTile.getAttribute("data-date");
      
      // Update global application events array state
      setEvents((prevEvents) =>
        prevEvents.map((evt) =>
          evt.id === eventId ? { ...evt, date: targetDateStr } : evt
        )
      );
    }
  };

  const selectedDateStr = date.toISOString().split("T")[0];
  const sideInsightsEvents = displayedEvents.filter((e) => e.date === selectedDateStr);

  return (
    <div style={dashboardWrapper}>
      <CalendarFilters
        filterQuery={filterQuery}
        setFilterQuery={setFilterQuery}
        activeColorFilter={activeColorFilter}
        setActiveColorFilter={setActiveColorFilter}
        events={filteredEvents}
      />

      <div style={gridContainer}>
        {/* We attach the drop zones directly over the calendar container tree wrapper */}
        <div 
          style={calendarCardExtended} 
          className="premium-calendar-wrapper"
          onDrop={handleDropOnDate}
          onDragOver={(e) => {
            e.preventDefault(); // CRITICAL: Allows dropping items inside button boundaries
            e.dataTransfer.dropEffect = "move";
          }}
        >
          <Calendar
            onChange={setDate}
            value={date}
            onClickDay={handleDateClick}
            locale="en-US"
            tileClassName={({ date: tileDate }) => {
              const dStr = tileDate.toISOString().split("T")[0];
              const count = displayedEvents.filter((e) => e.date === dStr).length;
              return count > 0 ? `has-events density-${Math.min(count, 3)}` : "";
            }}
            tileContent={({ date: tileDate }) => {
              const dStr = tileDate.toISOString().split("T")[0];
              const dayEvents = displayedEvents.filter((e) => e.date === dStr);
              return (
                <AdvancedCalendarTile
                  tileDate={tileDate}
                  dayEvents={dayEvents}
                  setSelectedEvent={setSelectedEvent}
                  setIsPreviewOpen={setIsPreviewOpen}
                  deleteNotification={deleteNotification}
                />
              );
            }}
          />
        </div>

        {/* Sidebar View */}
        <div style={sidebarInsights}>
          <div style={insightsHeader}>
            <span style={{ fontSize: "20px" }}>📅</span>
            <div>
              <div style={insightsDateTitle}>
                {date.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}
              </div>
              <div style={insightsCountSub}>Active Nodes: {sideInsightsEvents.length}</div>
            </div>
          </div>

          <div style={insightsContentList}>
            {sideInsightsEvents.length === 0 ? (
              <div style={emptyPlaceholder}>
                <p>No logged components mapped for this timeline view.</p>
              </div>
            ) : (
              sideInsightsEvents.map((event) => (
                <div 
                  key={event.id} 
                  style={insightRowCard} 
                  onClick={() => { setSelectedEvent(event); setIsPreviewOpen(true); }}
                >
                  <div style={{ ...insightRowColorBar, background: event.color }} />
                  <div style={insightRowBody}>
                    <div style={insightRowMeta}>
                      <span style={insightRowTime}>⏰ {event.time}</span>
                      {event.reminder && <span style={reminderBadge}>Signal Active</span>}
                    </div>
                    <div style={insightRowTitle}>{event.title}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const dashboardWrapper = { display: "flex", flexDirection: "column", gap: "20px", width: "100%" };
const gridContainer = { display: "grid", gridTemplateColumns: "1fr 320px", gap: "24px", alignItems: "start" };
const calendarCardExtended = { background: "#ffffff", padding: "24px", borderRadius: "24px", border: "1px solid #e5e7eb", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" };
const sidebarInsights = { background: "#ffffff", borderRadius: "24px", border: "1px solid #e5e7eb", padding: "24px", display: "flex", flexDirection: "column", gap: "16px", maxHeight: "560px", overflowY: "auto" };
const insightsHeader = { display: "flex", alignItems: "center", gap: "12px", borderBottom: "1px solid #f3f4f6", paddingBottom: "12px" };
const insightsDateTitle = { fontSize: "16px", fontWeight: "700", color: "#111827" };
const insightsCountSub = { fontSize: "12px", color: "#6b7280" };
const insightsContentList = { display: "flex", flexDirection: "column", gap: "10px" };
const emptyPlaceholder = { display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", color: "#9ca3af", textAlign: "center", padding: "40px 10px", fontSize: "13px" };
const insightRowCard = { display: "flex", background: "#f9fafb", borderRadius: "12px", border: "1px solid #e5e7eb", overflow: "hidden", cursor: "pointer" };
const insightRowColorBar = { width: "4px" };
const insightRowBody = { padding: "10px", flex: 1, display: "flex", flexDirection: "column", gap: "4px" };
const insightRowMeta = { display: "flex", justifyContent: "space-between", alignItems: "center" };
const insightRowTime = { fontSize: "11px", fontWeight: "600", color: "#4f46e5" };
const reminderBadge = { fontSize: "9px", background: "#fef3c7", color: "#d97706", padding: "1px 4px", borderRadius: "4px", fontWeight: "600" };
const insightRowTitle = { fontSize: "13px", fontWeight: "700", color: "#111827", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" };