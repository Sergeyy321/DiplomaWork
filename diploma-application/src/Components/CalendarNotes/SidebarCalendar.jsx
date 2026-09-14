import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatLocalDate, getTodayLocalDate, isSameDay, getMonthGrid } from "../../utils/dateUtils";
import "./SidebarCalendar.css";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export default function SidebarCalendar({ selectedDate, onSelectDate, events = [] }) {
  const [navYear, setNavYear] = useState(selectedDate.getFullYear());
  const [navMonth, setNavMonth] = useState(selectedDate.getMonth());

  const handleMonthChange = (delta) => {
    let nextMonth = navMonth + delta;
    let nextYear = navYear;
    if (nextMonth < 0) {
      nextMonth = 11;
      nextYear -= 1;
    } else if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }
    setNavMonth(nextMonth);
    setNavYear(nextYear);
  };

  const handleSelectDay = (targetDate) => {
    onSelectDate(targetDate);
    setNavYear(targetDate.getFullYear());
    setNavMonth(targetDate.getMonth());
  };

  const todayStr = getTodayLocalDate();
  const miniGridDays = getMonthGrid(navYear, navMonth);

  return (
    <div className="sidebar-calendar-container">
      <div className="sidebar-cal-header">
        <span className="sidebar-cal-title">
          {MONTH_NAMES[navMonth]} {navYear}
        </span>
        <div className="sidebar-cal-arrows">
          <button
            type="button"
            className="sidebar-cal-arrow-btn"
            onClick={() => handleMonthChange(-1)}
            title="Previous month"
          >
            <ChevronLeft size={12} />
          </button>
          <button
            type="button"
            className="sidebar-cal-arrow-btn"
            onClick={() => handleMonthChange(1)}
            title="Next month"
          >
            <ChevronRight size={12} />
          </button>
        </div>
      </div>

      <div className="sidebar-cal-weekdays">
        <span>Mo</span>
        <span>Tu</span>
        <span>We</span>
        <span>Th</span>
        <span>Fr</span>
        <span>Sa</span>
        <span>Su</span>
      </div>

      <div className="sidebar-cal-grid">
        {miniGridDays.map((item, idx) => {
          const itemDateStr = formatLocalDate(item.date);
          const isSelected = isSameDay(item.date, selectedDate);
          const isToday = itemDateStr === todayStr;
          const hasNotes = events.some((e) => e.date === itemDateStr);

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectDay(item.date)}
              className={`sidebar-cal-day ${!item.isCurrentMonth ? "is-other-month" : ""} ${isToday ? "is-today" : ""} ${isSelected ? "is-selected" : ""}`}
            >
              <span>{item.date.getDate()}</span>
              {hasNotes && <span className="sidebar-cal-dot" />}
            </button>
          );
        })}
      </div>

      <div className="sidebar-cal-footer">
        <button
          type="button"
          className="sidebar-cal-today-btn"
          onClick={() => handleSelectDay(new Date())}
        >
          Today
        </button>
        <span className="sidebar-cal-selected-label">
          {selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      </div>
    </div>
  );
}
