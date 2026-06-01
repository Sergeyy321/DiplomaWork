import React, { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import CalendarFilters from "./CalendarFilters";
import AdvancedCalendarTile from "./AdvancedCalendarTile";
import { Calendar as ClockIcon } from "lucide-react";

export default function CalendarDashboard({
  date,
  setDate,
  allEvents,
  setEvents,
  handleDateClick, // 🌟 Hooked up the root note creation form trigger
  setSelectedEvent,
  setIsPreviewOpen,
}) {
  const [filterQuery, setFilterQuery] = useState("");
  const [activeColorFilter, setActiveColorFilter] = useState(null);

  const displayedEvents = allEvents.filter((event) => {
  const eventTitle = event.title || "";
  const eventContent = event.content || "";

  const matchesQuery =
    eventTitle.toLowerCase().includes(filterQuery.toLowerCase()) ||
    eventContent.toLowerCase().includes(filterQuery.toLowerCase());
    
  const matchesColor = activeColorFilter ? event.color === activeColorFilter : true;
  return matchesQuery && matchesColor;
  });

  // 🌟 CLICKING A TILE NOW OPENS THE RICH COMPOSE FORM DIRECTLY
  const handleCalendarDayClick = (clickedDate) => {
    setDate(clickedDate);
    handleDateClick(clickedDate); // Triggers isOpen = true with full parameters form
  };

  const handleDropOnDate = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const eventId = parseInt(e.dataTransfer.getData("text/plain"), 10);
    const targetTile = e.target.closest("[data-date]");
    
    if (targetTile && eventId) {
      const targetDateStr = targetTile.getAttribute("data-date");
      setEvents((prevEvents) =>
        prevEvents.map((evt) => (evt.id === eventId ? { ...evt, date: targetDateStr } : evt))
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
        events={allEvents}
      />

      <div className="dash-grid" style={gridContainer}>
        <div 
          style={calendarCardExtended} 
          className="premium-calendar-wrapper"
          onDrop={handleDropOnDate}
          onDragOver={(e) => e.preventDefault()}
        >
          <Calendar
            onChange={setDate}
            value={date}
            onClickDay={handleCalendarDayClick} // Handled directly via compose parameters modal
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
                />
              );
            }}
          />
        </div>

        {/* Sidebar Management Console */}
        <div style={sidebarInsights}>
          <div style={insightsHeader}>
            <ClockIcon size={20} color="#4f46e5" />
            <div>
              <div style={insightsDateTitle}>
                {date.toLocaleDateString("en-US", { day: "numeric", month: "long" })}
              </div>
              <div style={insightsCountSub}>Active Containers: {sideInsightsEvents.length}</div>
            </div>
          </div>

          <div style={insightsContentList}>
            {sideInsightsEvents.length === 0 ? (
              <div style={emptyPlaceholder}>
                <p>Click this date block on the calendar grid to create a custom note sheet parameters layout.</p>
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
                    <div style={insightRowTitleContainer}>

                      <div style={insightRowTitle}>{event.title}</div>
                    </div>
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
const gridContainer = { display: "grid", gridTemplateColumns: "1fr 340px", gap: "24px", alignItems: "start" };
const calendarCardExtended = { background: "#ffffff", padding: "24px", borderRadius: "24px", border: "1px solid #e5e7eb", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" };
const sidebarInsights = { background: "#ffffff", borderRadius: "24px", border: "1px solid #e5e7eb", padding: "24px", display: "flex", flexDirection: "column", gap: "16px", maxHeight: "600px", overflowY: "auto" };
const insightsHeader = { display: "flex", alignItems: "center", gap: "12px", borderBottom: "1px solid #f3f4f6", paddingBottom: "12px" };
const insightsDateTitle = { fontSize: "16px", fontWeight: "700", color: "#111827" };
const insightsCountSub = { fontSize: "12px", color: "#6b7280" };
const insightsContentList = { display: "flex", flexDirection: "column", gap: "12px" };
const emptyPlaceholder = { display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", color: "#9ca3af", textAlign: "center", padding: "40px 10px", fontSize: "13px" };
const insightRowCard = { display: "flex", background: "#f9fafb", borderRadius: "14px", border: "1px solid #e5e7eb", overflow: "hidden", cursor: "pointer", transition: "transform 0.15s ease" };
const insightRowColorBar = { width: "5px" };
const insightRowBody = { padding: "12px", flex: 1, display: "flex", flexDirection: "column", gap: "10px" };
const insightRowTitleContainer = { display: "flex", alignItems: "center", gap: "8px" };
const insightRowTime = { fontSize: "11px", fontWeight: "700", color: "#4f46e5", background: "#eeebff", padding: "2px 6px", borderRadius: "6px" };
const insightRowTitle = { fontSize: "13px", fontWeight: "700", color: "#111827", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", flex: 1 };