import React, { useState, useEffect, useRef } from "react";
import { 
  X, 
  Settings, 
  Cpu, 
  Bell, 
  Sliders, 
  Download, 
  Key, 
  Volume2, 
  VolumeX, 
  Sparkles,
  CheckCircle2,
  AlertCircle,
  LayoutTemplate,
  AppWindow,
  Layers,
  Check,
  BookOpen,
  Target,
  Sun,
  Moon,
  FileText,
  Upload,
  Palette,
  CalendarCheck,
  RefreshCw,
  Smartphone,
  HardDrive,
  Cloud,
} from "lucide-react";
import A2MindMapCanvas from "./A2MindMapCanvas";
import { TAB_DEFINITIONS } from "./ChromeTabStrip";
import { exportWorkspaceBackupPdf } from "./exportBackupPdf";
import { 
  getNotificationPermissionStatus, 
  requestNotificationPermission, 
  sendNativeNotification,
  playMelodicChime
} from "../../utils/notificationService";
import {
  getStorageDestination,
  setStorageDestination,
  getActiveGoogleClientId,
  saveCustomGoogleClientId,
  downloadWorkspaceBackup,
  restoreWorkspaceData,
} from "../../utils/googleDriveService";
import {
  syncWithGoogleCalendar,
  getGoogleUserEmail,
  getLastCalendarSyncTime,
  isCalendarAutoSyncEnabled,
  setCalendarAutoSyncEnabled
} from "../../utils/googleCalendarService";
import { testDeepSeekConnection } from "../../services/aiApi";
import "./SettingsModal.css";

const EXTRA_TEMPLATES = [
  {
    id: "diploma-framework",
    title: "Diploma Project & Research Framework",
    desc: "A structured academic framework covering literature review, architecture design, experimental benchmarks, and thesis defense planning.",
    icon: BookOpen,
    badge: "Academic",
    categories: [
      { id: "lit-review", title: "1. Literature & State of Art", color: "#6366f1" },
      { id: "architecture", title: "2. System Architecture", color: "#3b82f6" },
      { id: "implementation", title: "3. Core Implementation", color: "#10b981" },
      { id: "evaluation", title: "4. Experiments & Benchmark", color: "#d97706" },
      { id: "writing", title: "5. Thesis Writing & Proofing", color: "#8b5cf6" },
      { id: "defense", title: "6. Slide Deck & Defense Prep", color: "#ec4899" },
    ],
    sampleNotes: [
      { title: "Analyze 5 related papers on NLP note extraction", categoryId: "lit-review", status: "done" },
      { title: "Design cross-screen event synchronization protocol", categoryId: "architecture", status: "in-progress" },
      { title: "Deploy AI Analyzer REST endpoints", categoryId: "implementation", status: "todo" },
      { title: "Run latency tests against DeepSeek API", categoryId: "evaluation", status: "todo" },
      { title: "Draft Section 3: Methodology and Design", categoryId: "writing", status: "todo" },
      { title: "Rehearse 10-minute presentation slides", categoryId: "defense", status: "todo" },
    ],
  },
  {
    id: "gtd-sprint",
    title: "Productivity Sprint & GTD Matrix",
    desc: "Get Things Done framework for managing high-impact weekly priorities, fast iterations, and daily focus blocks.",
    icon: Target,
    badge: "Productivity",
    categories: [
      { id: "backlog", title: "Inbox & Capture", color: "#64748b" },
      { id: "high-pri", title: "Top Priorities", color: "#ef4444" },
      { id: "quick-wins", title: "Quick Wins (<15m)", color: "#f59e0b" },
      { id: "in-review", title: "Under Review", color: "#3b82f6" },
      { id: "completed", title: "Done & Shipped", color: "#10b981" },
    ],
    sampleNotes: [
      { title: "Fix calendar mobile responsive layout", categoryId: "high-pri", status: "in-progress" },
      { title: "Export monthly backup to JSON", categoryId: "quick-wins", status: "done" },
      { title: "Draft user documentation guide", categoryId: "backlog", status: "todo" },
      { title: "Review AI analysis prompts", categoryId: "in-review", status: "todo" },
    ],
  },
];

export default function SettingsModal({
  isOpen,
  onClose,
  events = [],
  categories = [],
  soundEnabled = true,
  onToggleSound,
  activeTabs = ["calendar", "mindmap", "board", "ai-analyzer", "a2-map"],
  onToggleTab,
  initialTab = "templates",
  theme = "light",  
  onToggleTheme,
  onImportEvents,
  onOpenStorageChoice,
  onOpenInstallApp,
}) {
  const [activeTab, setActiveTab] = useState(initialTab || "templates");
  const [selectedTemplateView, setSelectedTemplateView] = useState("a2-map");
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("deepseek_custom_key") || "");
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem("deepseek_model") || "deepseek-chat");
  const [isKeySaved, setIsKeySaved] = useState(false);
  const [testStatus, setTestStatus] = useState(null);
  const [notifPerm, setNotifPerm] = useState(getNotificationPermissionStatus());
  const [testNotifSent, setTestNotifSent] = useState(false);
  const [currentStorageMode, setCurrentStorageMode] = useState(() => getStorageDestination() || "phone");
  const [storageStatusMsg, setStorageStatusMsg] = useState(null);
  const restoreFileRef = useRef(null);

  // ⚡ 1-Click Google Calendar Sync State
  const [googleClientId, setGoogleClientId] = useState(() => getActiveGoogleClientId());
  const [isClientIdSaved, setIsClientIdSaved] = useState(false);
  const [isCalendarSyncing, setIsCalendarSyncing] = useState(false);
  const [calendarSyncResult, setCalendarSyncResult] = useState(null);
  const [calendarAutoSync, setCalendarAutoSync] = useState(() => isCalendarAutoSyncEnabled());
  const [lastCalendarSync, setLastCalendarSync] = useState(() => getLastCalendarSyncTime());
  const [googleEmail, setGoogleEmail] = useState(() => getGoogleUserEmail());

  const handleOneClickCalendarSync = async () => {
    setIsCalendarSyncing(true);
    setCalendarSyncResult(null);
    try {
      const result = await syncWithGoogleCalendar(events, categories);
      setCalendarSyncResult(result);
      if (result.success) {
        setLastCalendarSync(result.timestamp);
        if (result.importedNotes && result.importedNotes.length > 0 && onImportEvents) {
          onImportEvents(result.importedNotes);
        }
      } else if (result.needsAuth) {
        if (onOpenStorageChoice) {
          onOpenStorageChoice();
        }
      }
    } catch (e) {
      setCalendarSyncResult({ success: false, message: `Sync failed: ${e.message}` });
    } finally {
      setIsCalendarSyncing(false);
    }
  };

  const handleToggleCalendarAutoSync = () => {
    const next = !calendarAutoSync;
    setCalendarAutoSync(next);
    setCalendarAutoSyncEnabled(next);
  };

  useEffect(() => {
    if (isOpen) {
      setApiKey(localStorage.getItem("deepseek_custom_key") || "");
      setSelectedModel(localStorage.getItem("deepseek_model") || "deepseek-chat");
      setIsKeySaved(false);
      setTestStatus(null);
      setNotifPerm(getNotificationPermissionStatus());
      setCurrentStorageMode(getStorageDestination() || "phone");
      setGoogleClientId(getActiveGoogleClientId());
      setLastCalendarSync(getLastCalendarSyncTime());
      setGoogleEmail(getGoogleUserEmail());
      setCalendarAutoSync(isCalendarAutoSyncEnabled());
      if (initialTab) setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleSaveGoogleClientId = () => {
    saveCustomGoogleClientId(googleClientId);
    setIsClientIdSaved(true);
    setStorageStatusMsg({
      type: "success",
      text: "✅ Google OAuth Client ID saved successfully!"
    });
    setTimeout(() => {
      setIsClientIdSaved(false);
      setStorageStatusMsg(null);
    }, 3500);
  };

  const handleSaveApiKey = () => {
    localStorage.setItem("deepseek_custom_key", apiKey.trim());
    localStorage.setItem("deepseek_model", selectedModel);
    setIsKeySaved(true);
    setTimeout(() => setIsKeySaved(false), 2500);
  };

  const handleTestConnection = async () => {
    setTestStatus("testing");
    try {
      await testDeepSeekConnection(apiKey, selectedModel);
      setTestStatus("success");
    } catch (err) {
      console.warn("DeepSeek test error:", err);
      setTestStatus("error");
    }
    setTimeout(() => setTestStatus(null), 5000);
  };

  const handleSwitchStorageMode = (mode) => {
    setCurrentStorageMode(mode);
    setStorageDestination(mode);
    setStorageStatusMsg({
      type: "success",
      text: mode === "phone"
        ? "📱 Storage mode switched to Phone (Local Device)."
        : "☁️ Storage mode switched to Google Drive (Cloud Sync)."
    });
    setTimeout(() => setStorageStatusMsg(null), 3000);
  };

  const handleDownloadFullBackup = () => {
    try {
      const fn = downloadWorkspaceBackup();
      setStorageStatusMsg({
        type: "success",
        text: `✅ Exported full backup: ${fn}`
      });
      setTimeout(() => setStorageStatusMsg(null), 4000);
    } catch (e) {
      setStorageStatusMsg({
        type: "error",
        text: "Failed to download backup."
      });
    }
  };

  const handleRestoreJsonFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result);
        restoreWorkspaceData(json);
        setStorageStatusMsg({
          type: "success",
          text: "🎉 Workspace successfully restored from backup!"
        });
        setTimeout(() => setStorageStatusMsg(null), 4000);
      } catch (err) {
        setStorageStatusMsg({
          type: "error",
          text: "Invalid backup JSON file."
        });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleExportCleanPdf = () => {
    exportWorkspaceBackupPdf({
      events,
      categories,
      activeTabs,
      workspaceName: "Personal Workspace",
    });
  };

  return (
    <div className="notion-settings-backdrop" onClick={onClose}>
      <div className="notion-settings-modal" onClick={(e) => e.stopPropagation()}>
        {/* Top Header */}
        <div className="notion-settings-header">
          <div className="notion-settings-title">
            <Settings size={16} />
            <span>Workspace & Canvas Settings</span>
          </div>
          <button type="button" className="notion-settings-close" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>

        <div className="notion-settings-body">
          {/* Left Navigation */}
          <div className="notion-settings-nav">
            <button
              type="button"
              className={`notion-settings-nav-item ${activeTab === "storage" ? "is-active" : ""}`}
              onClick={() => setActiveTab("storage")}
            >
              <HardDrive size={14} />
              <span>Storage & Cloud</span>
            </button>
            <button
              type="button"
              className={`notion-settings-nav-item ${activeTab === "calendar-sync" ? "is-active" : ""}`}
              onClick={() => setActiveTab("calendar-sync")}
            >
              <CalendarCheck size={14} color="#2563eb" />
              <span>Google Calendar Sync</span>
            </button>
            <button
              type="button"
              className={`notion-settings-nav-item ${activeTab === "templates" ? "is-active" : ""}`}
              onClick={() => setActiveTab("templates")}
            >
              <LayoutTemplate size={14} />
              <span>Templates</span>
            </button>
            <button
              type="button"
              className={`notion-settings-nav-item ${activeTab === "tabs" ? "is-active" : ""}`}
              onClick={() => setActiveTab("tabs")}
            >
              <AppWindow size={14} />
              <span>Tabs Manager</span>
            </button>
            <button
              type="button"
              className={`notion-settings-nav-item ${activeTab === "theme" ? "is-active" : ""}`}
              onClick={() => setActiveTab("theme")}
            >
              <Palette size={14} />
              <span>Theme & Appearance</span>
            </button>
            <button
              type="button"
              className={`notion-settings-nav-item ${activeTab === "ai" ? "is-active" : ""}`}
              onClick={() => setActiveTab("ai")}
            >
              <Cpu size={14} />
              <span>DeepSeek AI</span>
            </button>
            <button
              type="button"
              className={`notion-settings-nav-item ${activeTab === "notifications" ? "is-active" : ""}`}
              onClick={() => setActiveTab("notifications")}
            >
              <Bell size={14} />
              <span>Notifications & Audio</span>
            </button>
            <button
              type="button"
              className={`notion-settings-nav-item ${activeTab === "data" ? "is-active" : ""}`}
              onClick={() => setActiveTab("data")}
            >
              <Sliders size={14} />
              <span>Data & Backup</span>
            </button>
          </div>

          {/* Right Content */}
          <div className="notion-settings-content">
            {/* =========================================================
                TAB 0: STORAGE & CLOUD (Phone vs Google Drive)
                ========================================================= */}
            {activeTab === "storage" && (
              <div className="notion-settings-section">
                <h4 className="notion-settings-sec-title">Storage Destination & Multi-Device Sync</h4>
                <p className="notion-settings-sec-desc">
                  Choose where your notes and mind maps are stored: directly on this device (offline-first) or synchronized via Google Drive.
                </p>

                {storageStatusMsg && (
                  <div style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    marginBottom: "16px",
                    fontSize: "12px",
                    fontWeight: "500",
                    background: storageStatusMsg.type === "success" ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
                    color: storageStatusMsg.type === "success" ? "#059669" : "#dc2626",
                    border: `1px solid ${storageStatusMsg.type === "success" ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)"}`
                  }}>
                    {storageStatusMsg.text}
                  </div>
                )}

                {/* 2 Mode Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "20px" }}>
                  {/* Mode 1: Phone */}
                  <div 
                    style={{
                      border: currentStorageMode === "phone" ? "2px solid #10b981" : "1px solid var(--notion-border, #edece9)",
                      background: currentStorageMode === "phone" ? "rgba(16, 185, 129, 0.04)" : "var(--notion-plate, #f7f7f5)",
                      borderRadius: "12px",
                      padding: "16px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px"
                    }}
                    onClick={() => handleSwitchStorageMode("phone")}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: 32, height: 32, borderRadius: "8px", background: "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981" }}>
                          <Smartphone size={18} />
                        </div>
                        <strong style={{ fontSize: "13px", color: "var(--notion-text, #1f1e1d)" }}>On Phone (Local)</strong>
                      </div>
                      {currentStorageMode === "phone" && <CheckCircle2 size={16} color="#10b981" />}
                    </div>
                    <p style={{ margin: 0, fontSize: "11.5px", color: "var(--notion-secondary, #787774)", lineHeight: "1.4" }}>
                      Saved only on this device. Fast, zero setup, 100% private, and works offline anywhere.
                    </p>
                    <button
                      type="button"
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        fontSize: "11.5px",
                        fontWeight: "600",
                        border: "none",
                        background: currentStorageMode === "phone" ? "#10b981" : "var(--notion-card, #ffffff)",
                        color: currentStorageMode === "phone" ? "#ffffff" : "var(--notion-text, #1f1e1d)",
                        cursor: "pointer"
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSwitchStorageMode("phone");
                      }}
                    >
                      {currentStorageMode === "phone" ? "✓ Active (Phone)" : "Select Phone"}
                    </button>
                  </div>

                  {/* Mode 2: Google Drive */}
                  <div 
                    style={{
                      border: currentStorageMode === "gdrive" ? "2px solid #3b82f6" : "1px solid var(--notion-border, #edece9)",
                      background: currentStorageMode === "gdrive" ? "rgba(59, 130, 246, 0.04)" : "var(--notion-plate, #f7f7f5)",
                      borderRadius: "12px",
                      padding: "16px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px"
                    }}
                    onClick={() => handleSwitchStorageMode("gdrive")}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: 32, height: 32, borderRadius: "8px", background: "rgba(59, 130, 246, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#3b82f6" }}>
                          <Cloud size={18} />
                        </div>
                        <strong style={{ fontSize: "13px", color: "var(--notion-text, #1f1e1d)" }}>Google Drive (Cloud)</strong>
                      </div>
                      {currentStorageMode === "gdrive" && <CheckCircle2 size={16} color="#3b82f6" />}
                    </div>
                    <p style={{ margin: 0, fontSize: "11.5px", color: "var(--notion-secondary, #787774)", lineHeight: "1.4" }}>
                      Synchronize across Phone & PC. Backup files to cloud storage safely with 1-tap restore.
                    </p>
                    <button
                      type="button"
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        fontSize: "11.5px",
                        fontWeight: "600",
                        border: "none",
                        background: currentStorageMode === "gdrive" ? "#3b82f6" : "var(--notion-card, #ffffff)",
                        color: currentStorageMode === "gdrive" ? "#ffffff" : "var(--notion-text, #1f1e1d)",
                        cursor: "pointer"
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSwitchStorageMode("gdrive");
                      }}
                    >
                      {currentStorageMode === "gdrive" ? "✓ Active (Google Drive)" : "Select Google Drive"}
                    </button>
                  </div>
                </div>

                {/* Google Cloud Client ID Configuration */}
                <div style={{
                  background: "var(--notion-plate, #f9f9f8)",
                  border: "1px solid var(--notion-border, #e5e5e5)",
                  borderRadius: "10px",
                  padding: "14px 16px",
                  marginBottom: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Cloud size={16} color="#3b82f6" />
                      <strong style={{ fontSize: "13px", color: "var(--notion-text, #1f1e1d)" }}>Google Cloud OAuth Client ID</strong>
                    </div>
                    <span style={{ fontSize: "11px", color: googleClientId ? "#059669" : "#dc2626", fontWeight: "600", background: googleClientId ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)", padding: "2px 8px", borderRadius: "6px" }}>
                      {googleClientId ? "✓ Configured" : "⚠️ Not Set"}
                    </span>
                  </div>

                  <p style={{ margin: 0, fontSize: "11.5px", color: "var(--notion-secondary, #787774)", lineHeight: "1.4" }}>
                    Enter your OAuth 2.0 Web Client ID from Google Cloud Console:
                  </p>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="text"
                      value={googleClientId}
                      onChange={(e) => setGoogleClientId(e.target.value)}
                      placeholder="e.g. xxxxxxxxxxxx-xxxxxxxx.apps.googleusercontent.com"
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid var(--notion-border, #d1d5db)",
                        fontSize: "12px",
                        fontFamily: "monospace",
                        background: "var(--notion-card, #ffffff)",
                        color: "var(--notion-text, #1f2937)"
                      }}
                    />
                    <button
                      type="button"
                      className="notion-settings-btn-primary"
                      onClick={handleSaveGoogleClientId}
                      style={{ whiteSpace: "nowrap" }}
                    >
                      {isClientIdSaved ? "✓ Saved" : "Save ID"}
                    </button>
                  </div>

                  <div style={{
                    background: "rgba(59, 130, 246, 0.08)",
                    border: "1px solid rgba(59, 130, 246, 0.2)",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    fontSize: "11.5px",
                    color: "#1e40af",
                    lineHeight: "1.45"
                  }}>
                    <strong>💡 Важно для работы входа:</strong> В <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" style={{ color: "#2563eb", fontWeight: "600" }}>Google Cloud Console</a> в настройках этого OAuth Client ID в разделе <em>«Authorized JavaScript origins»</em> должен быть добавлен текущий адрес сайта: <code style={{ background: "#ffffff", padding: "1px 5px", borderRadius: "4px", border: "1px solid rgba(59, 130, 246, 0.3)" }}>{typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}</code>
                  </div>
                </div>

                {/* Storage Utilities */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div className="notion-backup-action-card">
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div className="notion-backup-icon-box" style={{ background: "rgba(79, 70, 229, 0.12)", color: "#4f46e5" }}>
                        <Download size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: "600", fontSize: "13px", color: "var(--notion-text, #1f1e1d)" }}>
                          Export Full Workspace (.json)
                        </div>
                        <div className="notion-settings-hint">
                          Downloads all notes, categories, mind maps, and knowledge trees into a single portable backup file.
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="notion-settings-btn-primary"
                      onClick={handleDownloadFullBackup}
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}
                    >
                      <Download size={13} /> Export Backup
                    </button>
                  </div>

                  <div className="notion-backup-action-card">
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div className="notion-backup-icon-box" style={{ background: "rgba(16, 185, 129, 0.12)", color: "#10b981" }}>
                        <Upload size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: "600", fontSize: "13px", color: "var(--notion-text, #1f1e1d)" }}>
                          Restore Workspace from Backup (.json)
                        </div>
                        <div className="notion-settings-hint">
                          Upload a previously saved SmartNotes JSON backup to restore all data immediately.
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="notion-settings-btn-secondary"
                      onClick={() => restoreFileRef.current?.click()}
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}
                    >
                      <Upload size={13} /> Restore JSON
                    </button>
                    <input
                      ref={restoreFileRef}
                      type="file"
                      accept=".json,application/json"
                      style={{ display: "none" }}
                      onChange={handleRestoreJsonFile}
                    />
                  </div>

                  {/* Install App Banner */}
                  <div className="notion-backup-action-card" style={{ background: "linear-gradient(135deg, rgba(79, 70, 229, 0.05), rgba(124, 58, 237, 0.05))", borderColor: "rgba(79, 70, 229, 0.2)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div className="notion-backup-icon-box" style={{ background: "rgba(79, 70, 229, 0.12)", color: "#4f46e5" }}>
                        <Smartphone size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: "600", fontSize: "13px", color: "var(--notion-text, #1f1e1d)" }}>
                          Install App on iPhone or Android
                        </div>
                        <div className="notion-settings-hint">
                          Add Smart Notes to your phone home screen for full-screen offline access.
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="notion-settings-btn-primary"
                      onClick={() => {
                        onClose();
                        if (onOpenInstallApp) onOpenInstallApp();
                      }}
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}
                    >
                      <Download size={13} /> Install App
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================
                TAB 1: TEMPLATES
                ========================================================= */}
            {activeTab === "templates" && (
              <div className="notion-settings-section">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
                  <div>
                    <h4 className="notion-settings-sec-title">Templates</h4>
                    <p className="notion-settings-sec-desc">
                      Select and customize high-resolution templates, including the A2 Paper Format 6-Sector Radial Mind Map.
                    </p>
                  </div>

                  {/* Template Sub-switcher */}
                  <div className="notion-template-pill-selector">
                    <button
                      type="button"
                      className={`notion-template-pill ${selectedTemplateView === "a2-map" ? "is-active" : ""}`}
                      onClick={() => setSelectedTemplateView("a2-map")}
                    >
                      <Layers size={12} /> A2 Mind Map (6 Sectors)
                    </button>
                    <button
                      type="button"
                      className={`notion-template-pill ${selectedTemplateView === "extra" ? "is-active" : ""}`}
                      onClick={() => setSelectedTemplateView("extra")}
                    >
                      <LayoutTemplate size={12} /> Other Samples
                    </button>
                  </div>
                </div>

                {/* Subview 1: Full A2 Mind Map Studio */}
                {selectedTemplateView === "a2-map" && (
                  <div style={{ marginTop: "10px", width: "100%" }}>
                    <A2MindMapCanvas />
                  </div>
                )}

                {/* Subview 2: Ready-to-use Professional Templates */}
                {selectedTemplateView === "extra" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "12px" }}>
                    {EXTRA_TEMPLATES.map((tmpl) => {
                      const Icon = tmpl.icon;
                      return (
                        <div key={tmpl.id} className="notion-extra-template-card">
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                              <div className="notion-extra-template-icon-wrap">
                                <Icon size={20} />
                              </div>
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                  <h5 style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "var(--notion-text, #1f1e1d)" }}>
                                    {tmpl.title}
                                  </h5>
                                  <span className="notion-extra-template-badge">{tmpl.badge}</span>
                                </div>
                                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--notion-secondary, #787774)", lineHeight: "1.4" }}>
                                  {tmpl.desc}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Categories Preview */}
                          <div style={{ marginTop: "12px" }}>
                            <div style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--notion-secondary, #9b9a97)", marginBottom: "6px" }}>
                              Included Categories ({tmpl.categories.length})
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                              {tmpl.categories.map((c) => (
                                <span
                                  key={c.id}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "5px",
                                    fontSize: "11.5px",
                                    padding: "3px 8px",
                                    borderRadius: "4px",
                                    background: "var(--notion-plate, #f7f7f5)",
                                    border: "1px solid var(--notion-border, #edece9)",
                                    color: "var(--notion-text, #37352f)",
                                  }}
                                >
                                  <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: c.color }} />
                                  {c.title}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* =========================================================
                TAB 2: TABS MANAGER
                ========================================================= */}
            {activeTab === "tabs" && (
              <div className="notion-settings-section">
                <h4 className="notion-settings-sec-title">Tabs Manager</h4>
                <p className="notion-settings-sec-desc">
                  Enable, disable, and rearrange which navigation tabs appear on your main Chrome-style tab strip.
                </p>

                <div className="notion-settings-toggle-list">
                  {TAB_DEFINITIONS.map((tab) => {
                    const isActive = activeTabs.includes(tab.id);
                    const isLastOne = activeTabs.length === 1 && isActive;
                    const Icon = tab.icon;

                    return (
                      <div key={tab.id} className="notion-settings-toggle-row">
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div className="notion-tab-def-icon-box" style={{ color: tab.color }}>
                            <Icon size={16} />
                          </div>
                          <div>
                            <div className="notion-settings-toggle-label">{tab.label}</div>
                            <div className="notion-settings-hint">{tab.desc}</div>
                          </div>
                        </div>

                        <button
                          type="button"
                          className={`notion-settings-switch ${isActive ? "is-on" : ""}`}
                          disabled={isLastOne}
                          onClick={() => onToggleTab(tab.id)}
                          title={isLastOne ? "At least one tab must remain active" : "Toggle tab"}
                        >
                          {isActive && <Check size={12} strokeWidth={3} />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* =========================================================
                TAB 3: THEME & APPEARANCE
                ========================================================= */}
            {activeTab === "theme" && (
              <div className="notion-settings-section">
                <h4 className="notion-settings-sec-title">Theme & Visual Mode</h4>
                <p className="notion-settings-sec-desc">
                  Customize the overall aesthetic between clean Notion light mode or modern midnight dark mode.
                </p>

                <div className="notion-theme-selection-grid">
                  <div
                    className={`notion-theme-card ${theme === "light" ? "is-selected" : ""}`}
                    onClick={() => onToggleTheme("light")}
                  >
                    <div className="notion-theme-preview notion-theme-preview--light">
                      <div className="preview-nav" />
                      <div className="preview-body">
                        <div className="preview-line w-80" />
                        <div className="preview-line w-50" />
                        <div className="preview-box" />
                      </div>
                    </div>
                    <div className="notion-theme-card-info">
                      <div className="notion-theme-card-title">
                        <Sun size={14} color="#f59e0b" /> Light Theme
                      </div>
                      <div className="notion-theme-card-desc">Warm Notion paper style</div>
                    </div>
                  </div>

                  <div
                    className={`notion-theme-card ${theme === "dark" ? "is-selected" : ""}`}
                    onClick={() => onToggleTheme("dark")}
                  >
                    <div className="notion-theme-preview notion-theme-preview--dark">
                      <div className="preview-nav" />
                      <div className="preview-body">
                        <div className="preview-line w-80" />
                        <div className="preview-line w-50" />
                        <div className="preview-box" />
                      </div>
                    </div>
                    <div className="notion-theme-card-info">
                      <div className="notion-theme-card-title">
                        <Moon size={14} color="#6366f1" /> Dark Theme
                      </div>
                      <div className="notion-theme-card-desc">Midnight high-contrast dark</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================
                TAB 4: DEEPSEEK AI
                ========================================================= */}
            {activeTab === "ai" && (
              <div className="notion-settings-section">
                <h4 className="notion-settings-sec-title">DeepSeek AI Configuration</h4>
                <p className="notion-settings-sec-desc">
                  Configure your DeepSeek API key for automated note analysis, action-item extraction, and smart PDF parsing.
                </p>

                <div className="notion-settings-field">
                  <label>
                    <Key size={13} style={{ marginRight: 4 }} />
                    DeepSeek API Key
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="password"
                      placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="notion-settings-input"
                    />
                    <button
                      type="button"
                      className="notion-settings-btn-primary"
                      onClick={handleSaveApiKey}
                    >
                      {isKeySaved ? "Saved!" : "Save Key"}
                    </button>
                  </div>
                  <span className="notion-settings-hint">
                    You can also set <code>DEEPSEEK_API_KEY</code> directly in <code>.env</code>.
                  </span>
                </div>

                <div className="notion-settings-field">
                  <label>
                    <Sparkles size={13} style={{ marginRight: 4 }} />
                    DeepSeek Model
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="notion-settings-select"
                  >
                    <option value="deepseek-chat">deepseek-chat (Fast & General Analysis)</option>
                    <option value="deepseek-reasoner">deepseek-reasoner (Deep Reasoning R1)</option>
                  </select>
                </div>

                <div style={{ marginTop: "14px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <button
                    type="button"
                    className="notion-settings-btn-secondary"
                    onClick={handleTestConnection}
                    disabled={testStatus === "testing"}
                  >
                    {testStatus === "testing" ? "Testing..." : "Test AI Server Connection"}
                  </button>

                  {testStatus === "success" && (
                    <span style={{ color: "#10b981", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <CheckCircle2 size={14} /> AI Server Connected (Port 3001)
                    </span>
                  )}
                  {testStatus === "error" && (
                    <span style={{ color: "#ef4444", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <AlertCircle size={14} /> Server offline or local heuristic mode active
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* =========================================================
                TAB 5: NOTIFICATIONS
                ========================================================= */}
            {activeTab === "notifications" && (
              <div className="notion-settings-section">
                <h4 className="notion-settings-sec-title">Notifications & System Alerts</h4>
                <p className="notion-settings-sec-desc">
                  Configure native system alerts on PC (Windows / Mac) and Mobile (Android / iOS).
                </p>

                {/* System Push Notifications Row */}
                <div className="notion-settings-toggle-row">
                  <div>
                    <div className="notion-settings-toggle-label">Native Desktop & Mobile Notifications</div>
                    <div className="notion-settings-hint">
                      Show real OS banner popups when your scheduled note reminders trigger.
                    </div>
                    <div style={{ marginTop: "6px", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                      Permission Status: 
                      {notifPerm === "granted" ? (
                        <span style={{ color: "#10b981", fontWeight: 600 }}>Active (Granted) ✅</span>
                      ) : notifPerm === "denied" ? (
                        <span style={{ color: "#ef4444", fontWeight: 600 }}>Blocked in browser ❌</span>
                      ) : (
                        <span style={{ color: "#d97706", fontWeight: 600 }}>Permission Needed ⚠️</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    {notifPerm !== "granted" ? (
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await requestNotificationPermission();
                          setNotifPerm(res);
                          if (res === "granted") {
                            await sendNativeNotification("🔔 Notifications Enabled!", {
                              body: "You will now receive native reminders on this device.",
                            });
                          }
                        }}
                        style={{
                          background: "#4f46e5",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "6px",
                          padding: "7px 14px",
                          fontSize: "12px",
                          fontWeight: "500",
                          cursor: "pointer",
                        }}
                      >
                        {notifPerm === "denied" ? "Try Requesting Again" : "Enable Notifications"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => {
                          playMelodicChime();
                          await sendNativeNotification("🔔 Real System Notification Test", {
                            body: "Native notifications are working properly on your device!",
                            tag: "test-notification-" + Date.now(),
                          });
                          setTestNotifSent(true);
                          setTimeout(() => setTestNotifSent(false), 3000);
                        }}
                        style={{
                          background: "var(--notion-plate, #f7f7f5)",
                          color: "var(--notion-text, #37352f)",
                          border: "1px solid var(--notion-border, #edece9)",
                          borderRadius: "6px",
                          padding: "7px 14px",
                          fontSize: "12px",
                          fontWeight: "500",
                          cursor: "pointer",
                        }}
                      >
                        {testNotifSent ? "Sent! 🚀" : "Send Test Notification"}
                      </button>
                    )}
                  </div>
                </div>

                {notifPerm === "denied" && (
                  <div style={{ marginTop: "10px", padding: "10px 14px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "6px", fontSize: "12px", color: "var(--notion-text, #37352f)" }}>
                    <strong style={{ color: "#ef4444" }}>⚠️ Browser Notifications are Blocked:</strong>
                    <div style={{ marginTop: "4px", lineHeight: "1.5" }}>
                      To allow alerts on this device, click the <strong>lock / site settings icon (🔒)</strong> on the left side of your browser address bar next to <code>http://localhost:3000</code>, change <strong>Notifications</strong> to <strong>Allow</strong>, and refresh the tab.
                    </div>
                  </div>
                )}

                {/* Reminder Audio Chimes Row */}
                <div className="notion-settings-toggle-row" style={{ marginTop: "14px" }}>
                  <div>
                    <div className="notion-settings-toggle-label">Reminder Audio Chimes</div>
                    <div className="notion-settings-hint">Play a subtle sine-wave chime when a task is due.</div>
                  </div>
                  <button
                    type="button"
                    className={`notion-settings-switch ${soundEnabled ? "is-on" : ""}`}
                    onClick={onToggleSound}
                  >
                    {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                  </button>
                </div>

                {/* Device Compatibility Guide Box */}
                <div style={{ marginTop: "20px", background: "var(--notion-sidebar, #f7f7f5)", border: "1px solid var(--notion-border, #edece9)", borderRadius: "8px", padding: "14px 16px" }}>
                  <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: "var(--notion-text, #37352f)" }}>
                    📱 How Native Notifications Work on PC & Mobile:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", lineHeight: "1.6", color: "var(--notion-secondary, #787774)" }}>
                    <li><strong>PC (Windows / Mac / Linux):</strong> Notifications pop up in your Windows Action Center or Mac Notification Banner.</li>
                    <li><strong>Android Phone:</strong> Chrome / Samsung Internet shows notification banners in the system notification tray.</li>
                    <li><strong>iPhone (iOS 16.4+):</strong> In Safari, tap <em>Share ➔ Add to Home Screen</em> to install as an App, then grant notifications in iOS Settings.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* =========================================================
                TAB 6: GOOGLE CALENDAR SYNC (1-Click Real-Time Engine)
                ========================================================= */}
            {activeTab === "calendar-sync" && (
              <div className="notion-settings-section">
                <h4 className="notion-settings-sec-title">Google Calendar 1-Click Synchronization</h4>
                <p className="notion-settings-sec-desc">
                  Directly synchronize your notes, deadlines, and scheduled events with Google Calendar in 1 click without any manual files.
                </p>

                {/* Account Status Card */}
                <div style={{ padding: "16px", borderRadius: "10px", background: "var(--notion-plate, #f7f7f5)", border: "1px solid var(--notion-border, #edece9)", marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: 36, height: 36, borderRadius: "8px", background: "rgba(37, 99, 235, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563eb" }}>
                        <CalendarCheck size={20} />
                      </div>
                      <div>
                        <div style={{ fontWeight: "600", fontSize: "13.5px", color: "var(--notion-text, #1f1e1d)" }}>
                          {googleEmail ? `Google Account: ${googleEmail}` : "Google Calendar Integration"}
                        </div>
                        <div style={{ fontSize: "11.5px", color: "var(--notion-secondary, #787774)" }}>
                          {googleEmail ? "Ready for 1-click two-way calendar sync" : "Connect Google Account via Storage Settings to sync in real-time"}
                        </div>
                      </div>
                    </div>
                    {googleEmail ? (
                      <span style={{ fontSize: "11.5px", background: "rgba(16, 185, 129, 0.15)", color: "#10b981", padding: "4px 8px", borderRadius: "6px", fontWeight: "600" }}>
                        ✓ Connected
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={onOpenStorageChoice}
                        style={{
                          fontSize: "12px",
                          fontWeight: "600",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          background: "#2563eb",
                          color: "#fff",
                          border: "none",
                          cursor: "pointer"
                        }}
                      >
                        Connect Google
                      </button>
                    )}
                  </div>

                  {lastCalendarSync && (
                    <div style={{ fontSize: "11.5px", color: "var(--notion-secondary, #787774)", marginTop: "8px", borderTop: "1px dashed var(--notion-border, #edece9)", paddingTop: "6px" }}>
                      🕒 Last synchronized: <strong>{new Date(lastCalendarSync).toLocaleString()}</strong>
                    </div>
                  )}
                </div>

                {/* ⚡ 1-Click Sync Big Action Button */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
                  <button
                    type="button"
                    onClick={handleOneClickCalendarSync}
                    disabled={isCalendarSyncing}
                    style={{
                      padding: "13px 22px",
                      fontSize: "13.5px",
                      fontWeight: "600",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "10px",
                      borderRadius: "8px",
                      border: "none",
                      background: isCalendarSyncing ? "#64748b" : "#2563eb",
                      color: "#ffffff",
                      cursor: isCalendarSyncing ? "wait" : "pointer",
                      boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)",
                      transition: "background 0.15s"
                    }}
                  >
                    <RefreshCw size={16} className={isCalendarSyncing ? "spin-animation" : ""} />
                    {isCalendarSyncing ? "Synchronizing with Google Calendar..." : "⚡ 1-Click Sync with Google Calendar"}
                  </button>

                  {/* Sync Status Banner */}
                  {calendarSyncResult && (
                    <div style={{
                      padding: "11px 14px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: "500",
                      background: calendarSyncResult.success ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
                      color: calendarSyncResult.success ? "#059669" : "#dc2626",
                      border: `1px solid ${calendarSyncResult.success ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)"}`
                    }}>
                      {calendarSyncResult.message}
                    </div>
                  )}
                </div>

                {/* Auto-Sync Toggle */}
                <div className="notion-settings-toggle-row" style={{ marginTop: "10px" }}>
                  <div>
                    <div className="notion-settings-toggle-label">Background Auto-Sync on Save</div>
                    <div className="notion-settings-hint">
                      Automatically update Google Calendar whenever you create or edit notes with dates and times.
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`notion-settings-switch ${calendarAutoSync ? "is-on" : ""}`}
                    onClick={handleToggleCalendarAutoSync}
                  >
                    <Check size={12} />
                  </button>
                </div>

                {/* Info Guide */}
                <div style={{ marginTop: "18px", background: "var(--notion-sidebar, #f7f7f5)", border: "1px solid var(--notion-border, #edece9)", borderRadius: "8px", padding: "14px 16px" }}>
                  <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: "var(--notion-text, #37352f)" }}>
                    ✨ How 1-Click Sync Works:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", lineHeight: "1.6", color: "var(--notion-secondary, #787774)" }}>
                    <li><strong>Push:</strong> Automatically adds and updates all scheduled notes and reminders in your Google Calendar.</li>
                    <li><strong>Pull:</strong> Imports upcoming calendar events from Google directly into your workspace.</li>
                    <li><strong>Zero Hassle:</strong> No need to download, export or import manual files.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* =========================================================
                TAB 7: DATA & BACKUP (Clean PDF Backup & Archives)
                ========================================================= */}
            {activeTab === "data" && (
              <div className="notion-settings-section">
                <h4 className="notion-settings-sec-title">Workspace Data & Backup</h4>
                <p className="notion-settings-sec-desc">
                  Generate clean PDF archives organized by topic, or export workspace snapshot.
                </p>

                <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
                  <div className="notion-settings-stat-card">
                    <span className="notion-settings-stat-val">{events.length}</span>
                    <span className="notion-settings-stat-lbl">Total Notes</span>
                  </div>
                  <div className="notion-settings-stat-card">
                    <span className="notion-settings-stat-val">{categories.length}</span>
                    <span className="notion-settings-stat-lbl">Categories / Topics</span>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {/* Clean PDF Backup Option */}
                  <div className="notion-backup-action-card">
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div className="notion-backup-icon-box notion-backup-icon-box--pdf">
                        <FileText size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: "600", fontSize: "13px", color: "var(--notion-text, #1f1e1d)" }}>
                          Download Clean PDF Backup (Notes Grouped by Topic)
                        </div>
                        <div className="notion-settings-hint">
                          Cleanly formatted, printable document with notes organized by category/topic.
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="notion-settings-btn-primary"
                      onClick={handleExportCleanPdf}
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}
                    >
                      <Download size={13} /> Download PDF Backup
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
