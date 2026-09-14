import React, { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import CalendarFilters from "./CalendarFilters";
import AdvancedCalendarTile from "./AdvancedCalendarTile";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Bell, 
  Grid3X3, 
  Columns3, 
  Square,
  Network,
  CheckCircle2,
  CircleDot,
  Circle,
  PanelRight,
  Film,
  Image as ImageIcon,
  FileText,
  Paperclip,
  Pencil
} from "lucide-react";
import { 
  formatLocalDate, 
  getTodayLocalDate, 
  isSameDay, 
  getWeekDays 
} from "../../utils/dateUtils";
import "./CalendarDashboard.css";

function stripHtml(html = "") {
  return String(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STATUS_CONFIG = {
  todo: { label: "To Do", icon: Circle, color: "#787774", next: "in-progress" },
  "in-progress": { label: "In Progress", icon: CircleDot, color: "#d97706", next: "done" },
  done: { label: "Completed", icon: CheckCircle2, color: "#10b981", next: "todo" },
};

export default function CalendarDashboard({
  date,
  setDate,
  allEvents,
  setEvents,
  handleDateClick,
  setSelectedEvent,
  setIsPreviewOpen,
  onUpdateNoteStatus,
  onJumpToMindMap,
}) {
  const [viewMode, setViewMode] = useState("month"); // "month" | "week" | "day"
  const [filterQuery, setFilterQuery] = useState("");
  const [activeColorFilter, setActiveColorFilter] = useState(null);
  const [isSideAgendaOpen, setIsSideAgendaOpen] = useState(true);

  const displayedEvents = allEvents.filter((event) => {
    const eventTitle = event.title || "";
    const eventContent = event.content || "";

    const matchesQuery =
      eventTitle.toLowerCase().includes(filterQuery.toLowerCase()) ||
      eventContent.toLowerCase().includes(filterQuery.toLowerCase());
      
    const matchesColor = activeColorFilter ? event.color === activeColorFilter : true;
    return matchesQuery && matchesColor;
  });

  const handleCalendarDayClick = (clickedDate) => {
    setDate(clickedDate);
    handleDateClick(clickedDate);
  };

  const handleCycleStatus = (e, event) => {
    e.stopPropagation();
    const current = event.status || "todo";
    const next = STATUS_CONFIG[current]?.next || "todo";
    if (onUpdateNoteStatus) {
      onUpdateNoteStatus(event.id, next);
    }
  };

  const handleDropOnDate = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const eventId = e.dataTransfer.getData("text/plain");
    const targetTile = e.target.closest("[data-date]");
    
    if (targetTile && eventId) {
      const targetDateStr = targetTile.getAttribute("data-date");
      setEvents((prevEvents) =>
        prevEvents.map((evt) => (String(evt.id) === String(eventId) ? { ...evt, date: targetDateStr } : evt))
      );
    }
  };

  const handleWeekChange = (deltaDays) => {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + deltaDays);
    setDate(nextDate);
  };

  const handleDayChange = (deltaDays) => {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + deltaDays);
    setDate(nextDate);
  };

  const selectedDateStr = formatLocalDate(date);
  const todayStr = getTodayLocalDate();
  const sideInsightsEvents = displayedEvents.filter((e) => e.date === selectedDateStr);
  const weekDays = getWeekDays(date);

  return (
    <div className="notion-cal-container">
      {/* TOPBAR: Filters & View Switcher (Month | Week | Day) */}
      <div className="notion-cal-topbar">
        <CalendarFilters
          filterQuery={filterQuery}
          setFilterQuery={setFilterQuery}
          activeColorFilter={activeColorFilter}
          setActiveColorFilter={setActiveColorFilter}
          events={allEvents}
        />

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {viewMode === "month" && (
            <button
              type="button"
              className={`notion-cal-view-btn ${isSideAgendaOpen ? "is-active" : ""}`}
              onClick={() => setIsSideAgendaOpen((prev) => !prev)}
              title={isSideAgendaOpen ? "Hide daily tasks agenda" : "Show daily tasks agenda"}
            >
              <PanelRight size={13} /> {isSideAgendaOpen ? "Hide Agenda" : "Show Agenda"}
            </button>
          )}

          <div className="notion-cal-view-selector">
            <button
              type="button"
              className={`notion-cal-view-btn ${viewMode === "month" ? "is-active" : ""}`}
              onClick={() => setViewMode("month")}
            >
              <Grid3X3 size={13} /> Month
            </button>
            <button
              type="button"
              className={`notion-cal-view-btn ${viewMode === "week" ? "is-active" : ""}`}
              onClick={() => setViewMode("week")}
            >
              <Columns3 size={13} /> Week
            </button>
            <button
              type="button"
              className={`notion-cal-view-btn ${viewMode === "day" ? "is-active" : ""}`}
              onClick={() => setViewMode("day")}
            >
              <Square size={13} /> Day
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CALENDAR VIEWS AREA */}
      <div className="notion-cal-main-area">
        {/* =========================================================
            VIEW 1: MONTH VIEW (Full Calendar Grid + Daily Agenda)
            ========================================================= */}
        {viewMode === "month" && (
          <div className={`notion-month-split ${isSideAgendaOpen ? "" : "is-agenda-hidden"}`}>
            <div 
              style={calendarCardExtended} 
              className="notion-calendar-wrapper"
              onDrop={handleDropOnDate}
              onDragOver={(e) => e.preventDefault()}
            >
              <Calendar
                onChange={setDate}
                value={date}
                onClickDay={handleCalendarDayClick}
                locale="en-US"
                tileClassName={({ date: tileDate }) => {
                  const dStr = formatLocalDate(tileDate);
                  const count = displayedEvents.filter((e) => e.date === dStr).length;
                  return count > 0 ? `has-events density-${Math.min(count, 3)}` : "";
                }}
                tileContent={({ date: tileDate }) => {
                  const dStr = formatLocalDate(tileDate);
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

            {/* Sidebar Daily Agenda Console */}
            {isSideAgendaOpen && (
              <div style={sidebarInsights}>
              <div style={insightsHeader}>
                <Clock size={16} color="#787774" />
                <div>
                  <div style={insightsDateTitle}>
                    {date.toLocaleDateString("en-US", { day: "numeric", month: "long" })}
                  </div>
                  <div style={insightsCountSub}>
                    {sideInsightsEvents.length} note{sideInsightsEvents.length === 1 ? "" : "s"} scheduled
                  </div>
                </div>
              </div>

              <div style={insightsContentList}>
                {sideInsightsEvents.length === 0 ? (
                  <div style={emptyPlaceholder}>
                    <p>No notes for this date. Click any date block to add a new note.</p>
                  </div>
                ) : (
                  sideInsightsEvents.map((event) => {
                    const isDone = event.status === "done";
                    const statusKey = event.status || "todo";
                    const statusObj = STATUS_CONFIG[statusKey] || STATUS_CONFIG.todo;
                    const StatusIcon = statusObj.icon;

                    return (
                      <div 
                        key={event.id} 
                        style={{ ...insightRowCard, opacity: isDone ? 0.75 : 1 }}
                        onClick={() => { setSelectedEvent(event); setIsPreviewOpen(true); }}
                      >
                        <div style={{ ...insightRowColorBar, background: event.color || "#37352f" }} />
                        <div style={insightRowBody}>
                          <div style={insightRowTitleContainer}>
                            <button
                              type="button"
                              onClick={(e) => handleCycleStatus(e, event)}
                              style={statusIconBtn}
                              title={`Status: ${statusObj.label}. Click to toggle.`}
                            >
                              <StatusIcon size={12} color={statusObj.color} />
                            </button>
                            {event.time && (
                              <span style={insightRowTime}>
                                <Clock size={10} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                                {event.time}
                              </span>
                            )}
                            <div style={{ ...insightRowTitle, textDecoration: isDone ? "line-through" : "none", color: isDone ? "#9b9a97" : "#37352f" }}>
                              {event.title}
                            </div>
                            {((event.attachments && event.attachments.length > 0) || (event.mediaLinks && event.mediaLinks.length > 0) || event.drawingDataUrl) && (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "2px", fontSize: "10px", color: "#6b7280", background: "rgba(0,0,0,0.05)", padding: "1px 5px", borderRadius: "4px" }}>
                                {event.attachments?.some((a) => a.type === "image") && <ImageIcon size={9} color="#059669" />}
                                {((event.mediaLinks && event.mediaLinks.length > 0) || event.attachments?.some((a) => a.type === "video")) && <Film size={9} color="#dc2626" />}
                                {event.attachments?.some((a) => a.type === "pdf") && <FileText size={9} color="#b91c1c" />}
                                {event.drawingDataUrl && <Pencil size={9} color="#7c3aed" />}
                                {event.attachments?.some((a) => !["image", "pdf", "audio", "video"].includes(a.type)) && <Paperclip size={9} color="#2563eb" />}
                              </span>
                            )}
                            {onJumpToMindMap && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onJumpToMindMap(event.id);
                                }}
                                style={mindMapJumpBtn}
                                title="Locate this note on Mind Map"
                              >
                                <Network size={11} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            )}
          </div>
        )}

        {/* =========================================================
            VIEW 2: WEEK VIEW (7 Day Columns)
            ========================================================= */}
        {viewMode === "week" && (
          <div className="notion-week-view">
            <div className="notion-week-header">
              <span className="notion-week-header-title">
                <CalendarIcon size={16} /> Week of {weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  className="notion-week-nav-btn"
                  onClick={() => handleWeekChange(-7)}
                  title="Previous Week"
                >
                  <ChevronLeft size={13} />
                </button>
                <button
                  type="button"
                  className="notion-week-today-btn"
                  onClick={() => setDate(new Date())}
                >
                  Current Week
                </button>
                <button
                  type="button"
                  className="notion-week-nav-btn"
                  onClick={() => handleWeekChange(7)}
                  title="Next Week"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>

            <div className="notion-week-columns">
              {weekDays.map((dayDate) => {
                const dStr = formatLocalDate(dayDate);
                const isSelected = isSameDay(dayDate, date);
                const isToday = dStr === todayStr;
                const dayEvents = displayedEvents.filter((e) => e.date === dStr);
                const dayName = dayDate.toLocaleDateString("en-US", { weekday: "short" });

                return (
                  <div
                    key={dStr}
                    className={`notion-week-col ${isSelected ? "is-selected" : ""} ${isToday ? "is-today" : ""}`}
                  >
                    <div
                      className="notion-week-col-head"
                      onClick={() => setDate(dayDate)}
                    >
                      <span className="notion-week-col-dayname">{dayName}</span>
                      <span className="notion-week-col-daynum">{dayDate.getDate()}</span>
                    </div>

                    <div className="notion-week-cards-list">
                      {dayEvents.map((event) => {
                        const isDone = event.status === "done";
                        const statusKey = event.status || "todo";
                        const statusObj = STATUS_CONFIG[statusKey] || STATUS_CONFIG.todo;
                        const StatusIcon = statusObj.icon;

                        return (
                          <div
                            key={event.id}
                            className={`notion-week-card ${isDone ? "is-done" : ""}`}
                            style={{ borderLeft: `3px solid ${event.color || "#37352f"}` }}
                            onClick={() => {
                              setSelectedEvent(event);
                              setIsPreviewOpen(true);
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "4px" }}>
                              <h5 className={`notion-week-card-title ${isDone ? "is-done-text" : ""}`}>{event.title || "Untitled"}</h5>
                              <button
                                type="button"
                                onClick={(e) => handleCycleStatus(e, event)}
                                style={statusIconBtn}
                                title={`Status: ${statusObj.label}`}
                              >
                                <StatusIcon size={11} color={statusObj.color} />
                              </button>
                            </div>
                            <div className="notion-week-card-time">
                              {event.time && (
                                <span>
                                  <Clock size={10} style={{ display: "inline", verticalAlign: "middle" }} /> {event.time}
                                </span>
                              )}
                              {((event.attachments && event.attachments.length > 0) || (event.mediaLinks && event.mediaLinks.length > 0) || event.drawingDataUrl) && (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: "2px", fontSize: "9px", color: "#6b7280" }}>
                                  {event.attachments?.some((a) => a.type === "image") && <ImageIcon size={9} color="#059669" />}
                                  {((event.mediaLinks && event.mediaLinks.length > 0) || event.attachments?.some((a) => a.type === "video")) && <Film size={9} color="#dc2626" />}
                                  {event.attachments?.some((a) => a.type === "pdf") && <FileText size={9} color="#b91c1c" />}
                                  {event.drawingDataUrl && <Pencil size={9} color="#7c3aed" />}
                                </span>
                              )}
                              {event.reminder && <Bell size={10} color="#eb5757" style={{ marginLeft: "auto" }} />}
                              {onJumpToMindMap && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onJumpToMindMap(event.id);
                                  }}
                                  style={{ ...mindMapJumpBtn, marginLeft: event.reminder ? "4px" : "auto" }}
                                  title="Locate on Mind Map"
                                >
                                  <Network size={10} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      className="notion-week-add-btn"
                      onClick={() => handleCalendarDayClick(dayDate)}
                    >
                      <Plus size={11} /> Add
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================================
            VIEW 3: DAY VIEW (Focused Single Day Agenda & Notes)
            ========================================================= */}
        {viewMode === "day" && (
          <div className="notion-day-view">
            <div className="notion-day-header">
              <div>
                <h3 className="notion-day-title">
                  {date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </h3>
                <div style={insightsCountSub}>
                  {sideInsightsEvents.length} note{sideInsightsEvents.length === 1 ? "" : "s"} scheduled
                </div>
              </div>

              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <button
                  type="button"
                  className="notion-week-nav-btn"
                  onClick={() => handleDayChange(-1)}
                  title="Previous Day"
                >
                  <ChevronLeft size={13} />
                </button>
                <button
                  type="button"
                  className="notion-week-today-btn"
                  onClick={() => setDate(new Date())}
                >
                  Today
                </button>
                <button
                  type="button"
                  className="notion-week-nav-btn"
                  onClick={() => handleDayChange(1)}
                  title="Next Day"
                >
                  <ChevronRight size={13} />
                </button>

                <button
                  type="button"
                  className="notion-day-add-btn"
                  onClick={() => handleCalendarDayClick(date)}
                >
                  <Plus size={12} /> New Note
                </button>
              </div>
            </div>

            <div className="notion-day-list">
              {sideInsightsEvents.length === 0 ? (
                <div className="notion-day-empty">
                  <p>No notes scheduled for this day.</p>
                  <button
                    type="button"
                    className="notion-day-add-btn"
                    onClick={() => handleCalendarDayClick(date)}
                  >
                    <Plus size={12} /> Create Note for this Day
                  </button>
                </div>
              ) : (
                sideInsightsEvents.map((event) => {
                  const snippet = stripHtml(event.content);
                  const isDone = event.status === "done";
                  const statusKey = event.status || "todo";
                  const statusObj = STATUS_CONFIG[statusKey] || STATUS_CONFIG.todo;
                  const StatusIcon = statusObj.icon;

                  return (
                    <div
                      key={event.id}
                      className={`notion-day-card ${isDone ? "is-done" : ""}`}
                      style={{ borderLeftColor: event.color || "#37352f" }}
                      onClick={() => {
                        setSelectedEvent(event);
                        setIsPreviewOpen(true);
                      }}
                    >
                      <div className="notion-day-card-header">
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1 }}>
                          <button
                            type="button"
                            onClick={(e) => handleCycleStatus(e, event)}
                            style={statusIconBtn}
                            title={`Status: ${statusObj.label}. Click to cycle.`}
                          >
                            <StatusIcon size={13} color={statusObj.color} />
                          </button>
                          <h4 className={`notion-day-card-title ${isDone ? "is-done-text" : ""}`}>{event.title || "Untitled"}</h4>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#787774" }}>
                          {event.time && (
                            <span>
                              <Clock size={11} style={{ display: "inline", verticalAlign: "middle" }} /> {event.time}
                            </span>
                          )}
                          {event.reminder && <Bell size={12} color="#eb5757" />}
                          {onJumpToMindMap && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onJumpToMindMap(event.id);
                              }}
                              style={mindMapJumpBtn}
                              title="Locate on Mind Map"
                            >
                              <Network size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      {snippet && (
                        <p className="notion-day-card-content">{snippet}</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const calendarCardExtended = { background: "var(--notion-card, #ffffff)", padding: "16px 20px", borderRadius: "10px", border: "1px solid var(--notion-border, #edece9)", boxShadow: "none" };
const sidebarInsights = { background: "var(--notion-card, #ffffff)", borderRadius: "10px", border: "1px solid var(--notion-border, #edece9)", padding: "16px", display: "flex", flexDirection: "column", gap: "14px", maxHeight: "560px", overflowY: "auto" };
const insightsHeader = { display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid var(--notion-border, #edece9)", paddingBottom: "10px" };
const insightsDateTitle = { fontSize: "14px", fontWeight: "600", color: "var(--notion-text, #37352f)" };
const insightsCountSub = { fontSize: "12px", color: "var(--notion-secondary, #787774)", marginTop: "1px" };
const insightsContentList = { display: "flex", flexDirection: "column", gap: "8px" };
const emptyPlaceholder = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "8px",
  color: "var(--notion-placeholder, #9b9a97)",
  textAlign: "center",
  padding: "30px 10px",
  fontSize: "12px",
  lineHeight: "1.4",
};
const insightRowCard = { display: "flex", background: "var(--notion-plate, var(--notion-sidebar, #fcfcfb))", borderRadius: "6px", border: "1px solid var(--notion-border, #edece9)", overflow: "hidden", cursor: "pointer", transition: "background 0.12s ease" };
const insightRowColorBar = { width: "3px" };
const insightRowBody = { padding: "8px 10px", flex: 1, display: "flex", flexDirection: "column", gap: "4px" };
const insightRowTitleContainer = { display: "flex", alignItems: "center", gap: "6px" };
const insightRowTime = {
  fontSize: "11px",
  fontWeight: "500",
  color: "var(--notion-text, #37352f)",
  background: "var(--notion-hover, #f1f1ef)",
  padding: "2px 5px",
  borderRadius: "4px",
  display: "inline-flex",
  alignItems: "center",
};
const insightRowTitle = { fontSize: "13px", fontWeight: "500", color: "var(--notion-text, #37352f)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", flex: 1 };

const statusIconBtn = {
  background: "none",
  border: "none",
  padding: "0 2px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  borderRadius: "3px",
};

const mindMapJumpBtn = {
  background: "transparent",
  border: "1px solid var(--notion-border, #edece9)",
  color: "var(--notion-secondary, #787774)",
  borderRadius: "4px",
  padding: "2px 4px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  transition: "background 0.12s, color 0.12s",
};