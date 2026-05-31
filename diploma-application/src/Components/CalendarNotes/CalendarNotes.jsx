import React, { useState, useRef, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import AiAnalyzerSuite from "./AiAnalyzerSuite";
import CalendarDashboard from "./CalendarDashboard";
import AdvancedCalendarTile from "./AdvancedCalendarTile";
import CalendarFilters from "./CalendarFilters";

// ==========================================
// 🎨 PREMIUM LUCIDE REACT ICON IMPORTS
// ==========================================
import { 
  Folder, 
  Briefcase, 
  Home, 
  Lightbulb, 
  Rocket, 
  FolderPlus, 
  Plus, 
  FileEdit, 
  Calendar as CalendarIcon, 
  Network, 
  Cpu, 
  Bell, 
  Trash2, 
  X 
} from "lucide-react";

export default function CalendarNote() {
  const [date, setDate] = useState(new Date());
  
  // Workspaces State with Lucide Icons
  const [folders, setFolders] = useState([
    { id: "work", title: "Work Workspace", icon: <Briefcase size={16} /> },
    { id: "personal", title: "Personal Life", icon: <Home size={16} /> },
    { id: "ideas", title: "Mental Sandbox", icon: <Lightbulb size={16} /> },
  ]);
  const [activeFolder, setActiveFolder] = useState("work");

  const [newFolderTitle, setNewFolderTitle] = useState("");
  const [newFolderIcon, setNewFolderIcon] = useState("folder");
  const [isAddingFolder, setIsAddingFolder] = useState(false);

  // Notes state
  const [events, setEvents] = useState([
    {
      id: 1,
      folderId: "work",
      title: "Diploma Project Defense Planning",
      content: "We must review system architecture constraints and complete deployment modules.",
      time: "14:00",
      date: new Date().toISOString().split("T")[0],
      color: "#4f46e5",
      fontStyle: "sans-serif",
      isBold: true,
      isItalic: false,
      align: "left",
      reminder: true, 
      x: -180, 
      y: -60
    }
  ]);

  const [isOpen, setIsOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activeTab, setActiveTab] = useState("calendar"); 
  const [aiTargetNote, setAiTargetNote] = useState(null);

  const [form, setForm] = useState({
    title: "", content: "", time: "12:00", color: "#4f46e5",
    fontStyle: "sans-serif", isBold: false, isItalic: false, align: "left", reminder: false,
  });

  const [editingId, setEditingId] = useState(null);
  const dragNodeId = useRef(null);
  const dragStartPos = useRef({ x: 0, y: 0 });

  const blinkIntervalRef = useRef(null);
  const originalTitle = "Smart Note Workspace";

  const startTabBlinking = (message) => {
    if (blinkIntervalRef.current) return;
    
    let isAlertTitle = false;
    blinkIntervalRef.current = setInterval(() => {
      document.title = isAlertTitle ? originalTitle : `⚠️ ${message}`;
      isAlertTitle = !isAlertTitle;
    }, 1000); 
  };

  const stopTabBlinking = () => {
    if (blinkIntervalRef.current) {
      clearInterval(blinkIntervalRef.current);
      blinkIntervalRef.current = null;
      document.title = originalTitle; 
    }
  };

  const playAlertSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sine"; 
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); 
      
      gain.gain.setValueAtTime(0.3, ctx.currentTime); 
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4); 
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.4); 
    } catch (e) {
      console.warn("Audio Context blocked by browser autoplay policy.");
    }
  };

  useEffect(() => {
    const triggeredIds = new Set();

    const checkReminders = () => {
      const now = new Date();
      const currentDateStr = now.toISOString().split("T")[0];
      const currentTimeStr = now.toTimeString().slice(0, 5); 

      events.forEach(event => {
        if (event.reminder && event.date === currentDateStr && event.time === currentTimeStr) {
          if (!triggeredIds.has(event.id)) {
            triggeredIds.add(event.id);
            playAlertSound();
            startTabBlinking(`Note: ${event.title}`);
          }
        }
      });
    };

    const checkInterval = setInterval(checkReminders, 15000);
    return () => clearInterval(checkInterval);
  }, [events]);

  useEffect(() => {
    const handleUserFocus = () => stopTabBlinking();
    window.addEventListener("click", handleUserFocus);
    window.addEventListener("focus", handleUserFocus);
    
    return () => {
      window.removeEventListener("click", handleUserFocus);
      window.removeEventListener("focus", handleUserFocus);
    };
  }, []);

  const handleCreateFolder = (e) => {
    e.preventDefault();
    if (!newFolderTitle.trim()) return;
    const newId = `folder_${Date.now()}`;
    
    // Dynamic Lucide assignment based on dropdown values
    let iconComponent = <Folder size={16} />;
    if (newFolderIcon === "work") iconComponent = <Briefcase size={16} />;
    if (newFolderIcon === "personal") iconComponent = <Home size={16} />;
    if (newFolderIcon === "ideas") iconComponent = <Lightbulb size={16} />;
    if (newFolderIcon === "rocket") iconComponent = <Rocket size={16} />;

    setFolders([...folders, { id: newId, title: newFolderTitle.trim(), icon: iconComponent }]);
    setActiveFolder(newId);
    setNewFolderTitle("");
    setIsAddingFolder(false);
  };
  
  const deleteFolder = (id) => {
    setFolders(folders.filter((f) => f.id !== id));
  };
  
  const handleDateClick = (date) => {
    setSelectedDate(date);
    setEditingId(null);
    setForm({ title: "", content: "", time: "12:00", color: "#4f46e5", fontStyle: "sans-serif", isBold: false, isItalic: false, align: "left", reminder: false });
    setIsOpen(true);
  };

  const handleSubmit = () => {
    const targetDate = selectedDate || date;
    const dateString = targetDate.toISOString().split("T")[0];

    if (editingId) {
      setEvents(events.map(e => e.id === editingId ? { ...e, ...form } : e));
    } else {
      const angle = Math.random() * Math.PI * 2;
      const radius = 130 + Math.random() * 40;
      setEvents([
        ...events,
        {
          id: Date.now(),
          folderId: activeFolder,
          date: dateString,
          fullDate: targetDate,
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
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
    if (aiTargetNote?.id === id) setAiTargetNote(null);
  };

  const editNotification = (event) => {
    setSelectedDate(new Date(event.date));
    setEditingId(event.id);
    setForm({ title: event.title, content: event.content || "", time: event.time, color: event.color, fontStyle: event.fontStyle || "sans-serif", isBold: event.isBold || false, isItalic: event.isItalic || false, align: event.align || "left", reminder: event.reminder || false });
    setIsOpen(true);
  };

  const onNodeMouseDown = (e, id, currentX, currentY) => {
    e.stopPropagation();
    dragNodeId.current = id;
    dragStartPos.current = { x: e.clientX - currentX, y: e.clientY - currentY };
  };

  const onCanvasMouseMove = (e) => {
    if (!dragNodeId.current) return;
    const newX = e.clientX - dragStartPos.current.x;
    const newY = e.clientY - dragStartPos.current.y;
    setEvents(prev => prev.map(evt => evt.id === dragNodeId.current ? { ...evt, x: newX, y: newY } : evt));
  };

  const onCanvasMouseUp = () => { dragNodeId.current = null; };

  const triggerAiRouting = (event) => {
    setAiTargetNote(event);
    setIsPreviewOpen(false);
    setActiveTab("ai-analyzer");
  };

  const filteredEvents = events.filter((e) => e.folderId === activeFolder);
  const selectedDateStr = date.toISOString().split("T")[0];
  const dayEventsForMindMap = filteredEvents.filter((e) => e.date === selectedDateStr);

  return (
    <div style={workspaceContainer}>
      {/* SIDEBAR */}
      <div style={sidebarStyle}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h4 style={{ ...sidebarTitle, display: "flex", alignItems: "center", gap: "8px" }}>
              <FolderPlus size={16} /> Workspaces
            </h4>
            <button onClick={() => setIsAddingFolder(!isAddingFolder)} style={addFolderToggleBtn}>
              <Plus size={16} />
            </button>
          </div>

          {isAddingFolder && (
            <form onSubmit={handleCreateFolder} style={folderFormStyle}>
              <div style={{ display: "flex", gap: "6px" }}>
                <select value={newFolderIcon} onChange={(e) => setNewFolderIcon(e.target.value)} style={iconSelectStyle}>
                  <option value="folder">Folder</option>
                  <option value="work">Business</option>
                  <option value="personal">Home</option>
                  <option value="ideas">Sandbox</option>
                  <option value="rocket">Launch</option>
                </select>
                <input type="text" placeholder="Space Name..." value={newFolderTitle} onChange={(e) => setNewFolderTitle(e.target.value)} style={folderInputStyle} autoFocus />
              </div>
              <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                <button type="submit" style={folderActionBtnSubmit}>Create</button>
                <button type="button" onClick={() => setIsAddingFolder(false)} style={folderActionBtnCancel}>Cancel</button>
              </div>
            </form>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {folders.map((folder) => (
              <div key={folder.id} onClick={() => setActiveFolder(folder.id)} style={{ ...folderItem, background: activeFolder === folder.id ? "#374151" : "transparent", position: "relative" }}>
                <span style={{ display: "flex", alignItems: "center", color: activeFolder === folder.id ? "#6366f1" : "#9ca3af" }}>{folder.icon}</span>
                <span style={deleteContentContainer}>{folder.title}</span>
                <button type="button" style={folderActionBtnDelete} onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id); }}>Delete</button>
              </div>
            ))}
          </div>
        </div>

        <button onClick={() => handleDateClick(date)} style={quickNoteButton}>
          <FileEdit size={16} /> Compose Note
        </button>
      </div>

      {/* MAIN CONTENT */}
      <div style={mainContentStyle}>
        <div style={tabHeaderStyle}>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => setActiveTab("calendar")} style={{ ...tabButton, display: "flex", alignItems: "center", gap: "8px", background: activeTab === "calendar" ? "#4f46e5" : "#e5e7eb", color: activeTab === "calendar" ? "white" : "#374151" }}>
              <CalendarIcon size={15} /> Calendar Dashboard
            </button>
            <button onClick={() => setActiveTab("mindmap")} style={{ ...tabButton, display: "flex", alignItems: "center", gap: "8px", background: activeTab === "mindmap" ? "#4f46e5" : "#e5e7eb", color: activeTab === "mindmap" ? "white" : "#374151" }}>
              <Network size={15} /> Spatial Coordinates Hub
            </button>
            <button onClick={() => setActiveTab("ai-analyzer")} style={{ ...tabButton, display: "flex", alignItems: "center", gap: "8px", background: activeTab === "ai-analyzer" ? "#10b981" : "#e5e7eb", color: activeTab === "ai-analyzer" ? "white" : "#374151" }}>
              <Cpu size={15} /> AI Insights Suite
            </button>
          </div>
          <div style={statusBadge}>
            Active Space: {folders.find(f => f.id === activeFolder)?.title || "Unknown Workspace"}
          </div>
        </div>

        {activeTab === "calendar" && (
          <CalendarDashboard
date={date}
    setDate={setDate}
    allEvents={events}
    setEvents={setEvents}
    setSelectedEvent={setSelectedEvent}
    setIsPreviewOpen={setIsPreviewOpen}
    deleteNotification={deleteNotification}
          />
        )}

        {activeTab === "mindmap" && (
          <div style={mindMapCanvas} onMouseMove={onCanvasMouseMove} onMouseUp={onCanvasMouseUp} onMouseLeave={onCanvasMouseUp}>
            <div style={canvasCenterNode}>
              <div style={{ fontSize: "11px", opacity: 0.8, textTransform: "uppercase" }}>Nodes On</div>
              <div style={{ fontWeight: "bold" }}>{date.toLocaleDateString("en-US", { day: "numeric", month: "short" })}</div>
            </div>

            {dayEventsForMindMap.map((event) => {
              const angleRad = Math.atan2(event.y, event.x);
              const angleDeg = (angleRad * 180) / Math.PI;
              const lineDistance = Math.hypot(event.x, event.y);

              return (
                <div key={event.id}>
                  <div style={{ position: "absolute", top: "50%", left: "50%", width: `${lineDistance}px`, height: "2px", background: `linear-gradient(90deg, #4f46e5 0%, ${event.color} 100%)`, opacity: 0.4, transformOrigin: "0 0", transform: `rotate(${angleDeg}deg)`, zIndex: 1, pointerEvents: "none" }} />
                  <div 
                    onMouseDown={(e) => onNodeMouseDown(e, event.id, event.x, event.y)} 
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={() => {setSelectedEvent(event); setIsPreviewOpen(true);}}
                    style={{ ...mindMapNode, transform: `translate(calc(-50% + ${event.x}px), calc(-50% + ${event.y}px))`, borderLeft: `5px solid ${event.color}`, cursor: dragNodeId.current === event.id ? "grabbing" : "grab" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", gap: "10px" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "4px", fontWeight: "700", color: "#6b7280", fontSize: "11px" }}>
                        {event.time} {event.reminder && <Bell size={12} />}
                      </span>
                      <span style={{ fontSize: "10px", opacity: 0.4 }}>✥ Drag</span>
                    </div>
                    <div style={{ textOverflow: "ellipsis", overflow: "hidden", maxWidth: "140px", fontFamily: event.fontStyle, fontWeight: event.isBold ? "bold" : "normal", fontStyle: event.isItalic ? "italic" : "normal", color: "#111827", marginTop: "2px" }}>{event.title}</div>
                  </div>
                </div>
              );
            })}

            {dayEventsForMindMap.length === 0 && (
              <div style={emptyCanvasPrompt}>
                <div style={{ display: "flex", justifyContent: "center", color: "#9ca3af", marginBottom: "12px" }}>
                  <Network size={24} />
                </div>
                No active thought nodes mapped for this viewport.
              </div>
            )}
          </div>
        )}

        {activeTab === "ai-analyzer" && (
          <AiAnalyzerSuite filteredEvents={filteredEvents} aiTargetNote={aiTargetNote} setAiTargetNote={setAiTargetNote} setEvents={setEvents}/>
        )}
      </div>

      {/* RICH TEXT COMPOSE MODAL */}
      {isOpen && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3 style={{ margin: 0, color: "#1f2937" }}>{editingId ? "Edit Document Parameters" : "Map New Thought Entry"}</h3>
            <input placeholder="Document Title" value={form.title} style={inputStyle} onChange={(e) => setForm({ ...form, title: e.target.value })} />

            <div style={toolbarStyle}>
              <button type="button" style={{ ...toolBtn, background: form.isBold ? "#d1d5db" : "#f3f4f6", fontWeight: "bold" }} onClick={() => setForm({ ...form, isBold: !form.isBold })} >B</button>
              <button type="button" style={{ ...toolBtn, background: form.isItalic ? "#d1d5db" : "#f3f4f6", fontStyle: "italic" }} onClick={() => setForm({ ...form, isItalic: !form.isItalic })} >I</button>
              <select value={form.fontStyle} style={selectTool} onChange={(e) => setForm({ ...form, fontStyle: e.target.value })} >
                <option value="sans-serif">System Sans</option>
                <option value="serif">Classic Serif</option>
                <option value="monospace">Developer Code</option>
              </select>
              <select value={form.align} style={selectTool} onChange={(e) => setForm({ ...form, align: e.target.value })} >
                <option value="left">Align Left</option>
                <option value="center">Align Center</option>
                <option value="right">Align Right</option>
              </select>
              <input type="color" value={form.color} style={{ width: "32px", height: "32px", border: "none", cursor: "pointer", padding: 0 }} onChange={(e) => setForm({ ...form, color: e.target.value })} />
            </div>

            <textarea placeholder="Write your logs or canvas data here..." value={form.content} style={{ ...textareaStyle, fontFamily: form.fontStyle, fontWeight: form.isBold ? "bold" : "normal", fontStyle: form.isItalic ? "italic" : "normal", textAlign: form.align, borderTop: `4px solid ${form.color}` }} onChange={(e) => setForm({ ...form, content: e.target.value })} />

            <div style={{ display: "flex", gap: "15px" }}>
              <input type="time" value={form.time} style={{ ...inputStyle, flex: 1 }} onChange={(e) => setForm({ ...form, time: e.target.value })} />
              <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", color: "#374151", flex: 1 }}>
                <input type="checkbox" checked={form.reminder} onChange={(e) => setForm({ ...form, reminder: e.target.checked })} /> Push Notification
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
            <div style={previewHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: selectedEvent.color }} />
                <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "14px", color: "#6b7280", fontWeight: "600" }}>
                  <Bell size={14} /> {selectedEvent.time}
                </span>
                <span style={{ background: "#f3f4f6", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", color: "#4b5563" }}>{selectedEvent.date}</span>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => triggerAiRouting(selectedEvent)} style={{ ...actionBtn, display: "flex", alignItems: "center", gap: "6px", background: "#d1fae5", color: "#065f46", border: "1px solid #10b981" }} ><Cpu size={14} /> Analyze with AI</button>
                <button onClick={() => { setIsPreviewOpen(false); editNotification(selectedEvent); }} style={{ ...actionBtn, display: "flex", alignItems: "center", gap: "6px", background: "#e5e7eb", color: "#1f2937" }} ><FileEdit size={14} /> Edit Document</button>
                <button onClick={() => deleteNotification(selectedEvent.id)} style={{ ...actionBtn, display: "flex", alignItems: "center", gap: "6px", background: "#fee2e2", color: "#dc2626" }} ><Trash2 size={14} /> Purge</button>
                <button onClick={() => setIsPreviewOpen(false)} style={{ ...actionBtn, display: "flex", alignItems: "center", gap: "6px", background: "#1f2937", color: "white" }} ><X size={14} /> Exit Screen</button>
              </div>
            </div>

            <div style={{ flex: 1, marginTop: "30px", display: "flex", flexDirection: "column", textAlign: selectedEvent.align, fontFamily: selectedEvent.fontStyle }}>
              <h1 style={{ margin: "0 0 20px 0", fontSize: "32px", color: "#111827", fontWeight: selectedEvent.isBold ? "700" : "500", fontStyle: selectedEvent.isItalic ? "italic" : "normal" }}>{selectedEvent.title}</h1>
              <hr style={{ border: "none", height: "1px", background: "#e5e7eb", marginBottom: "24px" }} />
              <p style={{ fontSize: "18px", lineHeight: "1.7", color: "#374151", whiteSpace: "pre-wrap", fontWeight: selectedEvent.isBold ? "700" : "400", fontStyle: selectedEvent.isItalic ? "italic" : "normal" }}>
                {selectedEvent.content || <em style={{ color: "#9ca3af" }}>No body text written for this note sheet.</em>}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const workspaceContainer = { display: "flex", height: "calc(100vh - 60px)", fontFamily: "'Inter', sans-serif", background: "#f9fafb" };
const sidebarStyle = { width: "280px", background: "#111827", color: "#f9fafb", padding: "24px 20px", display: "flex", flexDirection: "column", justifyContent: "space-between", borderRight: "1px solid #1f2937" };
const sidebarTitle = { margin: 0, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ca3af", fontWeight: "700" };
const addFolderToggleBtn = { background: "none", border: "none", color: "#9ca3af", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
const folderFormStyle = { background: "#1f2937", padding: "12px", borderRadius: "10px", marginBottom: "12px", display: "flex", flexDirection: "column", gap: "8px", border: "1px solid #374151" };
const iconSelectStyle = { background: "#111827", color: "white", border: "1px solid #4b5563", borderRadius: "6px", padding: "4px" };
const folderInputStyle = { flex: 1, background: "#111827", color: "white", border: "1px solid #4b5563", borderRadius: "6px", padding: "6px 10px", fontSize: "13px" };
const deleteContentContainer = { display: "block", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const folderActionBtnSubmit = { flex: 1, background: "#4f46e5", color: "white", border: "none", borderRadius: "6px", padding: "6px" };
const folderActionBtnDelete = { position: "absolute", right: "10px", background: "#ef4444", color: "white", border: "none", borderRadius: "6px", padding: "4px 8px", fontSize: "11px", cursor: "pointer", fontWeight: "600" };
const folderActionBtnCancel = { background: "#4b5563", color: "#e5e7eb", border: "none", borderRadius: "6px", padding: "6px 10px" };
const folderItem = { display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", borderRadius: "10px", cursor: "pointer", fontSize: "14px", fontWeight: "500", transition: "all 0.15s ease" };
const quickNoteButton = { background: "#4f46e5", color: "white", border: "none", borderRadius: "12px", padding: "16px", fontSize: "15px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", boxShadow: "0 4px 14px rgba(79, 70, 229, 0.35)" };
const mainContentStyle = { flex: 1, padding: "32px", display: "flex", flexDirection: "column", gap: "24px", overflowY: "auto" };
const tabHeaderStyle = { display: "flex", justifyContent: "space-between", alignItems: "center" };
const tabButton = { border: "none", padding: "12px 20px", borderRadius: "10px", fontWeight: "600", fontSize: "14px", cursor: "pointer", transition: "all 0.2s ease" };
const statusBadge = { background: "#ffffff", padding: "8px 16px", borderRadius: "30px", fontSize: "13px", fontWeight: "600", color: "#4b5563", border: "1px solid #e5e7eb" };
const calendarCard = { background: "#ffffff", padding: "24px", borderRadius: "20px", border: "1px solid #e5e7eb", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.02), 0 8px 10px -6px rgba(0,0,0,0.03)" };
const tileContentContainer = { display: "flex", flexDirection: "column", gap: "3px", marginTop: "6px", width: "100%", minHeight: "45px", justifyContent: "flex-start", alignItems: "stretch" };
const calendarInlineNoteBadge = { fontSize: "11px", borderRadius: "4px", padding: "3px 6px", textAlign: "left", display: "block", width: "100%", boxSizing: "border-box" };
const mindMapCanvas = { flex: 1, background: "#ffffff", borderRadius: "20px", position: "relative", minHeight: "500px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #e5e7eb", overflow: "hidden", userSelect: "none" };
const canvasCenterNode = { width: "120px", height: "120px", borderRadius: "50%", background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)", color: "white", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 10, boxShadow: "0 20px 25px -5px rgba(79, 70, 229, 0.3)", textAlign: "center" };
const mindMapNode = { position: "absolute", top: "50%", left: "50%", background: "#ffffff", padding: "14px 18px", borderRadius: "14px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.08)", zIndex: 5, fontSize: "13px", display: "flex", flexDirection: "column", gap: "4px", whiteSpace: "nowrap", border: "1px solid #f3f4f6" };
const emptyCanvasPrompt = { color: "#9ca3af", textAlign: "center", zIndex: 5, lineHeight: "1.6", fontWeight: "500" };
const overlayStyle = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(17, 24, 39, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, backdropFilter: "blur(4px)" };
const modalStyle = { background: "white", padding: "32px", borderRadius: "20px", display: "flex", flexDirection: "column", gap: "16px", width: "100%", maxWidth: "550px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)" };
const toolbarStyle = { display: "flex", gap: "8px", background: "#f3f4f6", padding: "6px", borderRadius: "8px", alignItems: "center" };
const toolBtn = { width: "32px", height: "32px", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "14px" };
const selectTool = { padding: "4px 8px", border: "1px solid #e5e7eb", borderRadius: "4px", background: "white", fontSize: "13px" };
const inputStyle = { width: "100%", padding: "12px 16px", borderRadius: "10px", border: "1px solid #d1d5db", boxSizing: "border-box", fontSize: "15px", outline: "none" };
const textareaStyle = { width: "100%", minHeight: "160px", padding: "16px", borderRadius: "10px", border: "1px solid #d1d5db", boxSizing: "border-box", fontSize: "15px", outline: "none", resize: "vertical", lineHeight: "1.5" };
const actionBtn = { padding: "12px 24px", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "600", fontSize: "14px" };
const fullscreenOverlay = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "#ffffff", zIndex: 1000, display: "flex", justifyContent: "center", overflowY: "auto" };
const fullscreenContentCard = { width: "100%", maxWidth: "800px", padding: "60px 24px", display: "flex", flexDirection: "column" };
const previewHeader = { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f9fafb", padding: "16px 24px", borderRadius: "14px", border: "1px solid #e5e7eb" };