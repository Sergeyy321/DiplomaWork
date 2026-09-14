import React, { useState, useEffect } from "react";
import { 
  CalendarCheck,
  RefreshCw,
  X, 
  Clock, 
  Bell, 
  Filter,
  ExternalLink
} from "lucide-react";
import { 
  syncWithGoogleCalendar,
  getGoogleUserEmail,
  getLastCalendarSyncTime,
  isCalendarAutoSyncEnabled,
  setCalendarAutoSyncEnabled
} from "../../utils/googleCalendarService";
import { loginWithGoogleOAuth } from "../../utils/googleDriveService";
import "./CalendarSyncModal.css";

export default function CalendarSyncModal({
  isOpen,
  onClose,
  events = [],
  categories = [],
  onImportEvents,
  onOpenStorageSettings
}) {
  const [selectedCatFilter, setSelectedCatFilter] = useState("all");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [lastSync, setLastSync] = useState(() => getLastCalendarSyncTime());
  const [googleEmail, setGoogleEmail] = useState(() => getGoogleUserEmail());
  const [autoSync, setAutoSync] = useState(() => isCalendarAutoSyncEnabled());

  useEffect(() => {
    if (isOpen) {
      setLastSync(getLastCalendarSyncTime());
      setGoogleEmail(getGoogleUserEmail());
      setAutoSync(isCalendarAutoSyncEnabled());
      setSyncResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const datedEvents = events.filter((note) => Boolean(note.date));
  const filteredEvents = datedEvents.filter((note) => {
    return selectedCatFilter === "all" || (note.categoryId || note.folderId) === selectedCatFilter;
  });

  const handleGoogleSignIn = async () => {
    try {
      const auth = await loginWithGoogleOAuth();
      if (auth && auth.email) {
        setGoogleEmail(auth.email);
        handle1ClickSyncWithToken(auth.accessToken);
      }
    } catch (err) {
      console.warn("Google OAuth error:", err);
      setSyncResult({ success: false, message: err.message || "Google Sign-In failed" });
    }
  };

  const handle1ClickSyncWithToken = async (overrideToken = null) => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncWithGoogleCalendar(filteredEvents, categories, overrideToken);
      setSyncResult(result);
      if (result.success) {
        setLastSync(result.timestamp);
        if (result.importedNotes && result.importedNotes.length > 0 && onImportEvents) {
          onImportEvents(result.importedNotes);
        }
      } else if (result.needsAuth && onOpenStorageSettings) {
        onOpenStorageSettings();
      }
    } catch (e) {
      setSyncResult({ success: false, message: `Sync error: ${e.message}` });
    } finally {
      setIsSyncing(false);
    }
  };

  const handle1ClickSync = () => {
    handle1ClickSyncWithToken();
  };

  const handleToggleAutoSync = () => {
    const next = !autoSync;
    setAutoSync(next);
    setCalendarAutoSyncEnabled(next);
  };

  const handleOpenGoogleCalendarWeb = () => {
    window.open("https://calendar.google.com/calendar/r", "_blank", "noopener,noreferrer");
  };

  return (
    <div className="calendar-sync-backdrop" onClick={onClose}>
      <div className="calendar-sync-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="calendar-sync-header">
          <div className="calendar-sync-title-group">
            <div className="calendar-sync-icon-badge">
              <CalendarCheck size={20} color="#2563eb" />
            </div>
            <div>
              <h3 className="calendar-sync-title">Google Calendar 1-Click Sync</h3>
              <p className="calendar-sync-subtitle">
                Instantly synchronize all tasks, deadlines & reminders with Google Calendar
              </p>
            </div>
          </div>
          <button
            type="button"
            className="calendar-sync-close-btn"
            onClick={onClose}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Account Info Banner */}
        <div style={{ padding: "14px 20px", background: "var(--notion-sidebar, #f8fafc)", borderBottom: "1px solid var(--notion-border, #e2e8f0)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--notion-text, #1f1e1d)" }}>
              {googleEmail ? `Account: ${googleEmail}` : "Google Account"}
            </span>
            {googleEmail ? (
              <span style={{ fontSize: "11px", background: "rgba(16, 185, 129, 0.15)", color: "#10b981", padding: "2px 7px", borderRadius: "5px", fontWeight: "600" }}>
                ✓ Connected
              </span>
            ) : (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  fontSize: "11.5px",
                  fontWeight: "600",
                  cursor: "pointer",
                  color: "#1e293b"
                }}
              >
                <svg width="14" height="14" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Sign in with Google
              </button>
            )}
          </div>

          {lastSync && (
            <span style={{ fontSize: "11.5px", color: "var(--notion-secondary, #787774)" }}>
              Last sync: {new Date(lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        {/* Filter Controls Bar */}
        <div className="calendar-sync-filter-bar">
          <div className="calendar-sync-filter-group">
            <Filter size={13} color="var(--notion-secondary, #787774)" />
            <span className="calendar-sync-filter-label">Filter:</span>
            <select
              className="calendar-sync-select"
              value={selectedCatFilter}
              onChange={(e) => setSelectedCatFilter(e.target.value)}
            >
              <option value="all">🌟 All Categories ({datedEvents.length} dated notes)</option>
              {categories.map((c) => {
                const count = datedEvents.filter((e) => (e.categoryId || e.folderId) === c.id).length;
                return (
                  <option key={c.id} value={c.id}>
                    {c.title} ({count} notes)
                  </option>
                );
              })}
            </select>
          </div>

          <div style={{ fontSize: "12px", color: "var(--notion-secondary, #787774)", fontWeight: "500" }}>
            {filteredEvents.length} notes ready to sync
          </div>
        </div>

        {/* ⚡ 1-Click Sync Master Action Box */}
        <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: "12px", borderBottom: "1px solid var(--notion-border, #edece9)" }}>
          <button
            type="button"
            onClick={handle1ClickSync}
            disabled={isSyncing}
            style={{
              width: "100%",
              padding: "14px 20px",
              fontSize: "14px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              borderRadius: "8px",
              border: "none",
              background: isSyncing ? "#64748b" : "#2563eb",
              color: "#ffffff",
              cursor: isSyncing ? "wait" : "pointer",
              boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)",
              transition: "all 0.15s ease"
            }}
          >
            <RefreshCw size={17} className={isSyncing ? "spin-animation" : ""} />
            {isSyncing ? "Syncing with Google Calendar..." : "⚡ 1-Click Sync with Google Calendar"}
          </button>

          {syncResult && (
            <div style={{
              padding: "11px 14px",
              borderRadius: "8px",
              fontSize: "12.5px",
              fontWeight: "500",
              background: syncResult.success ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
              color: syncResult.success ? "#059669" : "#dc2626",
              border: `1px solid ${syncResult.success ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)"}`
            }}>
              {syncResult.message}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "6px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", cursor: "pointer", color: "var(--notion-text, #1f1e1d)" }}>
              <input
                type="checkbox"
                checked={autoSync}
                onChange={handleToggleAutoSync}
                style={{ cursor: "pointer" }}
              />
              <span>Auto-sync with Google Calendar on save</span>
            </label>

            <button
              type="button"
              onClick={handleOpenGoogleCalendarWeb}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                background: "transparent",
                border: "none",
                fontSize: "12px",
                color: "#2563eb",
                fontWeight: "500",
                cursor: "pointer"
              }}
            >
              <ExternalLink size={12} /> Open Google Calendar
            </button>
          </div>
        </div>

        {/* List of notes to sync */}
        <div className="calendar-sync-list-container">
          <div className="calendar-sync-list-title">
            Scheduled Notes in Workspace ({filteredEvents.length}):
          </div>

          {filteredEvents.length === 0 ? (
            <div className="calendar-sync-empty">
              No notes match the current filter.
            </div>
          ) : (
            <div className="calendar-sync-notes-grid">
              {filteredEvents.slice(0, 15).map((note) => {
                const catObj = categories.find((c) => c.id === (note.categoryId || note.folderId));
                return (
                  <div key={note.id} className="calendar-sync-note-card">
                    <div className="calendar-sync-note-top">
                      <span
                        className="calendar-sync-note-cat-badge"
                        style={{ backgroundColor: `${catObj?.color || "#4f46e5"}18`, color: catObj?.color || "#4f46e5" }}
                      >
                        {catObj?.title || "Work"}
                      </span>
                      {note.status && (
                        <span className={`calendar-sync-status-tag ${note.status}`}>
                          {note.status.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="calendar-sync-note-title">
                      {note.title || "Untitled Note"}
                    </div>
                    <div className="calendar-sync-note-meta">
                      <div className="calendar-sync-meta-item">
                        <Clock size={11} />
                        <span>{note.date} {note.time || "12:00"}</span>
                      </div>
                      {note.reminder && (
                        <div className="calendar-sync-meta-item" style={{ color: "#d97706" }}>
                          <Bell size={11} />
                          <span>Reminder</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
