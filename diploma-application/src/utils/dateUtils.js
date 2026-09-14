/**
 * Utility functions for local timezone-safe date and time formatting.
 * Avoids UTC day-shift bugs caused by .toISOString().
 */

export function formatLocalDate(dateInput) {
  if (!dateInput) return "";
  
  if (typeof dateInput === "string") {
    // If it's already YYYY-MM-DD, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      return dateInput;
    }
  }

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTodayLocalDate() {
  return formatLocalDate(new Date());
}

export function getCurrentLocalTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function isSameDay(d1, d2) {
  if (!d1 || !d2) return false;
  const a = new Date(d1);
  const b = new Date(d2);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function getWeekDays(baseDate) {
  const current = new Date(baseDate);
  // Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const day = current.getDay();
  // Adjust so Monday is 0, Sunday is 6
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  
  const monday = new Date(current);
  monday.setDate(current.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const nextDay = new Date(monday);
    nextDay.setDate(monday.getDate() + i);
    days.push(nextDay);
  }
  return days;
}

export function getMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  // Day of week for 1st of month (0 = Sun, 1 = Mon...) -> Convert Mon=0..Sun=6
  const startDayIndex = (firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1);
  const totalDays = lastDay.getDate();

  const days = [];
  
  // Previous month trailing days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayIndex - 1; i >= 0; i--) {
    days.push({
      date: new Date(year, month - 1, prevMonthLastDay - i),
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let d = 1; d <= totalDays; d++) {
    days.push({
      date: new Date(year, month, d),
      isCurrentMonth: true,
    });
  }

  // Next month leading days to complete grid rows
  const remaining = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    days.push({
      date: new Date(year, month + 1, i),
      isCurrentMonth: false,
    });
  }

  return days;
}
