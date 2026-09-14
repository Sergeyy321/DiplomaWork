/**
 * Robust RFC 5545 iCalendar (.ics) parser for Google Calendar and Apple/Outlook exports
 */

function unfoldIcsLines(raw = "") {
  // ICS line folding: lines starting with a space or tab are continuation of previous line
  return raw.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "").split(/\r?\n/);
}

function parseIcsDateTime(val = "") {
  // Handles:
  // 20260912
  // 20260912T143000Z
  // 20260912T143000
  // TZID=...:20260912T143000
  const cleanVal = val.includes(":") ? val.split(":").pop() : val;
  if (!cleanVal || cleanVal.length < 8) return { date: "", time: "" };

  const y = cleanVal.slice(0, 4);
  const m = cleanVal.slice(4, 6);
  const d = cleanVal.slice(6, 8);
  const dateStr = `${y}-${m}-${d}`;

  if (cleanVal.includes("T") && cleanVal.length >= 13) {
    const tPart = cleanVal.split("T")[1];
    const hh = tPart.slice(0, 2);
    const mm = tPart.slice(2, 4);
    return { date: dateStr, time: `${hh}:${mm}` };
  }

  return { date: dateStr, time: "" };
}

function unescapeIcsText(str = "") {
  return str
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

export function parseGoogleCalendarIcs(icsString, existingCategories = []) {
  const lines = unfoldIcsLines(icsString);
  const events = [];
  let currentEvent = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line === "BEGIN:VEVENT") {
      currentEvent = {
        title: "",
        content: "",
        date: "",
        time: "",
        categoryId: "work",
        folderId: "work",
        status: "todo",
        reminder: false,
        color: "#4f46e5",
      };
      continue;
    }

    if (line === "END:VEVENT" && currentEvent) {
      if (currentEvent.title || currentEvent.content) {
        events.push({
          id: `gcal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          ...currentEvent,
        });
      }
      currentEvent = null;
      continue;
    }

    if (!currentEvent) continue;

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    const keyPart = line.slice(0, colonIdx);
    const valuePart = line.slice(colonIdx + 1);
    const mainKey = keyPart.split(";")[0].toUpperCase();

    switch (mainKey) {
      case "SUMMARY":
        currentEvent.title = unescapeIcsText(valuePart);
        break;
      case "DESCRIPTION":
        currentEvent.content = unescapeIcsText(valuePart);
        break;
      case "DTSTART": {
        const { date, time } = parseIcsDateTime(line);
        if (date) currentEvent.date = date;
        if (time) currentEvent.time = time;
        break;
      }
      case "CATEGORIES": {
        const catName = unescapeIcsText(valuePart).toLowerCase();
        const matched = existingCategories.find(
          (c) => c.title.toLowerCase().includes(catName) || c.id.toLowerCase().includes(catName)
        );
        if (matched) {
          currentEvent.categoryId = matched.id;
          currentEvent.folderId = matched.id;
          currentEvent.color = matched.color;
        }
        break;
      }
      case "STATUS": {
        const st = valuePart.toUpperCase();
        if (st === "COMPLETED") currentEvent.status = "done";
        else if (st === "IN-PROCESS" || st === "IN-PROGRESS") currentEvent.status = "in-progress";
        else currentEvent.status = "todo";
        break;
      }
      case "BEGIN":
        if (valuePart.toUpperCase() === "VALARM") {
          currentEvent.reminder = true;
        }
        break;
      default:
        break;
    }
  }

  return events;
}
