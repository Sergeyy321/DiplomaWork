import React, { useState } from "react";
import Sidebar from "./Sidebar";
import CalendarView from "./CalendarView";
import DayMindMap from "./DayMindMap";

export default function Workspace() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [folders, setFolders] = useState([
    { id: "work", title: "Работа", icon: "💼" },
    { id: "personal", title: "Личное", icon: "🏠" }
  ]);
  const [activeFolder, setActiveFolder] = useState("work");
  const [events, setEvents] = useState([
    { id: 1, folderId: "work", title: "Созвон по диплому", time: "15:00", date: new Date().toISOString().split("T")[0], color: "blue" },
    { id: 2, folderId: "work", title: "Поправить баг с CSS", time: "18:00", date: new Date().toISOString().split("T")[0], color: "red" }
  ]);

  const createQuickNote = () => {
    const title = prompt("Введите название заметки:");
    if (!title) return;
    
    setEvents([...events, {
      id: Date.now(),
      folderId: activeFolder,
      title: title,
      time: "12:00",
      date: currentDate.toISOString().split("T")[0],
      color: "green"
    }]);
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f8f9fa", fontFamily: "sans-serif" }}>
      <Sidebar 
        folders={folders} 
        activeFolder={activeFolder} 
        setActiveFolder={setActiveFolder} 
        onCreateNote={createQuickNote} 
      />
      <div style={{ flex: 1, padding: "20px", display: "flex", gap: "20px" }}>
        <CalendarView 
          date={currentDate} 
          setDate={setCurrentDate} 
          events={events.filter(e => e.folderId === activeFolder)} 
        />
        <DayMindMap 
          date={currentDate} 
          events={events.filter(e => e.date === currentDate.toISOString().split("T")[0] && e.folderId === activeFolder)} 
        />
      </div>
    </div>
  );
}