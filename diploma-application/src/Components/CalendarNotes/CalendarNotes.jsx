import React, { useState, useRef, useEffect, useCallback } from "react";
import AiAnalyzerSuite from "./AiAnalyzerSuite";
import CalendarDashboard from "./CalendarDashboard";
import KanbanBoardView from "./KanbanBoardView";
import MindMapView from "./MindMapView";
import NoteEditorPanel from "./NoteEditorPanel";
import PdfImportModal from "./PdfImportModal";
import SidebarCalendar from "./SidebarCalendar";
import SettingsModal from "./SettingsModal";
import ChromeTabStrip, { TAB_DEFINITIONS } from "./ChromeTabStrip";
import A2MindMapCanvas from "./A2MindMapCanvas";
import TreeOfKnowledgeView from "./TreeOfKnowledgeView";
import MobileBottomNav from "./MobileBottomNav";
import MobileNotesFeed from "./MobileNotesFeed";
import CalendarSyncModal from "./CalendarSyncModal";
import StorageChoiceModal from "./StorageChoiceModal";
import InstallAppModal from "./InstallAppModal";
import { getStorageDestination, scheduleGoogleDriveAutoSync, pullWorkspaceFromGoogleDrive } from "../../utils/googleDriveService";
import { dbSaveAllEvents, dbGetAllEvents, dbSaveAllCategories, dbGetAllCategories, migrateLocalStorageToIndexedDB } from "../../utils/indexedDbService";
import { isCalendarAutoSyncEnabled, pushNotesToGoogleCalendar } from "../../utils/googleCalendarService";
import { formatLocalDate, getTodayLocalDate, getCurrentLocalTime } from "../../utils/dateUtils";
import { registerServiceWorker, sendNativeNotification } from "../../utils/notificationService";
import "./PdfImportModal.css";
import "./DeleteConfirmModal.css";

// ==========================================
// 🎨 NOTION LUCIDE REACT ICON IMPORTS
// ==========================================
import { 
  Tags, 
  Plus, 
  FileEdit, 
  Upload, 
  Zap, 
  Settings, 
  PanelLeftClose, 
  PanelLeftOpen, 
  Layers, 
  AlertTriangle, 
  Trash2, 
  Smartphone, 
  Monitor, 
  Sun, 
  Moon, 
  Pin, 
  ExternalLink,
  CalendarCheck,
  Cloud,
  Download
} from "lucide-react";

function stripHtml(html = "") {
  return String(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const DEFAULT_CATEGORIES = [
  { id: "work", title: "Work", color: "#4f46e5" },
  { id: "personal", title: "Personal", color: "#10b981" },
  { id: "diploma", title: "Diploma", color: "#7c3aed" },
  { id: "ideas", title: "Ideas", color: "#d97706" },
];

const PRESET_COLORS = [
  "#4f46e5", // Indigo
  "#10b981", // Emerald
  "#7c3aed", // Purple
  "#d97706", // Amber
  "#ef4444", // Rose
  "#0d9488", // Teal
  "#db2777", // Pink
  "#2563eb", // Blue
];

const EMPTY_FORM = {
  title: "",
  content: "",
  time: "12:00",
  color: "#4f46e5",
  categoryId: "work",
  fontStyle: "sans-serif",
  fontSize: 16,
  isBold: false,
  isItalic: false,
  align: "left",
  reminder: false,
  status: "todo",
  drawingDataUrl: "",
  attachments: [],
  mediaLinks: [],
};

const DEFAULT_INITIAL_EVENTS = [
  {
    id: 1,
    categoryId: "diploma",
    folderId: "diploma",
    title: "Diploma Project Defense Planning",
    content: "We must review system architecture constraints and complete deployment modules.",
    time: "14:00",
    date: getTodayLocalDate(),
    color: "#7c3aed",
    fontStyle: "sans-serif",
    fontSize: 16,
    isBold: true,
    isItalic: false,
    align: "left",
    reminder: true,
    status: "todo",
    x: -140,
    y: -50,
  },
  {
    id: 2,
    categoryId: "work",
    folderId: "work",
    title: "Sprint Review & Demo",
    content: "Demonstrate cross-screen calendar and mind map synchronization.",
    time: "10:30",
    date: getTodayLocalDate(),
    color: "#4f46e5",
    fontStyle: "sans-serif",
    fontSize: 16,
    isBold: false,
    isItalic: false,
    align: "left",
    reminder: false,
    status: "in-progress",
    x: 140,
    y: -50,
  },
  {
    id: 3,
    categoryId: "ideas",
    folderId: "ideas",
    title: "AI Note Auto-Summary Heuristics",
    content: "Extract bullet points, reading speed and key takeaways from documents.",
    time: "16:00",
    date: getTodayLocalDate(),
    color: "#d97706",
    fontStyle: "sans-serif",
    fontSize: 16,
    isBold: false,
    isItalic: false,
    align: "left",
    reminder: false,
    status: "todo",
    x: 0,
    y: 120,
  },
];

let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export default function CalendarNote() {
  const [date, setDate] = useState(new Date());
  
  // Categories State
  const [categories, setCategories] = useState(() => {
    try {
      const saved = localStorage.getItem("notion_categories");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_CATEGORIES;
  });

  useEffect(() => {
    try {
      localStorage.setItem("notion_categories", JSON.stringify(categories));
      dbSaveAllCategories(categories);
      scheduleGoogleDriveAutoSync();
    } catch {}
  }, [categories]);
  const [activeCategory, setActiveCategory] = useState("all"); // "all" | categoryId
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatTitle, setNewCatTitle] = useState("");
  const [newCatColor, setNewCatColor] = useState("#4f46e5");
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [isStickyMiniMode, setIsStickyMiniMode] = useState(false);
  const [isCalendarSyncOpen, setIsCalendarSyncOpen] = useState(false);
  const [storageDestination, setStorageDestinationState] = useState(() => getStorageDestination() || "phone");
  const [isStorageChoiceOpen, setIsStorageChoiceOpen] = useState(false);
  const [isInitialStoragePrompt, setIsInitialStoragePrompt] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  // Notes state
  const [events, setEvents] = useState(() => {
    try {
      const saved = localStorage.getItem("notion_events");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_INITIAL_EVENTS;
  });

  useEffect(() => {
    try {
      localStorage.setItem("notion_events", JSON.stringify(events));
      dbSaveAllEvents(events);
      scheduleGoogleDriveAutoSync();
      if (isCalendarAutoSyncEnabled()) {
        pushNotesToGoogleCalendar(events, categories).catch(() => {});
      }
    } catch {}
  }, [events, categories]);

  const [isNotePanelOpen, setIsNotePanelOpen] = useState(false);
  const [notePanelMode, setNotePanelMode] = useState("create");
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [activeTabs, setActiveTabs] = useState(() => {
    try {
      const saved = localStorage.getItem("chrome_active_tabs");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(0, 6);
      }
    } catch {}
    return ["tree-view", "calendar", "mindmap", "board", "a2-map"];
  });
  const [activeTab, setActiveTab] = useState("tree-view");
  const [isTopTabMenuOpen, setIsTopTabMenuOpen] = useState(false);
  const [aiTargetNote, setAiTargetNote] = useState(null);
  const [isPdfImportOpen, setIsPdfImportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [settingsInitialTab, setSettingsInitialTab] = useState("templates");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [focusedNoteId, setFocusedNoteId] = useState(null);
  const [quickInput, setQuickInput] = useState("");
  const [activeReminderAlert, setActiveReminderAlert] = useState(null);
      const isMobileUrl = typeof window !== "undefined" && (window.location.search.includes("mode=mobile") || window.name === "smart_notes_mobile_popup");
  const isMobileViewActive = isMobileUrl;
  const isMobileMode = isMobileViewActive;

  const handleOpenMobilePopout = () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("mode", "mobile");
      const popup = window.open(
        url.toString(),
        "smart_notes_mobile_popup",
        "width=390,height=750,menubar=no,toolbar=no,location=no,status=no,resizable=yes"
      );
      if (popup) {
        popup.focus();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePopoutStickyWindow = handleOpenMobilePopout;

  const handleToggleMobileMode = () => {
    if (window.opener || window.name === "smart_notes_mobile_popup") {
      window.close();
    } else {
      handleOpenMobilePopout();
    }
  };
const [theme, setTheme] = useState(() => {
    return localStorage.getItem("notion_app_theme") || "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (theme === "dark") {
      document.body.classList.add("dark-theme");
    } else {
      document.body.classList.remove("dark-theme");
    }
    localStorage.setItem("notion_app_theme", theme);
  }, [theme]);

  const handleToggleTheme = (newTheme) => {
    setTheme(newTheme);
  };

  const blinkIntervalRef = useRef(null);
  const chimeIntervalRef = useRef(null);
  const originalTitle = "Smart Note Workspace";

  const startTabBlinking = (message) => {
    if (blinkIntervalRef.current) return;
    
    let isAlertTitle = false;
    blinkIntervalRef.current = setInterval(() => {
      document.title = isAlertTitle ? originalTitle : `⚠️ ${message}`;
      isAlertTitle = !isAlertTitle;
    }, 1000); 
  };

  const stopTabBlinking = () => {
    if (blinkIntervalRef.current) {
      clearInterval(blinkIntervalRef.current);
      blinkIntervalRef.current = null;
      document.title = originalTitle; 
    }
  };

  const playAlertSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      
      // Rich melodious multi-tone reminder chime: E5 -> G#5 -> B5 -> E6
      const notes = [
        { freq: 659.25, time: 0.0, duration: 0.45 },
        { freq: 830.61, time: 0.16, duration: 0.45 },
        { freq: 987.77, time: 0.32, duration: 0.55 },
        { freq: 1318.51, time: 0.48, duration: 0.85 },
      ];

      notes.forEach((note) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(note.freq, now + note.time);

        gain.gain.setValueAtTime(0.001, now + note.time);
        gain.gain.exponentialRampToValueAtTime(0.25, now + note.time + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + note.time);
        osc.stop(now + note.time + note.duration + 0.05);
      });
    } catch (e) {
      console.warn("Audio Context blocked or unavailable.", e);
    }
  }, [soundEnabled]);

  const stopChimeLoop = useCallback(() => {
    if (chimeIntervalRef.current) {
      clearInterval(chimeIntervalRef.current);
      chimeIntervalRef.current = null;
    }
    stopTabBlinking();
  }, []);

  const triggerReminderAlert = useCallback((event) => {
    stopChimeLoop();
    playAlertSound();
    startTabBlinking(`⏰ Note: ${event.title}`);
    setActiveReminderAlert(event);
    sendNativeNotification(`⏰ Reminder: ${event.title}`, {
      body: event.content ? stripHtml(event.content).slice(0, 140) : "Your scheduled reminder is due!",
      tag: `note-reminder-${event.id}`,
    });

    // Repeat reminder chime every 5 seconds until acknowledged/dismissed
    chimeIntervalRef.current = setInterval(() => {
      playAlertSound();
    }, 5000);
  }, [playAlertSound, stopChimeLoop]);

  useEffect(() => {
    // 1. Initial migration from localStorage to IndexedDB and fetch latest
    migrateLocalStorageToIndexedDB().then(async () => {
      try {
        const idbEvents = await dbGetAllEvents();
        if (idbEvents && Array.isArray(idbEvents) && idbEvents.length > 0) {
          setEvents(idbEvents);
        }
        const idbCats = await dbGetAllCategories();
        if (idbCats && Array.isArray(idbCats) && idbCats.length > 0) {
          setCategories(idbCats);
        }
      } catch (e) {
        console.warn("IndexedDB load error", e);
      }

      // Check cloud update in background
      pullWorkspaceFromGoogleDrive().then((cloudData) => {
        if (cloudData) {
          if (cloudData.events?.length) setEvents(cloudData.events);
          if (cloudData.categories?.length) setCategories(cloudData.categories);
        }
      }).catch(() => {});
    });

    const handleWindowFocus = () => {
      pullWorkspaceFromGoogleDrive().then((cloudData) => {
        if (cloudData) {
          if (cloudData.events?.length) setEvents(cloudData.events);
          if (cloudData.categories?.length) setCategories(cloudData.categories);
        }
      }).catch(() => {});
    };

    window.addEventListener("focus", handleWindowFocus);

    // Check if user has made an initial storage destination choice
    const savedDest = localStorage.getItem("smart_notes_storage_destination");
    if (!savedDest) {
      setIsInitialStoragePrompt(true);
      setIsStorageChoiceOpen(true);
    }

    // Capture PWA install prompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Listen for storage destination changes
    const handleStorageChange = (e) => {
      if (e?.detail?.destination) {
        setStorageDestinationState(e.detail.destination);
      }
    };
    window.addEventListener("storage-destination-changed", handleStorageChange);

    // Listen for workspace restores
    const handleWorkspaceRestored = () => {
      try {
        const rawEvents = localStorage.getItem("notion_events");
        if (rawEvents) setEvents(JSON.parse(rawEvents));
        const rawCats = localStorage.getItem("notion_categories");
        if (rawCats) setCategories(JSON.parse(rawCats));
        const rawTheme = localStorage.getItem("notion_app_theme");
        if (rawTheme) setTheme(rawTheme);
        const rawTabs = localStorage.getItem("chrome_active_tabs");
        if (rawTabs) setActiveTabs(JSON.parse(rawTabs));
      } catch (err) {}
    };
    window.addEventListener("workspace-restored", handleWorkspaceRestored);
    
    registerServiceWorker();
    const unlockAudio = () => {
      getAudioContext();
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
    window.addEventListener("click", unlockAudio);
    window.addEventListener("keydown", unlockAudio);
    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("storage-destination-changed", handleStorageChange);
      window.removeEventListener("workspace-restored", handleWorkspaceRestored);
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  useEffect(() => {
    const triggeredIds = new Set();

    const checkReminders = () => {
      const currentDateStr = getTodayLocalDate();
      const currentTimeStr = getCurrentLocalTime();

      events.forEach((event) => {
        if (event.reminder && event.date === currentDateStr && event.time === currentTimeStr) {
          if (!triggeredIds.has(event.id)) {
            triggeredIds.add(event.id);
            triggerReminderAlert(event);
          }
        }
      });
    };

    const checkInterval = setInterval(checkReminders, 10000);
    return () => {
      clearInterval(checkInterval);
      stopChimeLoop();
    };
  }, [events, triggerReminderAlert, stopChimeLoop]);

  useEffect(() => {
    const handleUserFocus = () => {
      stopChimeLoop();
    };
    window.addEventListener("click", handleUserFocus);
    window.addEventListener("focus", handleUserFocus);
    
    return () => {
      window.removeEventListener("click", handleUserFocus);
      window.removeEventListener("focus", handleUserFocus);
      stopChimeLoop();
    };
  }, [stopChimeLoop]);

  const handleAddCategory = (customTitle, customColor) => {
    let title = "";
    let color = newCatColor || "#4f46e5";

    if (typeof customTitle === "string") {
      title = customTitle.trim();
      if (typeof customColor === "string" && customColor.trim()) {
        color = customColor.trim();
      }
    } else if (customTitle && typeof customTitle === "object") {
      title = (customTitle.title || customTitle.name || "").trim();
      if (customTitle.color) {
        color = customTitle.color;
      }
    } else {
      title = newCatTitle.trim();
      color = newCatColor || "#4f46e5";
    }

    if (!title) return null;
    if (categories.length >= 10) {
      alert("Maximum of 10 topic branches reached!");
      return null;
    }

    const newId = (customTitle && typeof customTitle === "object" && customTitle.id)
      ? customTitle.id
      : `cat_${Date.now()}`;

    const newCat = {
      id: newId,
      title: title,
      color: color,
    };
    setCategories((prev) => [...prev, newCat]);
    setNewCatTitle("");
    setIsAddingCategory(false);
    setActiveCategory(newId);
    return newCat;
  };
  
  const handleDeleteCategory = (catId) => {
    if (categories.length <= 1) {
      return;
    }
    const remaining = categories.filter((c) => c.id !== catId);
    setCategories(remaining);
    if (activeCategory === catId) {
      setActiveCategory("all");
    }
  };
  
  const closeNotePanel = () => {
    setIsNotePanelOpen(false);
    setEditingId(null);
    setSelectedEvent(null);
  };

  const openCreateNotePanel = (targetDate = date, initialStatus = "todo", presetCatId = null) => {
    setSelectedDate(targetDate);
    setSelectedEvent(null);
    setEditingId(null);
    const defaultCat = presetCatId || (activeCategory !== "all" ? activeCategory : (categories[0]?.id || "work"));
    const defaultColor = categories.find((c) => c.id === defaultCat)?.color || "#4f46e5";
    setForm({
      ...EMPTY_FORM,
      categoryId: defaultCat,
      color: defaultColor,
      status: initialStatus,
    });
    setNotePanelMode("create");
    setIsNotePanelOpen(true);
  };

  const handleBoardCreateNote = (status = "todo") => {
    openCreateNotePanel(new Date(), status);
  };

  const handleUpdateNoteStatus = (noteId, newStatus) => {
    setEvents((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, status: newStatus } : n))
    );
  };

  const openNoteEditor = (event) => {
    setSelectedEvent(event);
    setSelectedDate(new Date(event.date));
    setEditingId(event.id);
    const noteCat = event.categoryId || event.folderId || "work";
    setForm({
      title: event.title,
      content: event.content || "",
      time: event.time || "12:00",
      color: event.color || "#4f46e5",
      categoryId: noteCat,
      fontStyle: event.fontStyle || "sans-serif",
      fontSize: event.fontSize || 16,
      isBold: event.isBold || false,
      isItalic: event.isItalic || false,
      align: event.align || "left",
      reminder: event.reminder || false,
      status: event.status || "todo",
      drawingDataUrl: event.drawingDataUrl || "",
      attachments: Array.isArray(event.attachments) ? event.attachments : [],
      mediaLinks: Array.isArray(event.mediaLinks) ? event.mediaLinks : [],
    });
    setNotePanelMode("edit");
    setIsNotePanelOpen(true);
  };

  const handleSaveNote = (savedForm = form) => {
    const rawTitle = (savedForm.title || "").trim();
    if (!rawTitle) return;

    const targetDate = selectedDate || date;
    const dateString = formatLocalDate(targetDate);
    const catId = savedForm.categoryId || (activeCategory !== "all" ? activeCategory : (categories[0]?.id || "work"));
    const catObj = categories.find((c) => c.id === catId);
    const noteColor = savedForm.color || catObj?.color || "#4f46e5";

    const payload = {
      ...savedForm,
      title: rawTitle,
      categoryId: catId,
      folderId: catId,
      color: noteColor,
      attachments: savedForm.attachments || [],
      mediaLinks: savedForm.mediaLinks || [],
    };

    if (editingId) {
      setEvents((prev) =>
        prev.map((event) => (event.id === editingId ? { ...event, ...payload, date: dateString } : event))
      );
    } else {
      setEvents((prev) => [
        ...prev,
        {
          id: Date.now(),
          date: dateString,
          fullDate: new Date(targetDate),
          status: payload.status || "todo",
          ...payload,
        },
      ]);
    }
    closeNotePanel();
  };

  const deleteNotification = (id) => {
    setEvents((prev) => prev.filter((event) => event.id !== id));
    if (selectedEvent?.id === id) closeNotePanel();
    if (aiTargetNote?.id === id) setAiTargetNote(null);
  };

  const saveNoteAnalysis = (noteId, analysis) => {
    setEvents((prev) =>
      prev.map((event) =>
        event.id === noteId ? { ...event, aiAnalysis: analysis } : event
      )
    );
    setAiTargetNote((prev) =>
      prev?.id === noteId ? { ...prev, aiAnalysis: analysis } : prev
    );
  };

  const handleImportEvents = (importedNotes = []) => {
    if (!importedNotes || !importedNotes.length) return;
    setEvents((prev) => {
      const existingKeys = new Set(prev.map((e) => `${e.title || ""}_${e.date || ""}`));
      const uniqueNew = importedNotes.filter((e) => !existingKeys.has(`${e.title || ""}_${e.date || ""}`));
      return [...uniqueNew, ...prev];
    });
  };

  const handlePdfImportConfirm = (payload) => {
    let targetCatId = payload.folderId || payload.categoryId || (categories[0]?.id || "work");

    if (payload.folderMode === "new" && payload.newFolderTitle) {
      targetCatId = `cat_${Date.now()}`;
      setCategories((prev) => [
        ...prev,
        { id: targetCatId, title: payload.newFolderTitle, color: "#4f46e5" },
      ]);
    }

    const today = getTodayLocalDate();
    const catObj = categories.find((c) => c.id === targetCatId);
    const newNote = {
      id: Date.now(),
      categoryId: targetCatId,
      folderId: targetCatId,
      title: payload.title,
      content: payload.content,
      date: today,
      time: "12:00",
      color: catObj?.color || "#4f46e5",
      fontStyle: "sans-serif",
      fontSize: 16,
      isBold: false,
      isItalic: false,
      align: "left",
      reminder: false,
      status: "todo",
      attachments: payload.attachment ? [payload.attachment] : [],
    };

    if (payload.summary) {
      newNote.aiAnalysis = { summary: payload.summary };
    }

    setEvents((prev) => [...prev, newNote]);
    setActiveCategory(targetCatId);
    setActiveTab("board");
  };

  const handleJumpToCalendar = (targetDateStr) => {
    if (targetDateStr) {
      const parts = String(targetDateStr).split("-");
      if (parts.length === 3) {
        setDate(new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
      }
    }
    setActiveTab("calendar");
  };

  const handleJumpToMindMap = (noteId) => {
    setFocusedNoteId(noteId);
    setActiveTab("mindmap");
  };

  const handleJumpToBoard = () => {
    setActiveTab("board");
  };

  const handleJumpToTree = (targetCatId) => {
    if (targetCatId) {
      setActiveCategory(targetCatId);
    }
    setActiveTab("tree-view");
  };

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
  };

  const handleCloseTab = (tabId) => {
    if (activeTabs.length <= 1) return;
    const nextTabs = activeTabs.filter((t) => t !== tabId);
    setActiveTabs(nextTabs);
    try {
      localStorage.setItem("chrome_active_tabs", JSON.stringify(nextTabs));
    } catch {}
    if (activeTab === tabId) {
      const closedIdx = activeTabs.indexOf(tabId);
      const fallback = nextTabs[Math.max(0, closedIdx - 1)] || nextTabs[0];
      setActiveTab(fallback);
    }
  };

  const handleAddTab = (tabId) => {
    if (activeTabs.includes(tabId) || activeTabs.length >= 6) return;
    const nextTabs = [...activeTabs, tabId];
    setActiveTabs(nextTabs);
    try {
      localStorage.setItem("chrome_active_tabs", JSON.stringify(nextTabs));
    } catch {}
    setActiveTab(tabId);
  };

  const handleToggleTab = (tabId) => {
    if (activeTabs.includes(tabId)) {
      if (activeTabs.length <= 1) return;
      handleCloseTab(tabId);
    } else {
      handleAddTab(tabId);
    }
  };

  const handleOpenSettingsWithTab = (tabName) => {
    setSettingsInitialTab(tabName);
    setIsSettingsOpen(true);
  };

  const handleQuickCaptureSubmit = (e) => {
    if ((e.key === "Enter" || e.type === "click") && quickInput.trim()) {
      const today = formatLocalDate(date || new Date());
      const catId = activeCategory !== "all" ? activeCategory : (categories[0]?.id || "work");
      const catObj = categories.find((c) => c.id === catId);
      const newNote = {
        id: Date.now(),
        categoryId: catId,
        folderId: catId,
        title: quickInput.trim(),
        content: "",
        date: today,
        time: getCurrentLocalTime(),
        color: catObj?.color || "#4f46e5",
        fontStyle: "sans-serif",
        fontSize: 16,
        isBold: false,
        isItalic: false,
        align: "left",
        reminder: false,
        status: "todo",
      };
      setEvents((prev) => [...prev, newNote]);
      setQuickInput("");
    }
  };

  const filteredEvents = activeCategory === "all"
    ? events
    : events.filter((e) => (e.categoryId || e.folderId) === activeCategory);

  const activeCategoryTitle = activeCategory === "all"
    ? "All Notes"
    : categories.find((c) => c.id === activeCategory)?.title || "Category";

  if (isMobileViewActive) {
    return (
      <div className="mobile-device-simulator-wrapper">
        <div className={`mobile-device-simulator ${isStickyMiniMode ? "mobile-sticky-widget" : ""}`}>
          {isStickyMiniMode && (
            <div className="mobile-sticky-pin-badge">
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <Pin size={11} color="#f59e0b" />
                <span>Sticky Note Mode</span>
              </div>
              <button
                type="button"
                className="mobile-sticky-popout-btn"
                onClick={handlePopoutStickyWindow}
                title="Pop out into a separate compact desktop mini-window"
              >
                <ExternalLink size={11} />
                <span>Pop Out</span>
              </button>
            </div>
          )}
          {/* Simulated Dynamic Island / Notch for PC preview */}
          <div className="mobile-device-notch">
            <div className="mobile-device-notch-lens" />
          </div>

          {/* Minimalist Mobile Top App Bar */}
          <header className="mobile-header">
            <div className="mobile-header-top-row">
              <div className="mobile-header-brand">
                <span>🌳</span>
                <span>Smart Notes</span>
              </div>
              <div className="mobile-header-actions">
                <button
                  type="button"
                  className="mobile-header-btn mobile-header-btn--storage"
                  onClick={() => {
                    setIsInitialStoragePrompt(false);
                    setIsStorageChoiceOpen(true);
                  }}
                  title="Storage Destination (Phone vs Google Drive)"
                >
                  {storageDestination === "gdrive" ? (
                    <Cloud size={12} color="#3b82f6" />
                  ) : (
                    <Smartphone size={12} color="#10b981" />
                  )}
                  <span>{storageDestination === "gdrive" ? "Drive" : "Phone"}</span>
                </button>
                <button
                  type="button"
                  className="mobile-header-btn"
                  onClick={() => setIsInstallModalOpen(true)}
                  title="Install App on Phone"
                >
                  <Download size={12} color="#4f46e5" />
                  <span>Install</span>
                </button>
                <button
                  type="button"
                  className="mobile-header-btn mobile-header-btn--sync"
                  onClick={() => setIsCalendarSyncOpen(true)}
                  title="Add All Notes to Google or iPhone Calendar"
                >
                  <CalendarCheck size={12} />
                  <span>Sync Cal</span>
                </button>
                <button
                  type="button"
                  className="mobile-header-btn"
                  onClick={() => setIsStickyMiniMode((prev) => !prev)}
                  title={isStickyMiniMode ? "Expand to Smartphone View" : "Shrink to Microsoft Sticky Notes Mode"}
                >
                  <Pin size={12} color={isStickyMiniMode ? "#f59e0b" : "#6366f1"} />
                  <span>{isStickyMiniMode ? "Phone" : "Sticky"}</span>
                </button>
                <button
                  type="button"
                  className="mobile-header-btn"
                  onClick={handleToggleMobileMode}
                  title="Switch to Desktop Mode"
                >
                  <Monitor size={12} color="#10b981" />
                  <span>Desktop</span>
                </button>
                <button
                  type="button"
                  className="mobile-header-btn"
                  onClick={() => handleToggleTheme(theme === "dark" ? "light" : "dark")}
                  title="Toggle Theme"
                >
                  {theme === "dark" ? <Sun size={12} color="#f59e0b" /> : <Moon size={12} color="#6366f1" />}
                </button>
              </div>
            </div>

            {/* Horizontal Category Tag Pills */}
            <div className="mobile-category-scroller">
              <button
                type="button"
                className={`mobile-category-pill ${activeCategory === "all" ? "is-active" : ""}`}
                onClick={() => setActiveCategory("all")}
              >
                <span>🌟</span>
                <span>All ({events.length})</span>
              </button>

              {categories.map((cat) => {
                const isActive = activeCategory === cat.id;
                const catCount = events.filter((e) => (e.categoryId || e.folderId) === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`mobile-category-pill ${isActive ? "is-active" : ""}`}
                    onClick={() => setActiveCategory(cat.id)}
                  >
                    <span className="mobile-category-dot" style={{ backgroundColor: cat.color || "#4f46e5" }} />
                    <span>{cat.title} ({catCount})</span>
                  </button>
                );
              })}

              <button
                type="button"
                className="mobile-category-pill mobile-category-add-pill"
                onClick={() => handleOpenSettingsWithTab("categories")}
                title="Manage Categories"
              >
                <Plus size={11} />
                <span>Tag</span>
              </button>
            </div>

            {/* Mobile Minimalist Quick Capture */}
            <div className="mobile-quick-input-wrap">
              <Zap size={13} color="#d97706" style={{ flexShrink: 0 }} />
              <input
                type="text"
                placeholder="⚡ Quick capture note (press Enter)..."
                value={quickInput}
                onChange={(e) => setQuickInput(e.target.value)}
                onKeyDown={handleQuickCaptureSubmit}
                className="mobile-quick-input"
              />
              {quickInput.trim() && (
                <button
                  type="button"
                  onClick={handleQuickCaptureSubmit}
                  style={{
                    background: "#4f46e5",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    padding: "3px 8px",
                    fontSize: "11px",
                    fontWeight: "600",
                    cursor: "pointer"
                  }}
                >
                  Add
                </button>
              )}
            </div>
          </header>

          {/* Active Workspace View in Mobile Body */}
          <main className="mobile-workspace-body">
            {activeReminderAlert && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                  color: "#ffffff",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxShadow: "0 4px 14px rgba(79, 70, 229, 0.35)",
                  gap: "8px",
                  fontSize: "12px",
                }}
              >
                <div>
                  <strong>⏰ {activeReminderAlert.title}</strong>
                  <div style={{ fontSize: "11px", opacity: 0.9 }}>{activeReminderAlert.time}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    stopChimeLoop();
                    openNoteEditor(activeReminderAlert);
                    setActiveReminderAlert(null);
                  }}
                  style={{
                    background: "#fff",
                    color: "#4f46e5",
                    border: "none",
                    borderRadius: "6px",
                    padding: "4px 8px",
                    fontWeight: 600,
                    fontSize: "11px",
                  }}
                >
                  Open
                </button>
              </div>
            )}

            {activeTab === "calendar" && (
              <MobileNotesFeed
                events={events}
                categories={categories}
                activeCategory={activeCategory}
                onOpenNote={openNoteEditor}
                onCreateNote={() => openCreateNotePanel(date || new Date())}
                onUpdateNoteStatus={handleUpdateNoteStatus}
                onOpenCalendarSync={() => setIsCalendarSyncOpen(true)}
            onOpenStorageChoice={() => {
              setIsInitialStoragePrompt(false);
              setIsStorageChoiceOpen(true);
            }}
            onOpenInstallApp={() => setIsInstallModalOpen(true)}
            storageDestination={storageDestination}
              />
            )}

            {activeTab === "tree-view" && (
              <TreeOfKnowledgeView
                events={events}
                categories={categories}
                onOpenNote={openNoteEditor}
                onCreateNote={openCreateNotePanel}
                onUpdateNoteStatus={handleUpdateNoteStatus}
                onJumpToCalendar={handleJumpToCalendar}
                onAddCategory={handleAddCategory}
                onDeleteCategory={handleDeleteCategory}
              />
            )}

            {activeTab === "board" && (
              <KanbanBoardView
                events={filteredEvents}
                onOpenNote={openNoteEditor}
                onCreateNote={handleBoardCreateNote}
                onUpdateNoteStatus={handleUpdateNoteStatus}
                onJumpToCalendar={handleJumpToCalendar}
                onJumpToMindMap={handleJumpToMindMap}
              />
            )}

            {activeTab === "mindmap" && (
              <MindMapView
                workspaceTitle={activeCategoryTitle}
                events={filteredEvents}
                onOpenNote={openNoteEditor}
                onCreateNote={() => openCreateNotePanel(new Date())}
                onUpdateNotePosition={(id, x, y) =>
                  setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, x, y } : e)))
                }
                onUpdateNoteStatus={handleUpdateNoteStatus}
                onJumpToCalendar={handleJumpToCalendar}
                focusedNoteId={focusedNoteId}
              />
            )}

            {activeTab === "a2-map" && (
              <A2MindMapCanvas />
            )}

            {activeTab === "ai-analyzer" && (
              <AiAnalyzerSuite
                filteredEvents={filteredEvents}
                aiTargetNote={aiTargetNote}
                setAiTargetNote={setAiTargetNote}
                onSaveAnalysis={saveNoteAnalysis}
              />
            )}
          </main>

          {/* Minimalist Mobile Bottom Navigation & FAB */}
          <MobileBottomNav
            activeTab={activeTab}
            onSelectTab={handleSelectTab}
            onOpenCreateNote={() => openCreateNotePanel(date || new Date())}
            onOpenSettings={(tab) => handleOpenSettingsWithTab(tab || "templates")}
            onOpenPdfImport={() => setIsPdfImportOpen(true)}
            onOpenCalendarSync={() => setIsCalendarSyncOpen(true)}
            onToggleTheme={handleToggleTheme}
            theme={theme}
            onToggleMobileMode={handleToggleMobileMode}
            isMobileMode={isMobileMode}
            activeTabs={activeTabs}
            categories={categories}
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
            onAddCategoryClick={() => handleOpenSettingsWithTab("categories")}
          />

          {/* Modals */}
          <NoteEditorPanel
            isOpen={isNotePanelOpen}
            mode={notePanelMode}
            editorKey={editingId ?? "new"}
            form={form}
            setForm={setForm}
            categories={categories}
            onSave={handleSaveNote}
            onClose={closeNotePanel}
            onDelete={notePanelMode === "edit" && selectedEvent ? () => setNoteToDelete(selectedEvent) : undefined}
            noteRecord={selectedEvent}
            onSaveAnalysis={saveNoteAnalysis}
            onJumpToCalendar={handleJumpToCalendar}
            onJumpToMindMap={handleJumpToMindMap}
            onJumpToBoard={handleJumpToBoard}
            onJumpToTree={handleJumpToTree}
          />

          <PdfImportModal
            isOpen={isPdfImportOpen}
            onClose={() => setIsPdfImportOpen(false)}
            folders={categories.map((c) => ({ id: c.id, title: c.title }))}
            onConfirm={handlePdfImportConfirm}
          />

          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            events={events}
            categories={categories}
            soundEnabled={soundEnabled}
            onToggleSound={() => setSoundEnabled((prev) => !prev)}
            activeTabs={activeTabs}
            onToggleTab={handleToggleTab}
            initialTab={settingsInitialTab}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            onImportEvents={handleImportEvents}
            onOpenStorageChoice={() => {
              setIsInitialStoragePrompt(false);
              setIsStorageChoiceOpen(true);
            }}
            onOpenInstallApp={() => setIsInstallModalOpen(true)}
          />

          <CalendarSyncModal
            isOpen={isCalendarSyncOpen}
            onClose={() => setIsCalendarSyncOpen(false)}
            events={events}
            categories={categories}
            onImportEvents={handleImportEvents}
            onOpenStorageSettings={() => setIsStorageChoiceOpen(true)}
          />
      <StorageChoiceModal
        isOpen={isStorageChoiceOpen}
        onClose={() => {
          setIsStorageChoiceOpen(false);
          setIsInitialStoragePrompt(false);
        }}
        onStorageChanged={(mode) => setStorageDestinationState(mode)}
        isInitialPrompt={isInitialStoragePrompt}
      />

      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        deferredInstallPrompt={deferredPrompt}
      />

          {noteToDelete && (
            <div className="notion-delete-confirm-overlay" onClick={() => setNoteToDelete(null)}>
              <div className="notion-delete-confirm-card" onClick={(e) => e.stopPropagation()}>
                <div className="notion-delete-confirm-icon-badge">
                  <AlertTriangle size={24} color="#ef4444" />
                </div>
                <h3 className="notion-delete-confirm-title">Delete this note?</h3>
                <p className="notion-delete-confirm-desc">
                  Are you sure you want to permanently delete <strong>"{noteToDelete.title || "Untitled Note"}"</strong>? This action cannot be undone.
                </p>
                <div className="notion-delete-confirm-actions">
                  <button
                    type="button"
                    className="notion-delete-confirm-btn notion-delete-confirm-btn--cancel"
                    onClick={() => setNoteToDelete(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="notion-delete-confirm-btn notion-delete-confirm-btn--danger"
                    onClick={() => {
                      deleteNotification(noteToDelete.id);
                      setNoteToDelete(null);
                    }}
                  >
                    <Trash2 size={13} />
                    <span>Delete Permanently</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="ws-shell" style={workspaceContainer}>
      {/* SIDEBAR */}
      {isSidebarOpen && (
        <div className="ws-sidebar" style={sidebarStyle}>
          <div>
            {/* Categories Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", padding: "0 4px" }}>
              <h4 style={{ ...sidebarTitle, display: "flex", alignItems: "center", gap: "6px" }}>
                <Tags size={13} /> Categories
              </h4>
              <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                <button
                  type="button"
                  onClick={() => setIsAddingCategory((prev) => !prev)}
                  style={addFolderToggleBtn}
                  title="Add new category tag"
                >
                  <Plus size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  style={addFolderToggleBtn}
                  title="Close sidebar"
                >
                  <PanelLeftClose size={14} />
                </button>
              </div>
            </div>

          {/* Inline Add Category Form */}
          {isAddingCategory && (
            <div style={inlineAddCategoryCard}>
              <input
                type="text"
                placeholder="Category name..."
                value={newCatTitle}
                onChange={(e) => setNewCatTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddCategory();
                  if (e.key === "Escape") setIsAddingCategory(false);
                }}
                autoFocus
                style={inlineAddInput}
              />
              <div style={inlineColorRow}>
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    style={{
                      ...inlineColorSwatch,
                      backgroundColor: c,
                      transform: newCatColor === c ? "scale(1.25)" : "scale(1)",
                      border: newCatColor === c ? "2px solid #37352f" : "1px solid transparent",
                    }}
                    onClick={() => setNewCatColor(c)}
                  />
                ))}
              </div>
              <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                <button type="button" onClick={handleAddCategory} style={inlineAddSaveBtn}>
                  Add
                </button>
                <button type="button" onClick={() => setIsAddingCategory(false)} style={inlineAddCancelBtn}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Category List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {/* 🌟 All Notes Global View */}
            <div
              onClick={() => setActiveCategory("all")}
              style={{
                ...folderItem,
                background: activeCategory === "all" ? "rgba(55, 53, 47, 0.08)" : "transparent",
                fontWeight: activeCategory === "all" ? "600" : "500",
              }}
            >
              <span style={{ fontSize: "12px", marginRight: "2px" }}>🌟</span>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                All Notes
              </span>
              <span style={categoryCountBadge}>{events.length}</span>
            </div>

            {/* Individual Categories */}
            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;
              const catNotesCount = events.filter((e) => (e.categoryId || e.folderId) === cat.id).length;

              return (
                <div
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  style={{
                    ...folderItem,
                    background: isActive ? "rgba(55, 53, 47, 0.08)" : "transparent",
                    fontWeight: isActive ? "600" : "500",
                    position: "relative",
                  }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: cat.color || "#4f46e5",
                      flexShrink: 0,
                    }}
                  />
                  <span style={deleteContentContainer}>{cat.title}</span>
                  <span style={categoryCountBadge}>{catNotesCount}</span>
                  <button
                    type="button"
                    style={folderActionBtnDelete}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCategoryToDelete(cat);
                    }}
                    title="Delete category"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>

          {/* Mini Calendar Navigator */}
          <SidebarCalendar
            selectedDate={date}
            onSelectDate={setDate}
            events={filteredEvents}
          />
        </div>

        {/* Bottom Quick Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "24px" }}>
          <button onClick={() => openCreateNotePanel(date)} style={quickNoteButton}>
            <FileEdit size={14} /> New note
          </button>

          <button
            type="button"
            style={pdfImportSidebarBtn}
            onClick={() => setIsPdfImportOpen(true)}
          >
            <Upload size={14} /> Import PDF
          </button>

          <button
            type="button"
            style={pdfImportSidebarBtn}
            onClick={() => setIsCalendarSyncOpen(true)}
            title="Sync all notes with Google or iPhone Calendar (.ics)"
          >
            <CalendarCheck size={14} color="#2563eb" /> Sync Calendar
          </button>

          <button
            type="button"
            style={settingsSidebarBtn}
            onClick={() => handleOpenSettingsWithTab("templates")}
            title="Workspace & DeepSeek AI Settings"
          >
            <Settings size={14} /> Settings
          </button>
        </div>
      </div>
      )}

      {/* MAIN CONTENT */}
      <div className="ws-main" style={mainContentStyle}>
        {/* Universal Quick Capture Bar */}
        <div style={quickCaptureBarStyle}>
          {!isSidebarOpen && (
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              style={sidebarReopenBtn}
              title="Open sidebar"
            >
              <PanelLeftOpen size={15} />
            </button>
          )}
          <Zap size={14} color="#d97706" style={{ flexShrink: 0 }} />
          <input
            type="text"
            placeholder="⚡ Quick capture note / task (press Enter to sync across Calendar, Mind Map & Board)..."
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            onKeyDown={handleQuickCaptureSubmit}
            style={quickCaptureInputStyle}
          />
          {quickInput.trim() && (
            <button
              type="button"
              style={quickCaptureSubmitBtn}
              onClick={handleQuickCaptureSubmit}
            >
              Add Note
            </button>
          )}

          {/* Storage Destination Mode Button on Desktop */}
          <button
            type="button"
            style={topBackupBtnStyle}
            onClick={() => {
              setIsInitialStoragePrompt(false);
              setIsStorageChoiceOpen(true);
            }}
            title="Change Storage Destination (Phone vs Google Drive)"
          >
            {storageDestination === "gdrive" ? (
              <Cloud size={13} color="#3b82f6" />
            ) : (
              <Smartphone size={13} color="#10b981" />
            )}
            <span>Storage: {storageDestination === "gdrive" ? "Google Drive" : "Phone"}</span>
          </button>

          {/* Install App Button on Desktop */}
          <button
            type="button"
            style={topBackupBtnStyle}
            onClick={() => setIsInstallModalOpen(true)}
            title="Download & Install Smart Notes"
          >
            <Download size={13} color="#4f46e5" />
            <span>Install App</span>
          </button>

          {/* Switch to Mobile Mode Button on Desktop */}
          <button
            type="button"
            style={topBackupBtnStyle}
            onClick={handleOpenMobilePopout}
            title="Pop out standalone mobile window"
          >
            <Smartphone size={13} color="#10b981" />
            <span>Mobile</span>
          </button>

          {/* Choose Tabs Button on Top Bar */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              style={topBackupBtnStyle}
              onClick={() => setIsTopTabMenuOpen((prev) => !prev)}
              title="Choose and toggle active tabs"
            >
              <Layers size={13} color="#2563eb" />
              <span>Tabs ({activeTabs.length}/6) ▾</span>
            </button>

            {isTopTabMenuOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "34px",
                  right: 0,
                  minWidth: "220px",
                  background: "var(--notion-card, #ffffff)",
                  border: "1px solid var(--notion-border, #edece9)",
                  borderRadius: "8px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                  padding: "6px",
                  zIndex: 100,
                  color: "var(--notion-text, #37352f)",
                }}
              >
                <div style={{ padding: "4px 8px", fontSize: "11.5px", fontWeight: "700", color: "var(--notion-text, #1f1e1d)" }}>
                  Active Tabs ({activeTabs.length}/6)
                </div>
                {TAB_DEFINITIONS.map((tab) => {
                  const isActive = activeTabs.includes(tab.id);
                  const Icon = tab.icon;
                  return (
                    <div
                      key={tab.id}
                      onClick={() => {
                        if (isActive) {
                          setActiveTab(tab.id);
                          setIsTopTabMenuOpen(false);
                        } else if (activeTabs.length < 6) {
                          handleAddTab(tab.id);
                        }
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "6px 8px",
                        borderRadius: "5px",
                        cursor: "pointer",
                        fontSize: "12px",
                        background: isActive ? "var(--notion-hover, #fafaf9)" : "transparent",
                        color: "var(--notion-text, #37352f)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Icon size={14} color={tab.color} />
                        <span style={{ fontWeight: isActive ? "600" : "400" }}>{tab.label}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (isActive) {
                            if (activeTabs.length > 1) handleCloseTab(tab.id);
                          } else {
                            if (activeTabs.length < 6) handleAddTab(tab.id);
                          }
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          
        </div>

        <ChromeTabStrip
          activeTabs={activeTabs}
          currentTab={activeTab}
          onSelectTab={handleSelectTab}
          onCloseTab={handleCloseTab}
          onAddTab={handleAddTab}
          onReorderTabs={(newTabs) => setActiveTabs(newTabs)}
          onOpenSettingsTabs={() => handleOpenSettingsWithTab("tabs")}
        />

        {activeReminderAlert && (
          <div
            style={{
              margin: "0 0 14px 0",
              padding: "10px 16px",
              background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
              color: "#ffffff",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 4px 14px rgba(79, 70, 229, 0.35)",
              flexWrap: "wrap",
              gap: "10px",
              zIndex: 50,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "20px" }}>⏰</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: "13px" }}>
                  Reminder Due: {activeReminderAlert.title}
                </div>
                <div style={{ fontSize: "11.5px", opacity: 0.9 }}>
                  Scheduled for today at {activeReminderAlert.time} • Category: {categories.find(c => c.id === (activeReminderAlert.categoryId || activeReminderAlert.folderId))?.title || "Note"}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => {
                  stopChimeLoop();
                  openNoteEditor(activeReminderAlert);
                  setActiveReminderAlert(null);
                }}
                style={{
                  background: "#ffffff",
                  color: "#4f46e5",
                  border: "none",
                  borderRadius: "6px",
                  padding: "6px 12px",
                  fontWeight: 600,
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Open Note
              </button>
              <button
                type="button"
                onClick={() => {
                  stopChimeLoop();
                  setActiveReminderAlert(null);
                }}
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "6px 12px",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {activeTab === "calendar" && (
          <CalendarDashboard
            date={date}
            setDate={setDate}
            allEvents={filteredEvents}
            setEvents={setEvents}
            handleDateClick={openCreateNotePanel}
            setSelectedEvent={openNoteEditor}
            setIsPreviewOpen={() => setIsNotePanelOpen(true)}
            onUpdateNoteStatus={handleUpdateNoteStatus}
            onJumpToMindMap={handleJumpToMindMap}
          />
        )}

        {activeTab === "mindmap" && (
          <MindMapView
            workspaceTitle={activeCategoryTitle}
            events={filteredEvents}
            onOpenNote={openNoteEditor}
            onCreateNote={() => openCreateNotePanel(new Date())}
            onUpdateNotePosition={(id, x, y) =>
              setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, x, y } : e)))
            }
            onUpdateNoteStatus={handleUpdateNoteStatus}
            onJumpToCalendar={handleJumpToCalendar}
            focusedNoteId={focusedNoteId}
          />
        )}

        {activeTab === "board" && (
          <KanbanBoardView
            events={filteredEvents}
            onOpenNote={openNoteEditor}
            onCreateNote={handleBoardCreateNote}
            onUpdateNoteStatus={handleUpdateNoteStatus}
            onJumpToCalendar={handleJumpToCalendar}
            onJumpToMindMap={handleJumpToMindMap}
          />
        )}

        {activeTab === "ai-analyzer" && (
          <AiAnalyzerSuite
            filteredEvents={filteredEvents}
            aiTargetNote={aiTargetNote}
            setAiTargetNote={setAiTargetNote}
            onSaveAnalysis={saveNoteAnalysis}
          />
        )}

        {activeTab === "tree-view" && (
          <TreeOfKnowledgeView
            events={events}
            categories={categories}
            onOpenNote={openNoteEditor}
            onCreateNote={openCreateNotePanel}
            onUpdateNoteStatus={handleUpdateNoteStatus}
            onJumpToCalendar={handleJumpToCalendar}
            onAddCategory={handleAddCategory}
            onDeleteCategory={handleDeleteCategory}
            onRequestDeleteCategory={(cat) => setCategoryToDelete(cat)}
          />
        )}

        {activeTab === "a2-map" && (
          <A2MindMapCanvas />
        )}
      </div>

      <NoteEditorPanel
        isOpen={isNotePanelOpen}
        mode={notePanelMode}
        editorKey={editingId ?? "new"}
        form={form}
        setForm={setForm}
        categories={categories}
        onSave={handleSaveNote}
        onClose={closeNotePanel}
        onDelete={notePanelMode === "edit" && selectedEvent ? () => setNoteToDelete(selectedEvent) : undefined}
        noteRecord={selectedEvent}
        onSaveAnalysis={saveNoteAnalysis}
        onJumpToCalendar={handleJumpToCalendar}
        onJumpToMindMap={handleJumpToMindMap}
        onJumpToBoard={handleJumpToBoard}
        onJumpToTree={handleJumpToTree}
      />

      <PdfImportModal
        isOpen={isPdfImportOpen}
        onClose={() => setIsPdfImportOpen(false)}
        folders={categories.map((c) => ({ id: c.id, title: c.title }))}
        onConfirm={handlePdfImportConfirm}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        events={events}
        categories={categories}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((prev) => !prev)}
        activeTabs={activeTabs}
        onToggleTab={handleToggleTab}
        initialTab={settingsInitialTab}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onImportEvents={handleImportEvents}
        onOpenStorageChoice={() => {
          setIsInitialStoragePrompt(false);
          setIsStorageChoiceOpen(true);
        }}
        onOpenInstallApp={() => setIsInstallModalOpen(true)}
      />

      <CalendarSyncModal
        isOpen={isCalendarSyncOpen}
        onClose={() => setIsCalendarSyncOpen(false)}
        events={events}
        categories={categories}
        onImportEvents={handleImportEvents}
        onOpenStorageSettings={() => setIsStorageChoiceOpen(true)}
      />
      <StorageChoiceModal
        isOpen={isStorageChoiceOpen}
        onClose={() => {
          setIsStorageChoiceOpen(false);
          setIsInitialStoragePrompt(false);
        }}
        onStorageChanged={(mode) => setStorageDestinationState(mode)}
        isInitialPrompt={isInitialStoragePrompt}
      />

      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        deferredInstallPrompt={deferredPrompt}
      />

      
      {/* Double Confirmation Modal for Category Deletion */}
      {categoryToDelete && (
        <div className="notion-delete-confirm-overlay" onClick={() => setCategoryToDelete(null)}>
          <div className="notion-delete-confirm-card" onClick={(e) => e.stopPropagation()}>
            <div className="notion-delete-confirm-icon-badge">
              <AlertTriangle size={24} color="#ef4444" />
            </div>
            <h3 className="notion-delete-confirm-title">Delete topic "{categoryToDelete.title}"?</h3>
            <p className="notion-delete-confirm-desc">
              Are you sure you want to permanently delete topic <strong>"{categoryToDelete.title}"</strong>?
              {events.filter((e) => (e.categoryId || e.folderId) === categoryToDelete.id).length > 0
                ? ` The ${events.filter((e) => (e.categoryId || e.folderId) === categoryToDelete.id).length} note(s) in this topic will remain safe in "All Notes".`
                : " This action cannot be undone."}
            </p>
            <div className="notion-delete-confirm-actions">
              <button
                type="button"
                className="notion-delete-confirm-btn notion-delete-confirm-btn--cancel"
                onClick={() => setCategoryToDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="notion-delete-confirm-btn notion-delete-confirm-btn--danger"
                onClick={() => {
                  handleDeleteCategory(categoryToDelete.id);
                  setCategoryToDelete(null);
                }}
              >
                <Trash2 size={13} />
                <span>Delete Topic</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Double Confirmation Modal for Note Deletion */}
      {noteToDelete && (
        <div className="notion-delete-confirm-overlay" onClick={() => setNoteToDelete(null)}>
          <div className="notion-delete-confirm-card" onClick={(e) => e.stopPropagation()}>
            <div className="notion-delete-confirm-icon-badge">
              <AlertTriangle size={24} color="#ef4444" />
            </div>
            <h3 className="notion-delete-confirm-title">Delete this note?</h3>
            <p className="notion-delete-confirm-desc">
              Are you sure you want to permanently delete <strong>"{noteToDelete.title || "Untitled Note"}"</strong>? This action cannot be undone.
            </p>
            <div className="notion-delete-confirm-actions">
              <button
                type="button"
                className="notion-delete-confirm-btn notion-delete-confirm-btn--cancel"
                onClick={() => setNoteToDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="notion-delete-confirm-btn notion-delete-confirm-btn--danger"
                onClick={() => {
                  deleteNotification(noteToDelete.id);
                  setNoteToDelete(null);
                }}
              >
                <Trash2 size={13} />
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 🎨 NOTION MINIMALIST STYLE TOKENS
// ==========================================
const workspaceContainer = { display: "flex", height: "100%", width: "100%", fontFamily: "var(--notion-font)", background: "var(--notion-bg, #ffffff)", color: "var(--notion-text, #37352f)" };

const sidebarStyle = { width: "240px", flexShrink: 0, background: "var(--notion-sidebar, #f7f7f5)", color: "var(--notion-text, #37352f)", padding: "16px 12px", display: "flex", flexDirection: "column", justifyContent: "space-between", borderRight: "1px solid var(--notion-border, #edece9)", overflowY: "auto" };

const sidebarTitle = {
  margin: 0,
  fontSize: "11px",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--notion-secondary, #787774)",
  fontWeight: "600",
};

const addFolderToggleBtn = {
  background: "none",
  border: "none",
  color: "var(--notion-secondary, #787774)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "2px",
  borderRadius: "4px",
};

const deleteContentContainer = {
  display: "block",
  maxWidth: "130px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: "13px",
};

const folderActionBtnDelete = {
  position: "absolute",
  right: "6px",
  background: "transparent",
  color: "var(--notion-secondary, #9b9a97)",
  border: "none",
  borderRadius: "4px",
  padding: "2px 4px",
  fontSize: "11px",
  cursor: "pointer",
  opacity: 0.6,
  transition: "opacity 0.12s ease, color 0.12s ease",
};

const folderItem = { display: "flex", alignItems: "center", gap: "8px", padding: "6px 8px", borderRadius: "5px", cursor: "pointer", fontSize: "13px", color: "var(--notion-text, #37352f)", transition: "background 0.12s ease" };

const quickNoteButton = { background: "var(--notion-card, #ffffff)", color: "var(--notion-text, #37352f)", border: "1px solid var(--notion-border, #edece9)", borderRadius: "6px", padding: "8px 12px", fontSize: "13px", fontWeight: "500", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)", transition: "background 0.12s ease" };

const pdfImportSidebarBtn = {
  background: "transparent",
  color: "var(--notion-secondary, #787774)",
  border: "1px dashed var(--notion-border, #edece9)",
  borderRadius: "6px",
  padding: "7px 12px",
  fontSize: "12px",
  fontWeight: "500",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
  transition: "background 0.12s ease, color 0.12s ease",
};

const settingsSidebarBtn = {
  background: "transparent",
  color: "var(--notion-secondary, #787774)",
  border: "1px solid var(--notion-border, #edece9)",
  borderRadius: "6px",
  padding: "7px 12px",
  fontSize: "12px",
  fontWeight: "500",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
  transition: "background 0.12s ease, color 0.12s ease",
};

const sidebarReopenBtn = {
  background: "transparent",
  border: "1px solid var(--notion-border, #edece9)",
  color: "var(--notion-secondary, #787774)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "4px 6px",
  borderRadius: "4px",
  marginRight: "4px",
  transition: "background 0.12s, color 0.12s",
};

const mainContentStyle = { flex: 1, minWidth: 0, padding: "16px 32px 32px 32px", display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto", background: "var(--notion-bg, #ffffff)", color: "var(--notion-text, #37352f)" };

const quickCaptureBarStyle = { position: "sticky", top: 0, zIndex: 40, display: "flex", alignItems: "center", gap: "8px", background: "var(--notion-card, #ffffff)", border: "1px solid var(--notion-border, #edece9)", borderRadius: "8px", padding: "8px 12px", boxShadow: "0 2px 6px rgba(0, 0, 0, 0.04)" };

const quickCaptureInputStyle = { flex: 1, border: "none", background: "transparent", outline: "none", fontSize: "13px", color: "var(--notion-text, #37352f)", fontFamily: "inherit" };

const quickCaptureSubmitBtn = {
  background: "#4f46e5",
  color: "#ffffff",
  border: "none",
  borderRadius: "4px",
  padding: "4px 8px",
  fontSize: "11px",
  fontWeight: "500",
  cursor: "pointer",
  flexShrink: 0,
};

const topBackupBtnStyle = {
  background: "var(--notion-plate, #f7f7f5)",
  border: "1px solid var(--notion-border, #edece9)",
  borderRadius: "6px",
  padding: "5px 10px",
  fontSize: "12px",
  fontWeight: "500",
  color: "var(--notion-text, #37352f)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "5px",
  flexShrink: 0,
  transition: "all 0.12s ease",
};

const categoryCountBadge = {
  fontSize: "11px",
  color: "var(--notion-secondary, #9b9a97)",
  fontWeight: "500",
  marginLeft: "auto",
  marginRight: "18px",
};

const inlineAddCategoryCard = { background: "var(--notion-card, #ffffff)", border: "1px solid var(--notion-border, #edece9)", borderRadius: "6px", padding: "8px", marginBottom: "8px", display: "flex", flexDirection: "column", gap: "6px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" };

const inlineAddInput = { width: "100%", border: "1px solid var(--notion-border, #edece9)", borderRadius: "4px", padding: "4px 6px", fontSize: "12px", color: "var(--notion-text, #37352f)", outline: "none", boxSizing: "border-box", background: "transparent" };

const inlineColorRow = {
  display: "flex",
  gap: "4px",
  flexWrap: "wrap",
  marginTop: "2px",
};

const inlineColorSwatch = {
  width: "14px",
  height: "14px",
  borderRadius: "50%",
  cursor: "pointer",
  padding: 0,
  transition: "transform 0.1s ease",
};

const inlineAddSaveBtn = {
  background: "#37352f",
  color: "#ffffff",
  border: "none",
  borderRadius: "4px",
  padding: "3px 8px",
  fontSize: "11px",
  fontWeight: "500",
  cursor: "pointer",
};

const inlineAddCancelBtn = {
  background: "transparent",
  color: "#787774",
  border: "1px solid #edece9",
  borderRadius: "4px",
  padding: "3px 8px",
  fontSize: "11px",
  cursor: "pointer",
};