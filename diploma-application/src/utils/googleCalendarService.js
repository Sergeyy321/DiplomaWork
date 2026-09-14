/**
 * googleCalendarService.js
 * 1-Click Google Calendar Real-Time Synchronization Engine
 * Using Google Calendar REST API v3
 */

import { GDRIVE_TOKEN_KEY, GDRIVE_USER_EMAIL_KEY, loginWithGoogleOAuth } from "./googleDriveService";

export const GCAL_LAST_SYNC_KEY = "smart_notes_last_gcal_sync";
export const GCAL_AUTO_SYNC_KEY = "smart_notes_gcal_auto_sync";
export const GCAL_SYNCED_MAP_KEY = "smart_notes_gcal_synced_ids";

/**
 * Strips HTML tags for clean calendar event descriptions
 */
function stripHtml(html = "") {
  return String(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Get Google Auth Token (unified with Google Drive token)
 */
export function getGoogleToken() {
  try {
    return localStorage.getItem(GDRIVE_TOKEN_KEY) || null;
  } catch (e) {
    return null;
  }
}

/**
 * Get Google User Email
 */
export function getGoogleUserEmail() {
  try {
    return localStorage.getItem(GDRIVE_USER_EMAIL_KEY) || null;
  } catch (e) {
    return null;
  }
}

/**
 * Get last calendar sync timestamp
 */
export function getLastCalendarSyncTime() {
  try {
    return localStorage.getItem(GCAL_LAST_SYNC_KEY) || null;
  } catch (e) {
    return null;
  }
}

/**
 * Set last calendar sync timestamp
 */
export function updateLastCalendarSyncTime() {
  try {
    const timestamp = new Date().toISOString();
    localStorage.setItem(GCAL_LAST_SYNC_KEY, timestamp);
    return timestamp;
  } catch (e) {
    return null;
  }
}

/**
 * Check if Google Calendar Auto-sync on save is enabled
 */
export function isCalendarAutoSyncEnabled() {
  try {
    return localStorage.getItem(GCAL_AUTO_SYNC_KEY) === "true";
  } catch (e) {
    return false;
  }
}

/**
 * Toggle Google Calendar Auto-sync
 */
export function setCalendarAutoSyncEnabled(enabled) {
  try {
    localStorage.setItem(GCAL_AUTO_SYNC_KEY, enabled ? "true" : "false");
  } catch (e) {}
}

/**
 * Get mapping of local note IDs to Google Calendar event IDs
 */
function getSyncedIdMap() {
  try {
    const raw = localStorage.getItem(GCAL_SYNCED_MAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveSyncedIdMap(map) {
  try {
    localStorage.setItem(GCAL_SYNCED_MAP_KEY, JSON.stringify(map));
  } catch (e) {}
}

/**
 * Convert local Smart Note to Google Calendar API event resource
 */
function convertNoteToGCalEvent(note, categories = []) {
  const catObj = categories.find((c) => c.id === (note.categoryId || note.folderId));
  const categoryTitle = catObj?.title || "General";

  const dateStr = note.date || new Date().toISOString().split("T")[0];
  const timeStr = note.time || "12:00";
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  const startIso = `${dateStr}T${timeStr}:00`;
  
  // Calculate end time (+1 hour)
  let endIso = `${dateStr}T13:00:00`;
  try {
    const startObj = new Date(`${dateStr}T${timeStr}:00`);
    if (!isNaN(startObj.getTime())) {
      const endObj = new Date(startObj.getTime() + 60 * 60 * 1000);
      const endH = String(endObj.getHours()).padStart(2, "0");
      const endM = String(endObj.getMinutes()).padStart(2, "0");
      endIso = `${dateStr}T${endH}:${endM}:00`;
    }
  } catch (e) {}

  const descriptionText = [
    stripHtml(note.content || ""),
    `\n📂 Category: ${categoryTitle}`,
    `📊 Status: ${(note.status || "todo").toUpperCase()}`,
    `🌿 Synced from Smart Notes Workspace`
  ].filter(Boolean).join("\n");

  return {
    summary: `📝 ${note.title || "Untitled Note"}`,
    description: descriptionText,
    start: {
      dateTime: new Date(startIso).toISOString(),
      timeZone: userTimeZone,
    },
    end: {
      dateTime: new Date(endIso).toISOString(),
      timeZone: userTimeZone,
    },
    reminders: {
      useDefault: false,
      overrides: note.reminder
        ? [
            { method: "popup", minutes: 15 },
            { method: "popup", minutes: 0 }
          ]
        : [{ method: "popup", minutes: 10 }]
    }
  };
}

/**
 * PUSH: Export all dated notes directly into Google Calendar via Google Calendar REST API
 */
export async function pushNotesToGoogleCalendar(notes = [], categories = [], token = null) {
  const authToken = token || getGoogleToken();
  if (!authToken) {
    throw new Error("No Google account connected. Please sign in with Google.");
  }

  const datedNotes = notes.filter((n) => Boolean(n.title && n.title.trim() && n.date));
  if (datedNotes.length === 0) {
    return { pushedCount: 0, message: "No dated notes to sync." };
  }

  // If local simulator token, simulate instant sync
  if (authToken.startsWith("gauth_oauth2_") || authToken.startsWith("local_")) {
    updateLastCalendarSyncTime();
    return { pushedCount: datedNotes.length, totalDated: datedNotes.length, errors: [] };
  }

  const idMap = getSyncedIdMap();
  let pushedCount = 0;
  const errors = [];

  for (const note of datedNotes) {
    try {
      const gcalEvent = convertNoteToGCalEvent(note, categories);
      const existingGCalId = idMap[note.id];

      let url = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
      let method = "POST";

      if (existingGCalId) {
        url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${existingGCalId}`;
        method = "PUT";
      }

      const response = await fetch(url, {
        method: method,
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(gcalEvent)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.id) {
          idMap[note.id] = result.id;
          pushedCount++;
        }
      } else if (response.status === 404 && existingGCalId) {
        const recreateRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(gcalEvent)
        });
        if (recreateRes.ok) {
          const recResult = await recreateRes.json();
          idMap[note.id] = recResult.id;
          pushedCount++;
        }
      } else {
        const errText = await response.text();
        errors.push(`Note "${note.title}": ${response.status} ${errText}`);
      }
    } catch (err) {
      errors.push(`Note "${note.title}": ${err.message}`);
    }
  }

  saveSyncedIdMap(idMap);
  updateLastCalendarSyncTime();

  return {
    pushedCount,
    totalDated: datedNotes.length,
    errors
  };
}

/**
 * PULL: Fetch upcoming events from Google Calendar into Smart Notes format
 */
export async function pullEventsFromGoogleCalendar(token = null, existingNotes = []) {
  const authToken = token || getGoogleToken();
  if (!authToken) {
    throw new Error("No Google account connected. Please sign in with Google.");
  }

  if (authToken.startsWith("gauth_oauth2_") || authToken.startsWith("local_")) {
    updateLastCalendarSyncTime();
    return [];
  }

  const now = new Date();
  const timeMin = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days back
  const timeMax = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString(); // 60 days ahead

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=100`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Google Calendar events: ${response.statusText}`);
  }

  const data = await response.json();
  const items = data.items || [];
  const idMap = getSyncedIdMap();
  const existingGcalIds = new Set(Object.values(idMap));
  const existingTitles = new Set(existingNotes.map((n) => (n.title || "").trim().toLowerCase()));

  const newImportedNotes = [];

  for (const item of items) {
    if (existingGcalIds.has(item.id)) continue;

    const rawTitle = (item.summary || "Google Calendar Event").replace(/^📝\s*/, "").trim();
    if (existingTitles.has(rawTitle.toLowerCase())) continue;

    let eventDate = "";
    let eventTime = "12:00";

    if (item.start?.dateTime) {
      const dt = new Date(item.start.dateTime);
      eventDate = dt.toISOString().split("T")[0];
      eventTime = `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
    } else if (item.start?.date) {
      eventDate = item.start.date;
      eventTime = "09:00";
    }

    const noteId = `gcal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    idMap[noteId] = item.id;

    newImportedNotes.push({
      id: noteId,
      title: rawTitle,
      content: item.description || "Imported from Google Calendar",
      date: eventDate,
      time: eventTime,
      categoryId: "work",
      folderId: "work",
      color: "#2563eb",
      fontStyle: "sans-serif",
      fontSize: 16,
      isBold: false,
      isItalic: false,
      align: "left",
      reminder: true,
      status: "todo",
      x: 0,
      y: 0,
    });
  }

  saveSyncedIdMap(idMap);
  updateLastCalendarSyncTime();

  return newImportedNotes;
}

/**
 * ⚡ 1-CLICK COMPLETE 2-WAY GOOGLE CALENDAR SYNC
 */
export async function syncWithGoogleCalendar(notes = [], categories = [], token = null) {
  let authToken = token || getGoogleToken();

  if (!authToken) {
    try {
      const authResult = await loginWithGoogleOAuth();
      if (authResult && authResult.accessToken) {
        authToken = authResult.accessToken;
      }
    } catch (e) {
      return {
        success: false,
        needsAuth: true,
        message: "Please sign in with Google to enable 1-Click Calendar Sync."
      };
    }
  }

  try {
    const pushResult = await pushNotesToGoogleCalendar(notes, categories, authToken);
    const importedNotes = await pullEventsFromGoogleCalendar(authToken, notes);
    const timestamp = updateLastCalendarSyncTime();

    return {
      success: true,
      needsAuth: false,
      pushedCount: pushResult.pushedCount,
      importedCount: importedNotes.length,
      importedNotes: importedNotes,
      timestamp: timestamp,
      message: `✅ Synced with Google Calendar! (${pushResult.pushedCount} notes updated, ${importedNotes.length} new events received)`
    };
  } catch (error) {
    return {
      success: false,
      needsAuth: error.message.includes("token") || error.message.includes("401"),
      message: `Calendar Sync: ${error.message}`
    };
  }
}
