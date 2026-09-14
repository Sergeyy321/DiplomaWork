import React, { useState } from "react";
import { 
  Calendar as CalendarIcon, 
  Trees, 
  Kanban, 
  Network, 
  MoreHorizontal, 
  Plus, 
  Sparkles, 
  Layers, 
  Upload, 
  Settings, 
  Monitor, 
  Moon, 
  Sun, 
  X,
  CalendarCheck,
  Cloud,
  Smartphone,
  Download
} from "lucide-react";
import "./MobileView.css";

export default function MobileBottomNav({
  activeTab,
  onSelectTab,
  onOpenCreateNote,
  onOpenSettings,
  onOpenPdfImport,
  onOpenCalendarSync,
  onOpenStorageChoice,
  onOpenInstallApp,
  storageDestination = "phone",
  onToggleTheme,
  theme,
  onToggleMobileMode,
  isMobileMode,
  activeTabs = [],
  categories = [],
  activeCategory = "all",
  onSelectCategory,
  onAddCategoryClick
}) {
  const [isMoreDrawerOpen, setIsMoreDrawerOpen] = useState(false);

  const mainNavItems = [
    { id: "calendar", label: "Notes", icon: CalendarIcon, color: "#2563eb" },
    { id: "tree-view", label: "Tree", icon: Trees, color: "#10b981" },
    { id: "board", label: "Board", icon: Kanban, color: "#f59e0b" },
    { id: "mindmap", label: "Mind Map", icon: Network, color: "#8b5cf6" },
  ];

  const handleSelect = (tabId) => {
    onSelectTab(tabId);
    setIsMoreDrawerOpen(false);
  };

  const isMoreActive = ["a2-map", "ai-analyzer"].includes(activeTab);

  return (
    <>
      {/* Floating Action Button (FAB) for Quick Note Creation */}
      <button
        type="button"
        className="mobile-fab-btn"
        onClick={onOpenCreateNote}
        title="Create new note"
        aria-label="Create new note"
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {/* Sleek Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`mobile-nav-item ${isActive ? "is-active" : ""}`}
              onClick={() => handleSelect(item.id)}
            >
              <div className="mobile-nav-icon-wrap">
                <Icon size={19} color={isActive ? "var(--notion-text, #111827)" : "var(--notion-secondary, #9ca3af)"} />
                {isActive && <span className="mobile-nav-active-dot" style={{ backgroundColor: item.color }} />}
              </div>
              <span className="mobile-nav-label">{item.label}</span>
            </button>
          );
        })}

        {/* More Tab */}
        <button
          type="button"
          className={`mobile-nav-item ${isMoreActive || isMoreDrawerOpen ? "is-active" : ""}`}
          onClick={() => setIsMoreDrawerOpen(true)}
        >
          <div className="mobile-nav-icon-wrap">
            <MoreHorizontal size={20} color={(isMoreActive || isMoreDrawerOpen) ? "var(--notion-text, #111827)" : "var(--notion-secondary, #9ca3af)"} />
            {isMoreActive && <span className="mobile-nav-active-dot" style={{ backgroundColor: "#ec4899" }} />}
          </div>
          <span className="mobile-nav-label">More</span>
        </button>
      </nav>

      {/* Slide-Up "More Tools & Views" Bottom Sheet */}
      {isMoreDrawerOpen && (
        <div className="mobile-drawer-backdrop" onClick={() => setIsMoreDrawerOpen(false)}>
          <div className="mobile-drawer-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-drawer-handle-bar">
              <div className="mobile-drawer-handle" />
            </div>

            <div className="mobile-drawer-header">
              <div className="mobile-drawer-title-group">
                <Sparkles size={16} color="#8b5cf6" />
                <h3 className="mobile-drawer-title">Workspace Views & Cloud</h3>
              </div>
              <button
                type="button"
                className="mobile-drawer-close-btn"
                onClick={() => setIsMoreDrawerOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            {/* Storage Destination Choice & Sync Banner */}
            <div 
              className="mobile-drawer-sync-banner"
              style={{ background: storageDestination === "gdrive" ? "rgba(37, 99, 235, 0.08)" : "rgba(16, 185, 129, 0.08)" }}
              onClick={() => {
                setIsMoreDrawerOpen(false);
                if (onOpenStorageChoice) onOpenStorageChoice();
              }}
            >
              <div className="mobile-drawer-sync-left">
                <div 
                  className="mobile-drawer-sync-badge" 
                  style={{ background: storageDestination === "gdrive" ? "rgba(37, 99, 235, 0.15)" : "rgba(16, 185, 129, 0.15)" }}
                >
                  {storageDestination === "gdrive" ? (
                    <Cloud size={18} color="#2563eb" />
                  ) : (
                    <Smartphone size={18} color="#10b981" />
                  )}
                </div>
                <div>
                  <div className="mobile-drawer-sync-title">
                    Storage: {storageDestination === "gdrive" ? "☁️ Google Drive" : "📱 On Phone"}
                  </div>
                  <div className="mobile-drawer-sync-desc">
                    {storageDestination === "gdrive" ? "Multi-device sync & cloud backup" : "Private local device storage (Offline-first)"}
                  </div>
                </div>
              </div>
              <div className="mobile-drawer-sync-arrow">➔</div>
            </div>

            {/* Prominent Calendar Sync Card */}
            <div 
              className="mobile-drawer-sync-banner"
              onClick={() => {
                setIsMoreDrawerOpen(false);
                if (onOpenCalendarSync) onOpenCalendarSync();
              }}
            >
              <div className="mobile-drawer-sync-left">
                <div className="mobile-drawer-sync-badge">
                  <CalendarCheck size={18} color="#2563eb" />
                </div>
                <div>
                  <div className="mobile-drawer-sync-title">Sync to Google & iPhone Calendar</div>
                  <div className="mobile-drawer-sync-desc">Add all notes and reminders with 1 tap</div>
                </div>
              </div>
              <div className="mobile-drawer-sync-arrow">➔</div>
            </div>

            <div className="mobile-drawer-grid">
              <button
                type="button"
                className={`mobile-drawer-card ${activeTab === "a2-map" ? "is-active" : ""}`}
                onClick={() => handleSelect("a2-map")}
              >
                <div className="mobile-drawer-card-icon" style={{ background: "rgba(139, 92, 246, 0.12)", color: "#8b5cf6" }}>
                  <Layers size={20} />
                </div>
                <div className="mobile-drawer-card-info">
                  <div className="mobile-drawer-card-title">A2 Mind Map</div>
                  <div className="mobile-drawer-card-desc">Infinite spatial canvas</div>
                </div>
              </button>

              <button
                type="button"
                className={`mobile-drawer-card ${activeTab === "ai-analyzer" ? "is-active" : ""}`}
                onClick={() => handleSelect("ai-analyzer")}
              >
                <div className="mobile-drawer-card-icon" style={{ background: "rgba(236, 72, 153, 0.12)", color: "#ec4899" }}>
                  <Sparkles size={20} />
                </div>
                <div className="mobile-drawer-card-info">
                  <div className="mobile-drawer-card-title">AI Analyzer</div>
                  <div className="mobile-drawer-card-desc">Note heuristics & summary</div>
                </div>
              </button>

              <button
                type="button"
                className="mobile-drawer-card"
                onClick={() => {
                  setIsMoreDrawerOpen(false);
                  if (onOpenInstallApp) onOpenInstallApp();
                }}
              >
                <div className="mobile-drawer-card-icon" style={{ background: "rgba(16, 185, 129, 0.12)", color: "#10b981" }}>
                  <Download size={20} />
                </div>
                <div className="mobile-drawer-card-info">
                  <div className="mobile-drawer-card-title">Install App</div>
                  <div className="mobile-drawer-card-desc">Add to phone home screen</div>
                </div>
              </button>

              <button
                type="button"
                className="mobile-drawer-card"
                onClick={() => {
                  setIsMoreDrawerOpen(false);
                  onOpenPdfImport();
                }}
              >
                <div className="mobile-drawer-card-icon" style={{ background: "rgba(239, 68, 68, 0.12)", color: "#ef4444" }}>
                  <Upload size={20} />
                </div>
                <div className="mobile-drawer-card-info">
                  <div className="mobile-drawer-card-title">Import PDF</div>
                  <div className="mobile-drawer-card-desc">Extract notes from docs</div>
                </div>
              </button>

              <button
                type="button"
                className="mobile-drawer-card"
                onClick={() => {
                  setIsMoreDrawerOpen(false);
                  onOpenSettings("templates");
                }}
              >
                <div className="mobile-drawer-card-icon" style={{ background: "rgba(59, 130, 246, 0.12)", color: "#3b82f6" }}>
                  <Settings size={20} />
                </div>
                <div className="mobile-drawer-card-info">
                  <div className="mobile-drawer-card-title">Settings</div>
                  <div className="mobile-drawer-card-desc">Templates & preferences</div>
                </div>
              </button>
            </div>

            {/* Quick Mode & Theme Toggles */}
            <div className="mobile-drawer-footer">
              <button
                type="button"
                className="mobile-drawer-action-btn"
                onClick={() => {
                  onToggleTheme(theme === "dark" ? "light" : "dark");
                }}
              >
                {theme === "dark" ? <Sun size={15} color="#f59e0b" /> : <Moon size={15} color="#6366f1" />}
                <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
              </button>

              <button
                type="button"
                className="mobile-drawer-action-btn"
                onClick={() => {
                  setIsMoreDrawerOpen(false);
                  onToggleMobileMode();
                }}
              >
                <Monitor size={15} color="#10b981" />
                <span>Switch to Desktop</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
