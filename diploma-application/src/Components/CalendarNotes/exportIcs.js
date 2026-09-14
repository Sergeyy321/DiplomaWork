function formatIcsDate(dateStr, timeStr) {
  if (!dateStr) return null;
  const cleanDate = dateStr.replace(/-/g, "");
  if (!timeStr) {
    return cleanDate; // Value=DATE
  }
  const cleanTime = timeStr.replace(/:/g, "").padEnd(4, "0") + "00";
  return `${cleanDate}T${cleanTime}`;
}

function escapeIcsText(text = "") {
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Generate standard RFC-5545 iCalendar content for Google, Apple (iPhone), Outlook
 */
export function generateIcsContent(events = [], categories = [], options = {}) {
  const {
    target = "universal", // "google" | "apple" | "universal"
    calendarName = "Smart Notes Workspace",
    color = "#4f46e5",
  } = options;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//Smart Notes Application//${target === "apple" ? "Apple iPhone Calendar" : "Google Calendar"} Export//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${calendarName}`,
    `X-WR-CALDESC:Exported notes and tasks from Smart Notes Workspace`,
    `X-WR-TIMEZONE:UTC`,
  ];

  if (target === "apple") {
    lines.push(`X-APPLE-CALENDAR-COLOR:${color}`);
  }

  const catMap = new Map();
  categories.forEach((c) => catMap.set(c.id, c.title));

  events.forEach((note) => {
    if (!note) return;
    const noteDate = note.date || new Date().toISOString().slice(0, 10);
    const uid = `note-${note.id || Date.now()}-${Date.now()}@smartnotes.app`;
    const dtStart = formatIcsDate(noteDate, note.time);
    const summary = escapeIcsText(note.title || "Untitled Note");
    const description = escapeIcsText(note.content || "");
    const categoryName = catMap.get(note.categoryId || note.folderId) || "General";

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`);

    if (note.time) {
      lines.push(`DTSTART:${dtStart}`);
      // Default duration: 1 hour
      const [h, m] = String(note.time).split(":").map(Number);
      const endH = String(((h || 0) + 1) % 24).padStart(2, "0");
      const endM = String(m || 0).padStart(2, "0");
      const dtEnd = formatIcsDate(noteDate, `${endH}:${endM}`);
      lines.push(`DTEND:${dtEnd}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
    }

    lines.push(`SUMMARY:${summary}`);
    if (description) {
      lines.push(`DESCRIPTION:${description}`);
    }
    lines.push(`CATEGORIES:${categoryName}`);
    lines.push(`STATUS:${note.status === "done" ? "COMPLETED" : "CONFIRMED"}`);

    if (target === "apple") {
      lines.push(`X-APPLE-STRUCTURED-LOCATION;VALUE=URI:geo:0,0:Workspace`);
    }

    if (note.reminder) {
      lines.push("BEGIN:VALARM");
      lines.push("TRIGGER:-PT15M");
      lines.push("ACTION:DISPLAY");
      lines.push(`DESCRIPTION:Reminder: ${summary}`);
      lines.push("END:VALARM");
    }

    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/**
 * Trigger download of ICS file
 */
function downloadIcsBlob(icsContent, filename) {
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export all notes to Google Calendar .ics file
 */
export function exportToGoogleCalendarIcs(events = [], categories = [], filterCatId = "all") {
  const filtered = filterCatId === "all" 
    ? events 
    : events.filter((e) => (e.categoryId || e.folderId) === filterCatId);

  const ics = generateIcsContent(filtered, categories, {
    target: "google",
    calendarName: "Google Calendar - Smart Notes",
  });

  const dateStr = new Date().toISOString().slice(0, 10);
  downloadIcsBlob(ics, `google_calendar_notes_${dateStr}.ics`);
}

/**
 * Export all notes to iPhone / Apple Calendar .ics file
 * On iOS Safari, downloading this file prompts the native "Add All Events" dialog
 */
export function exportToAppleCalendarIcs(events = [], categories = [], filterCatId = "all") {
  const filtered = filterCatId === "all" 
    ? events 
    : events.filter((e) => (e.categoryId || e.folderId) === filterCatId);

  const ics = generateIcsContent(filtered, categories, {
    target: "apple",
    calendarName: "iPhone Smart Notes",
    color: "#4f46e5",
  });

  const dateStr = new Date().toISOString().slice(0, 10);
  downloadIcsBlob(ics, `iphone_apple_calendar_${dateStr}.ics`);
}

/**
 * Generate direct Google Calendar Event URL for single note addition
 */
export function generateGoogleCalendarEventUrl(note, categoryName = "General") {
  if (!note) return "#";
  const title = encodeURIComponent(note.title || "Untitled Note");
  const details = encodeURIComponent(
    (note.content ? note.content.replace(/<[^>]+>/g, " ").trim() + "\n\n" : "") +
    `Topic: ${categoryName}\nStatus: ${note.status || "todo"}`
  );

  const noteDate = (note.date || new Date().toISOString().slice(0, 10)).replace(/-/g, "");
  let datesParam = "";

  if (note.time) {
    const cleanTime = String(note.time).replace(/:/g, "").padEnd(4, "0") + "00";
    const [h, m] = String(note.time).split(":").map(Number);
    const endH = String(((h || 0) + 1) % 24).padStart(2, "0");
    const endM = String(m || 0).padStart(2, "0");
    const endTime = `${endH}${endM}00`;
    datesParam = `${noteDate}T${cleanTime}/${noteDate}T${endTime}`;
  } else {
    // All day
    datesParam = `${noteDate}/${noteDate}`;
  }

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${datesParam}&details=${details}&location=${encodeURIComponent(categoryName)}`;
}

/**
 * Export a single note as an .ics event for iPhone / Outlook / Calendar apps
 */
export function exportSingleNoteIcs(note, categoryName = "General", target = "universal") {
  if (!note) return;
  const ics = generateIcsContent([note], [{ id: note.categoryId || note.folderId, title: categoryName }], {
    target,
    calendarName: note.title || "Note Event",
  });
  const safeName = (note.title || "note").toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 25);
  downloadIcsBlob(ics, `${safeName}_calendar_event.ics`);
}
