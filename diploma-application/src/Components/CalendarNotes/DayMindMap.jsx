import React from "react";

export default function DayMindMap({ date, events }) {
  const formattedDate = date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });

  return (
    <div style={{ width: "350px", background: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
      <h3 style={{ marginTop: 0, width: "100%", textAlign: "left" }}>Майнд-карта дня</h3>
      
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", width: "100%" }}>
        {/* Центральный узел */}
        <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "#4f46e5", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", zIndex: 2, textAlign: "center", fontSize: "14px" }}>
          {formattedDate}
        </div>

        {/* Лучи заметок */}
        {events.map((event, index) => {
          // Вычисляем угол для каждого луча, чтобы они распределялись по кругу
          const angle = (index * 360) / events.length;
          const radius = 110; // Длина луча
          const x = Math.cos((angle * Math.PI) / 180) * radius;
          const y = Math.sin((angle * Math.PI) / 180) * radius;

          return (
            <div 
              key={event.id}
              style={{
                position: "absolute",
                transform: `translate(${x}px, ${y}px)`,
                background: event.color,
                color: "#fff",
                padding: "8px 12px",
                borderRadius: "20px",
                fontSize: "12px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                whiteSpace: "nowrap",
                zIndex: 3
              }}
            >
              📌 {event.time} {event.title}
            </div>
          );
        })}

        {/* Если заметок нет */}
        {events.length === 0 && (
          <p style={{ position: "absolute", color: "#9ca3af", fontSize: "14px" }}>На сегодня заметок нет</p>
        )}
      </div>
    </div>
  );
}