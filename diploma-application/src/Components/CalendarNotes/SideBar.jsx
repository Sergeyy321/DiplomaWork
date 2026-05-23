import React from "react";

export default function Sidebar({ folders, activeFolder, setActiveFolder, onCreateNote }) {
  return (
    <div style={{ width: "250px", background: "#1e1e24", color: "#fff", padding: "20px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div>
        <h3 style={{ marginUp: 0, opacity: 0.6, fontSize: "12px", textTransform: "uppercase" }}>Папки</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "15px" }}>
          {folders.map(folder => (
            <div 
              key={folder.id}
              onClick={() => setActiveFolder(folder.id)}
              style={{
                padding: "10px", 
                borderRadius: "6px", 
                cursor: "pointer",
                background: activeFolder === folder.id ? "#3a3a43" : "transparent",
                display: "flex", gap: "10px"
              }}
            >
              <span>{folder.icon}</span>
              <span>{folder.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Дефолтная кнопка создания заметки */}
      <button 
        onClick={onCreateNote}
        style={{
          width: "100%", padding: "12px", background: "#4f46e5", color: "#fff", 
          border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
        }}
      >
        <span>📝</span> Новая заметка
      </button>
    </div>
  );
}