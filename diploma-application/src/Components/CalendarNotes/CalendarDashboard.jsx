import React, { useState } from "react";
import Calendar from "react-calendar";
import CalendarFilters from "./CalendarFilters";
import AdvancedCalendarTile from "./AdvancedCalendarTile";
import { ListTodo, Trash2, Plus, Calendar as ClockIcon } from "lucide-react";

export default function CalendarDashboard({
  date,
  setDate,
  allEvents,
  setEvents,
  setSelectedEvent,
  setIsPreviewOpen,
}) {
  const [filterQuery, setFilterQuery] = useState("");
  const [activeColorFilter, setActiveColorFilter] = useState(null);
  const [newTaskText, setNewTaskText] = useState("");
  const [activeInlineTarget, setActiveInlineTarget] = useState(null);

  const displayedEvents = allEvents.filter((event) => {
    const matchesQuery =
      event.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
      (event.content && event.content.toLowerCase().includes(filterQuery.toLowerCase()));
    const matchesColor = activeColorFilter ? event.color === activeColorFilter : true;
    return matchesQuery && matchesColor;
  });

  // ⚡ CLICK DAY -> SPANWS NEW INLINE TASK AUTOMATICALLY INTO THE DUAL-VIEW CHECKLIST
  const handleCalendarDayClick = (clickedDate) => {
    setDate(clickedDate);
    const dateStr = clickedDate.toISOString().split("T")[0];

    let targetEvent = allEvents.find((e) => e.date === dateStr);

    if (targetEvent) {
      setActiveInlineTarget(targetEvent.id);
      triggerSidebarTaskPlaceholder(targetEvent.id);
    } else {
      const newShellId = Date.now();
      const newEventShell = {
        id: newShellId,
        folderId: "work",
        title: `Daily Plan`, // Main title remains clean and uniform
        content: "",
        time: "09:00",
        date: dateStr,
        color: "#4f46e5",
        fontStyle: "sans-serif",
        isBold: false,
        isItalic: false,
        align: "left",
        reminder: false,
        tasks: [], 
        x: 0,
        y: 0,
      };

      setEvents((prev) => [...prev, newEventShell]);
      setActiveInlineTarget(newShellId);
      
      setTimeout(() => triggerSidebarTaskPlaceholder(newShellId), 50);
    }
  };

  const triggerSidebarTaskPlaceholder = (eventId) => {
    setEvents((prevEvents) =>
      prevEvents.map((evt) => {
        if (evt.id === eventId) {
          const currentTasks = evt.tasks ? [...evt.tasks] : [];
          return {
            ...evt,
            tasks: [...currentTasks, { id: Date.now(), text: "New Task Item", completed: false, isEditingInline: true }]
          };
        }
        return evt;
      })
    );
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

  const addManualSidebarTask = (eventId) => {
    if (!newTaskText.trim()) return;
    setEvents((prevEvents) =>
      prevEvents.map((evt) => {
        if (evt.id === eventId) {
          const updatedTasks = evt.tasks ? [...evt.tasks] : [];
          return {
            ...evt,
            tasks: [...updatedTasks, { id: Date.now(), text: newTaskText.trim(), completed: false }]
          };
        }
        return evt;
      })
    );
    setNewTaskText("");
  };

  const updateInlineTaskText = (eventId, taskId, newText) => {
    setEvents((prevEvents) =>
      prevEvents.map((evt) => {
        if (evt.id === eventId && evt.tasks) {
          return {
            ...evt,
            tasks: evt.tasks.map((t) => t.id === taskId ? { ...t, text: newText } : t)
          };
        }
        return evt;
      })
    );
  };

  const saveInlineTaskText = (eventId, taskId) => {
    setEvents((prevEvents) =>
      prevEvents.map((evt) => {
        if (evt.id === eventId && evt.tasks) {
          return {
            ...evt,
            tasks: evt.tasks.map((t) => t.id === taskId ? { ...t, isEditingInline: false } : t)
          };
        }
        return evt;
      })
    );
  };

  const toggleTaskCompletion = (eventId, taskId) => {
    setEvents((prevEvents) =>
      prevEvents.map((evt) => {
        if (evt.id === eventId && evt.tasks) {
          return {
            ...evt,
            tasks: evt.tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
          };
        }
        return evt;
      })
    );
  };

//   const deleteSubTask = (eventId, taskId) => {
//     setEvents((prevEvents) =>
//       prevEvents.map((evt) => {
//         if (evt.id === eventId && evt.tasks) {
//           return { ...evt, tasks: evt.tasks.filter((t) => t.id !== taskId) };
//         }
//         return evt;
//       })
//     );
//   };

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

      <div style={gridContainer}>
        <div 
          style={calendarCardExtended} 
          className="premium-calendar-wrapper"
          onDrop={handleDropOnDate}
          onDragOver={(e) => e.preventDefault()}
        >
          <Calendar
            onChange={setDate}
            value={date}
            onClickDay={handleCalendarDayClick}
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
                <p>Click any date block on the calendar grid to initialize tasks.</p>
              </div>
            ) : (
              sideInsightsEvents.map((event) => {
                const isFocused = activeInlineTarget === event.id || sideInsightsEvents.length === 1;
                
                return (
                  <div key={event.id} style={insightRowCard}>
                    <div style={{ ...insightRowColorBar, background: event.color }} />
                    <div style={insightRowBody}>
                      <div 
                        style={insightRowTitleContainer}
                        onClick={() => { setSelectedEvent(event); setIsPreviewOpen(true); }}
                      >
                        <span style={insightRowTime}>{event.time}</span>
                        <div style={insightRowTitle}>{event.title}</div>
                      </div>

                   

                    </div>
                  </div>
                );
              })
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
const insightRowCard = { display: "flex", background: "#f9fafb", borderRadius: "14px", border: "1px solid #e5e7eb", overflow: "hidden" };
const insightRowColorBar = { width: "5px" };
const insightRowBody = { padding: "12px", flex: 1, display: "flex", flexDirection: "column", gap: "10px" };
const insightRowTitleContainer = { display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" };
const insightRowTime = { fontSize: "11px", fontWeight: "700", color: "#4f46e5", background: "#eeebff", padding: "2px 6px", borderRadius: "6px" };
const insightRowTitle = { fontSize: "13px", fontWeight: "700", color: "#111827", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", flex: 1 };
const subTaskSection = { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "10px", display: "flex", flexDirection: "column", gap: "6px", transition: "border-color 0.2s" };
const subTaskHeader = { fontSize: "10px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "4px" };
const subTaskList = { display: "flex", flexDirection: "column", gap: "4px" };
const subTaskItem = { display: "flex", alignItems: "center", background: "#f9fafb", padding: "4px 8px", borderRadius: "6px", gap: "6px" };
const taskCheckbox = { width: "13px", height: "13px", cursor: "pointer" };
const taskText = { fontSize: "12px", color: "#374151", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "text" };
const sidebarTaskInlineInput = { flex: 1, border: "none", background: "transparent", outline: "none", fontSize: "12px", color: "#111827", borderBottom: "1px solid #6366f1", padding: "2px 0" };
const taskDeleteBtn = { background: "none", border: "none", color: "#9ca3af", cursor: "pointer", padding: "2px", display: "flex", alignItems: "center" };
const taskInputWrapper = { display: "flex", gap: "4px", marginTop: "4px" };
const taskMiniInput = { flex: 1, borderRadius: "6px", padding: "4px 8px", fontSize: "12px", outline: "none", background: "#f9fafb", border: "1px solid #d1d5db" };
const taskAddButton = { background: "#4f46e5", color: "white", border: "none", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", display: "flex", alignItems: "center" };