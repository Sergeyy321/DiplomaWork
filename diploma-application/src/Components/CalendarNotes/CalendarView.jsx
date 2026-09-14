import React from "react";
import Calendar from "react-calendar";

export default function CalendarView({ date, setDate, events }) {
  return (
    <div style={{ flex: 1, background: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
      <h2 style={{ marginTop: 0 }}>Task calendar</h2>
      <Calendar
        onChange={setDate}
        value={date}
        locale="en-US"
        tileContent={({ date: tileDate }) => {
          const currentDayStr = tileDate.toISOString().split("T")[0];
          const dayEvents = events.filter(e => e.date === currentDayStr);

          return (
            <div style={{ display: "flex", gap: "2px", justifyContent: "center", marginTop: "4px" }}>
              {dayEvents.map(e => (
                <div key={e.id} style={{ width: "6px", height: "6px", borderRadius: "50%", background: e.color }} />
              ))}
            </div>
          );
        }}
      />
    </div>
  );
}