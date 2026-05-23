import React, { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

export default function CalendarNote() {
  const [date, setDate] = useState(new Date());
  const [events, setEvents] = useState([
    {
      id: 1,
      folderId: "work",
      title: "Diploma Project Defense",
      content: "Prepare presentation slides and review system architecture constraints.",
      time: "14:00",
      date: new Date().toISOString().split("T")[0],
      color: "#4f46e5",
      fontStyle: "sans-serif",
      isBold: true,
      isItalic: false,
      align: "left",
      reminder: false
    },
    {
      id: 2,
      folderId: "ideas",
      title: "AI Startup Brainstorm",
      content: "Build a minimalist space for rapid mental mapping and visual graph connections.",
      time: "18:30",
      date: new Date().toISOString().split("T")[0],
      color: "#10b981",
      fontStyle: "monospace",
      isBold: false,
      isItalic: true,
      align: "center",
      reminder: true
    }
  ]);

  const [isOpen, setIsOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null); // For full-screen preview
  
  const [activeTab, setActiveTab] = useState("calendar"); // "calendar" | "mindmap"
  const [activeFolder, setActiveFolder] = useState("work"); // "work" | "personal" | "ideas"
  
  const folders = [
    { id: "work", title: "Work Workspace", icon: "💼" },
    { id: "personal", title: "Personal Life", icon: "🏠" },
    { id: "ideas", title: "Mental Sandbox", icon: "💡" },
  ];

  // Extended form with rich layout controls
  const [form, setForm] = useState({
    title: "",
    content: "",
    time: "12:00",
    color: "#4f46e5",
    fontStyle: "sans-serif",
    isBold: false,
    isItalic: false,
    align: "left",
    reminder: false,
  });

  // Track if we are editing an existing item or building a new one
  const [editingId, setEditingId] = useState(null);

  const handleDateClick = (date) => {
    setSelectedDate(date);
    setEditingId(null);
    setForm({
      title: "",
      content: "",
      time: "12:00",
      color: "#4f46e5",
      fontStyle: "sans-serif",
      isBold: false,
      isItalic: false,
      align: "left",
      reminder: false,
    });
    setIsOpen(true);
  };

  const handleSubmit = () => {
    const targetDate = selectedDate || date;
    const dateString = targetDate.toISOString().split("T")[0];

    if (editingId) {
      setEvents(events.map(e => e.id === editingId ? { ...e, ...form } : e));
    } else {
      setEvents([
        ...events,
        {
          id: Date.now(),
          folderId: activeFolder,
          date: dateString,
          fullDate: targetDate,
          ...form,
        },
      ]);
    }

    setIsOpen(false);
    setEditingId(null);
  };

  const deleteNotification = (id) => {
    setEvents(events.filter((e) => e.id !== id));
    if (selectedEvent?.id === id) setIsPreviewOpen(false);
  };

  const editNotification = (event) => {
    setSelectedDate(new Date(event.date));
    setEditingId(event.id);
    setForm({
      title: event.title,
      content: event.content || "",
      time: event.time,
      color: event.color,
      fontStyle: event.fontStyle || "sans-serif",
      isBold: event.isBold || false,
      isItalic: event.isItalic || false,
      align: event.align || "left",
      reminder: event.reminder || false,
    });
    setIsOpen(true);
  };

  const openFullscreenPreview = (event) => {
    setSelectedEvent(event);
    setIsPreviewOpen(true);
  };

  const filteredEvents = events.filter((e) => e.folderId === activeFolder);
  const selectedDateStr = date.toISOString().split("T")[0];
  const dayEventsForMindMap = filteredEvents.filter((e) => e.date === selectedDateStr);

  return (
    <div style={workspaceContainer}>
      
      {/* SIDEBAR */}
      <div style={sidebarStyle}>
        <div>
          <h4 style={sidebarTitle}>Workspaces</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {folders.map((folder) => (
              <div
                key={folder.id}
                onClick={() => setActiveFolder(folder.id)}
                style={{
                  ...folderItem,
                  background: activeFolder === folder.id ? "#374151" : "transparent",
                }}
              >
                <span>{folder.icon}</span>
                <span>{folder.title}</span>
              </div>
            ))}
          </div>
        </div>

        <button onClick={() => handleDateClick(date)} style={quickNoteButton}>
          <span>📝</span> Compose Note
        </button>
      </div>

      {/* MAIN LAYOUT */}
      <div style={mainContentStyle}>
        
        {/* TAB CONTROLS */}
        <div style={tabHeaderStyle}>
          <div style={{ display: "flex", gap: "10px" }}>
            <button 
              onClick={() => setActiveTab("calendar")} 
              style={{ ...tabButton, background: activeTab === "calendar" ? "#4f46e5" : "#e5e7eb", color: activeTab === "calendar" ? "white" : "#374151" }}
            >
              📅 Calendar Planner
            </button>
            <button 
              onClick={() => setActiveTab("mindmap")} 
              style={{ ...tabButton, background: activeTab === "mindmap" ? "#4f46e5" : "#e5e7eb", color: activeTab === "mindmap" ? "white" : "#374151" }}
            >
              🧠 Thought Coordinates (Mind Map)
            </button>
          </div>
          <div style={statusBadge}>
            Active Space: {folders.find(f => f.id === activeFolder)?.title}
          </div>
        </div>

        {/* CALENDAR VIEW */}
        {activeTab === "calendar" ? (
          <div style={calendarCard}>
            <Calendar
              onChange={setDate}
              value={date}
              onClickDay={handleDateClick}
              tileContent={({ date: tileDate }) => {
                const dayEvents = filteredEvents.filter(
                  (e) => e.date === tileDate.toISOString().split("T")[0]
                );

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "4px" }}>
                    {dayEvents.map((event) => (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          openFullscreenPreview(event);
                        }}
                        style={{
                          background: event.color,
                          color: "white",
                          fontSize: "10px",
                          borderRadius: "4px",
                          padding: "2px 6px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}
                      >
                        <span style={{
                          fontFamily: event.fontStyle,
                          fontWeight: event.isBold ? "bold" : "normal",
                          textDecoration: event.isItalic ? "italic" : "none",
                          overflow: "hidden",
                          textTransform: "capitalize",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}>
                          {event.time} {event.title}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              }}
            />
          </div>
        ) : (
          
          /* MIND MAP (COORDINATES HUB) */
          <div style={mindMapCanvas}>
            <div style={canvasCenterNode}>
              <div style={{ fontSize: "11px", opacity: 0.8, textTransform: "uppercase" }}>Nodes On</div>
              <div style={{ fontWeight: "bold" }}>{date.toLocaleDateString("en-US", { day: "numeric", month: "short" })}</div>
            </div>

            {dayEventsForMindMap.map((event, index) => {
              const total = dayEventsForMindMap.length;
              const angle = (index * 360) / total;
              const radius = 160; 
              const x = Math.cos((angle * Math.PI) / 180) * radius;
              const y = Math.sin((angle * Math.PI) / 180) * radius;

              return (
                <div key={event.id}>
                  <div style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    width: `${radius}px`,
                    height: "1px",
                    background: "rgba(156, 163, 175, 0.3)",
                    transformOrigin: "0 0",
                    transform: `rotate(${angle}deg)`,
                    zIndex: 1
                  }} />
                  
                  <div
                    onClick={() => openFullscreenPreview(event)}
                    style={{
                      ...mindMapNode,
                      transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                      borderLeft: `5px solid ${event.color}`,
                    }}
                  >
                    <div style={{ fontWeight: "bold", color: "#4b5563", fontSize: "11px" }}>{event.time}</div>
                    <div style={{ 
                      textOverflow: "ellipsis", 
                      overflow: "hidden", 
                      maxWidth: "130px",
                      fontFamily: event.fontStyle,
                      fontWeight: event.isBold ? "bold" : "normal",
                      fontStyle: event.isItalic ? "italic" : "normal",
                    }}>
                      {event.title}
                    </div>
                  </div>
                </div>
              );
            })}

            {dayEventsForMindMap.length === 0 && (
              <div style={{ color: "#9ca3af", textAlign: "center", zIndex: 5 }}>
                No active thought coordinates found for this match. Click "Compose Note" to plot an idea.
              </div>
            )}
          </div>
        )}
      </div>

      {/* RICH TEXT COMPOSE MODAL */}
      {isOpen && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3 style={{ margin: 0, color: "#1f2937" }}>
              {editingId ? "Edit Document Parameters" : "Map New Thought Entry"}
            </h3>

            <input
              placeholder="Document Title"
              value={form.title}
              style={inputStyle}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />

            {/* FORMATTING TOOLBAR */}
            <div style={toolbarStyle}>
              <button 
                type="button" 
                style={{ ...toolBtn, background: form.isBold ? "#d1d5db" : "#f3f4f6", fontWeight: "bold" }}
                onClick={() => setForm({ ...form, isBold: !form.isBold })}
              >B</button>
              <button 
                type="button" 
                style={{ ...toolBtn, background: form.isItalic ? "#d1d5db" : "#f3f4f6", fontStyle: "italic" }}
                onClick={() => setForm({ ...form, isItalic: !form.isItalic })}
              >I</button>
              
              <select 
                value={form.fontStyle} 
                style={selectTool} 
                onChange={(e) => setForm({ ...form, fontStyle: e.target.value })}
              >
                <option value="sans-serif">System Sans</option>
                <option value="serif">Classic Serif</option>
                <option value="monospace">Developer Code</option>
              </select>

              <select 
                value={form.align} 
                style={selectTool} 
                onChange={(e) => setForm({ ...form, align: e.target.value })}
              >
                <option value="left">Align Left</option>
                <option value="center">Align Center</option>
                <option value="right">Align Right</option>
              </select>

              <input 
                type="color" 
                value={form.color} 
                style={{ width: "32px", height: "32px", border: "none", cursor: "pointer", padding: 0 }}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
              />
            </div>

            <textarea
              placeholder="Write your logs or canvas data here..."
              value={form.content}
              style={{
                ...textareaStyle,
                fontFamily: form.fontStyle,
                fontWeight: form.isBold ? "bold" : "normal",
                fontStyle: form.isItalic ? "italic" : "normal",
                textAlign: form.align,
                borderTop: `4px solid ${form.color}`
              }}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />

            <div style={{ display: "flex", gap: "15px" }}>
              <input
                type="time"
                value={form.time}
                style={{ ...inputStyle, flex: 1 }}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
              />
              <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", color: "#374151", flex: 1 }}>
                <input
                  type="checkbox"
                  checked={form.reminder}
                  onChange={(e) => setForm({ ...form, reminder: e.target.checked })}
                />
                Push Notification
              </label>
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button onClick={() => setIsOpen(false)} style={{ ...actionBtn, background: "#e5e7eb", color: "#374151" }}>Discard</button>
              <button onClick={handleSubmit} style={{ ...actionBtn, background: "#4f46e5", color: "white" }}>Commit File</button>
            </div>
          </div>
        </div>
      )}

      {/* FULL-SCREEN READER VIEW MODAL */}
      {isPreviewOpen && selectedEvent && (
        <div style={fullscreenOverlay}>
          <div style={fullscreenContentCard}>
            
            {/* Header Toolbar */}
            <div style={previewHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: selectedEvent.color }} />
                <span style={{ fontSize: "14px", color: "#6b7280", fontWeight: "600" }}>⏰ {selectedEvent.time}</span>
                <span style={{ background: "#f3f4f6", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", color: "#4b5563" }}>
                  {selectedEvent.date}
                </span>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button 
                  onClick={() => {
                    setIsPreviewOpen(false);
                    editNotification(selectedEvent);
                  }} 
                  style={{ ...actionBtn, background: "#e5e7eb", color: "#1f2937" }}
                >
                  ✏️ Edit Document
                </button>
                <button 
                  onClick={() => deleteNotification(selectedEvent.id)} 
                  style={{ ...actionBtn, background: "#fee2e2", color: "#dc2626" }}
                >
                  🗑️ Purge
                </button>
                <button 
                  onClick={() => setIsPreviewOpen(false)} 
                  style={{ ...actionBtn, background: "#1f2937", color: "white" }}
                >
                  ✕ Exit Screen
                </button>
              </div>
            </div>

            {/* Note Canvas Sheet */}
            <div style={{
              flex: 1,
              marginTop: "30px",
              display: "flex",
              flexDirection: "column",
              textAlign: selectedEvent.align,
              fontFamily: selectedEvent.fontStyle,
            }}>
              <h1 style={{ 
                margin: "0 0 20px 0", 
                fontSize: "32px", 
                color: "#111827",
                fontWeight: selectedEvent.isBold ? "bold" : "500",
                fontStyle: selectedEvent.isItalic ? "italic" : "normal",
              }}>
                {selectedEvent.title}
              </h1>
              <hr style={{ border: "none", height: "1px", background: "#e5e7eb", marginBottom: "24px" }} />
              <p style={{
                fontSize: "18px",
                lineHeight: "1.7",
                color: "#374151",
                whiteSpace: "pre-wrap",
                fontWeight: selectedEvent.isBold ? "bold" : "normal",
                fontStyle: selectedEvent.isItalic ? "italic" : "normal",
              }}>
                {selectedEvent.content || <em style={{ color: "#9ca3af" }}>No body text written for this note sheet.</em>}
              </p>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}

/* STYLES PACK */
const workspaceContainer = {
  display: "flex",
  height: "calc(100vh - 60px)",
  fontFamily: "'Inter', sans-serif",
};

const sidebarStyle = {
  width: "260px",
  background: "#1f2937",
  color: "#f9fafb",
  padding: "24px 16px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  boxShadow: "2px 0 5px rgba(0,0,0,0.05)",
};

const sidebarTitle = {
  margin: "0 0 16px 0",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "#9ca3af",
};

const folderItem = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "10px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  transition: "all 0.2s ease",
  fontSize: "15px",
};

const quickNoteButton = {
  background: "#4f46e5",
  color: "white",
  border: "none",
  borderRadius: "10px",
  padding: "14px",
  fontSize: "15px",
  fontWeight: "600",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  boxShadow: "0 4px 6px -1px rgba(79, 70, 229, 0.4)",
};

const mainContentStyle = {
  flex: 1,
  padding: "24px",
  display: "flex",
  flexDirection: "column",
  gap: "20px",
  background: "#f3f4f6",
  overflowY: "auto",
};

const tabHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const tabButton = {
  border: "none",
  padding: "10px 18px",
  borderRadius: "8px",
  fontWeight: "500",
  fontSize: "14px",
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const statusBadge = {
  background: "#fff",
  padding: "6px 14px",
  borderRadius: "20px",
  fontSize: "13px",
  fontWeight: "500",
  color: "#4b5563",
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
};

const calendarCard = {
  background: "white",
  padding: "20px",
  borderRadius: "16px",
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
};

const mindMapCanvas = {
  flex: 1,
  background: "#ffffff",
  borderRadius: "16px",
  position: "relative",
  minHeight: "450px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
  overflow: "hidden"
};

const canvasCenterNode = {
  width: "110px",
  height: "110px",
  borderRadius: "50%",
  background: "#4f46e5",
  color: "white",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10,
  boxShadow: "0 10px 15px -3px rgba(79, 70, 229, 0.4)",
  textAlign: "center"
};

const mindMapNode = {
  position: "absolute",
  top: "50%",
  left: "50%",
  background: "#f9fafb",
  padding: "12px 16px",
  borderRadius: "12px",
  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)",
  zIndex: 5,
  fontSize: "13px",
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  whiteSpace: "nowrap"
};

const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 999
};

const modalStyle = {
  background: "white",
  padding: "24px",
  borderRadius: "14px",
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  width: "100%",
  maxWidth: "550px",
  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
};

const toolbarStyle = {
  display: "flex",
  gap: "8px",
  background: "#f3f4f6",
  padding: "6px",
  borderRadius: "8px",
  alignItems: "center"
};

const toolBtn = {
  width: "32px",
  height: "32px",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "14px",
};

const selectTool = {
  padding: "4px 8px",
  border: "1px solid #e5e7eb",
  borderRadius: "4px",
  background: "white",
  fontSize: "13px",
  cursor: "pointer"
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  boxSizing: "border-box",
  fontSize: "15px",
  outline: "none"
};

const textareaStyle = {
  width: "100%",
  minHeight: "150px",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  boxSizing: "border-box",
  fontSize: "15px",
  outline: "none",
  resize: "vertical"
};

const actionBtn = {
  padding: "10px 20px",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "500",
  fontSize: "14px"
};

/* FULLSCREEN READER MODE WINDOW STYLE */
const fullscreenOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "#ffffff",
  zIndex: 1000,
  display: "flex",
  justifyContent: "center",
  overflowY: "auto"
};

const fullscreenContentCard = {
  width: "100%",
  maxWidth: "800px",
  padding: "40px 24px",
  display: "flex",
  flexDirection: "column",
};

const previewHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: "#f9fafb",
  padding: "16px 20px",
  borderRadius: "12px",
  border: "1px solid #e5e7eb"
};