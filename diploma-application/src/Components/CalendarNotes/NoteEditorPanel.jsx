import React, { useCallback, useEffect, useRef, useState } from "react";
import { 
  FileText,
  Columns2,
  Maximize2, 
  Sparkles, 
  Paperclip, 
  Bell, 
  Clock, 
  Calendar as CalendarIcon, 
  CalendarDays, 
  Network, 
  Kanban, 
  Pencil, 
  Trees, 
  Smartphone,
  Film,
  Image as ImageIcon,
  Music,
  Upload,
  X,
  Check
} from "lucide-react";
import { exportSingleNoteIcs } from "./exportIcs";
import { requestNotificationPermission, getNotificationPermissionStatus } from "../../utils/notificationService";
import { fileToAttachment, parseVideoUrl, getClipboardImage } from "../../utils/mediaUtils";
import NoteAnalysisView from "./NoteAnalysisView";
import NoteDrawingCanvas from "./NoteDrawingCanvas";
import RichMediaViewer from "./RichMediaViewer";
import "./NoteEditorPanel.css";
import "./NoteAnalysisView.css";

const FONT_SIZE_OPTIONS = [
  { value: 14, label: "Small" },
  { value: 16, label: "Normal" },
  { value: 18, label: "Medium" },
  { value: 22, label: "Large" },
  { value: 28, label: "Extra large" },
];

const HISTORY_LIMIT = 80;
const HISTORY_DEBOUNCE_MS = 350;

const loadContentHtml = (raw = "") => {
  if (!raw) return "";
  if (/<[a-z][\s\S]*>/i.test(raw)) return raw;
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
};

function stripHtml(html = "") {
  return String(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getGoogleCalendarUrl(note, form = {}) {
  const title = encodeURIComponent(form.title || note?.title || "Note");
  const rawText = stripHtml(form.content || note?.content || "");
  const details = encodeURIComponent(rawText);
  const rawDate = form.date || note?.date || "";
  const dateStr = rawDate.replace(/-/g, "");
  let dates = dateStr ? `${dateStr}/${dateStr}` : "";
  if (dateStr && (form.time || note?.time)) {
    const timeVal = form.time || note?.time || "12:00";
    const [h, m] = timeVal.split(":").map(Number);
    const startH = String(isNaN(h) ? 12 : h).padStart(2, "0");
    const startM = String(isNaN(m) ? 0 : m).padStart(2, "0");
    const endH = String(((isNaN(h) ? 12 : h) + 1) % 24).padStart(2, "0");
    const endM = String(isNaN(m) ? 0 : m).padStart(2, "0");
    dates = `${dateStr}T${startH}${startM}00/${dateStr}T${endH}${endM}00`;
  }
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}${dates ? `&dates=${dates}` : ""}`;
}

const snapshotsEqual = (a, b) =>
  a.title === b.title &&
  a.content === b.content &&
  a.fontSize === b.fontSize &&
  a.align === b.align;

export default function NoteEditorPanel({
  isOpen,
  mode = "create",
  editorKey,
  form,
  setForm,
  contextLabel,
  onSave,
  onClose,
  onDelete,
  noteRecord,
  onSaveAnalysis,
  onJumpToCalendar,
  onJumpToMindMap,
  onJumpToBoard,
  onJumpToTree,
  categories = [],
}) {
  const titleRef = useRef(null);
  const contentRef = useRef(null);
  const imageInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const dragCounterRef = useRef(0);

  const loadedKeyRef = useRef(null);
  const formRef = useRef(form);
  const historyRef = useRef({ past: [], future: [], skip: false });
  const historyTimerRef = useRef(null);

  const [formatState, setFormatState] = useState({ bold: false, italic: false });
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [panelView, setPanelView] = useState("note"); // 'note' | 'drawing' | 'analysis'
  const [titleError, setTitleError] = useState("");
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [videoInputUrl, setVideoInputUrl] = useState("");
  const [videoInputError, setVideoInputError] = useState("");
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const [layoutMode, setLayoutMode] = useState(() => {
    try {
      return localStorage.getItem("note_editor_layout_mode") || "modal";
    } catch {}
    return "modal";
  });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const toggleLayoutMode = () => {
    const next = layoutMode === "modal" ? "split" : "modal";
    setLayoutMode(next);
    try {
      localStorage.setItem("note_editor_layout_mode", next);
    } catch {}
  };

  const handleToggleReminder = async (checked) => {
    setForm((prev) => ({ ...prev, reminder: checked }));
    if (checked) {
      try {
        const perm = getNotificationPermissionStatus();
        if (perm === "default") {
          await requestNotificationPermission();
        }
      } catch {}
    }
  };

  useEffect(() => {
    setPanelView("note");
    setTitleError("");
    setIsAttachMenuOpen(false);
    setIsVideoModalOpen(false);
    setVideoInputUrl("");
    dragCounterRef.current = 0;
    setIsDraggingOver(false);
  }, [editorKey, isOpen]);

  // Window drag & drop event prevention
  useEffect(() => {
    if (!isOpen) return undefined;

    const preventDefaults = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener("dragover", preventDefaults, false);
    window.addEventListener("drop", preventDefaults, false);

    return () => {
      window.removeEventListener("dragover", preventDefaults, false);
      window.removeEventListener("drop", preventDefaults, false);
    };
  }, [isOpen]);

  formRef.current = form;

  const getSnapshot = useCallback(() => ({
    title: titleRef.current?.value ?? formRef.current.title ?? "",
    content: contentRef.current?.innerHTML ?? formRef.current.content ?? "",
    fontSize: formRef.current.fontSize || 16,
    align: formRef.current.align || "left",
  }), []);

  const refreshHistoryFlags = useCallback(() => {
    const { past, future } = historyRef.current;
    setCanUndo(past.length > 1);
    setCanRedo(future.length > 0);
  }, []);

  const applySnapshot = useCallback(
    (snapshot) => {
      historyRef.current.skip = true;

      setForm((prev) => ({
        ...prev,
        title: snapshot.title,
        content: snapshot.content,
        fontSize: snapshot.fontSize,
        align: snapshot.align,
      }));

      if (titleRef.current) {
        titleRef.current.value = snapshot.title;
        titleRef.current.style.fontSize = "";
      }

      if (contentRef.current) {
        contentRef.current.innerHTML = loadContentHtml(snapshot.content);
        contentRef.current.style.fontSize = `${snapshot.fontSize}px`;
      }

      historyRef.current.skip = false;
      refreshFormatState();
      refreshHistoryFlags();
    },
    [setForm, refreshHistoryFlags]
  );

  const pushHistory = useCallback(
    (immediate = false) => {
      if (historyRef.current.skip) return;

      const commit = () => {
        const snapshot = getSnapshot();
        const past = historyRef.current.past;
        const last = past[past.length - 1];

        if (last && snapshotsEqual(last, snapshot)) {
          refreshHistoryFlags();
          return;
        }

        past.push(snapshot);
        if (past.length > HISTORY_LIMIT) {
          past.shift();
        }
        historyRef.current.future = [];
        refreshHistoryFlags();
      };

      if (immediate) {
        if (historyTimerRef.current) {
          clearTimeout(historyTimerRef.current);
          historyTimerRef.current = null;
        }
        commit();
        return;
      }

      if (historyTimerRef.current) {
        clearTimeout(historyTimerRef.current);
      }

      historyTimerRef.current = setTimeout(() => {
        historyTimerRef.current = null;
        commit();
      }, HISTORY_DEBOUNCE_MS);
    },
    [getSnapshot, refreshHistoryFlags]
  );

  const undo = useCallback(() => {
    if (historyTimerRef.current) {
      clearTimeout(historyTimerRef.current);
      historyTimerRef.current = null;
      pushHistory(true);
    }

    const { past, future } = historyRef.current;
    if (past.length <= 1) return;

    const current = past.pop();
    future.push(current);
    applySnapshot(past[past.length - 1]);
  }, [applySnapshot, pushHistory]);

  const redo = useCallback(() => {
    const { past, future } = historyRef.current;
    if (future.length === 0) return;

    const next = future.pop();
    past.push(next);
    applySnapshot(next);
  }, [applySnapshot]);

  const refreshFormatState = () => {
    setFormatState({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
    });
  };

  const syncTitleToForm = () => {
    if (!titleRef.current) return;
    setForm((prev) => ({ ...prev, title: titleRef.current.value }));
  };

  const handleContentInput = () => {
    if (!contentRef.current) return;
    setForm((prev) => ({ ...prev, content: contentRef.current.innerHTML }));
    pushHistory();
  };

  const handleTitleInput = () => {
    syncTitleToForm();
    if (titleRef.current?.value?.trim()) {
      setTitleError("");
    }
    pushHistory();
  };

  // ==========================================
  // 📎 MEDIA & ATTACHMENT HANDLERS
  // ==========================================
  const handleFilesUpload = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const filesArray = Array.from(fileList);
    const newAttachments = [];

    for (const file of filesArray) {
      try {
        const att = await fileToAttachment(file);
        if (att) newAttachments.push(att);
      } catch (err) {
        console.warn("Failed to process attachment:", err);
      }
    }

    if (newAttachments.length > 0) {
      setForm((prev) => ({
        ...prev,
        attachments: [...(prev.attachments || []), ...newAttachments],
      }));
      showToast(`📎 Attached ${newAttachments.length} file${newAttachments.length > 1 ? "s" : ""}`);
    }
  };

  const handleFileInputChange = (e) => {
    handleFilesUpload(e.target.files);
    e.target.value = "";
    setIsAttachMenuOpen(false);
  };

  // 📸 CLIPBOARD PASTE LISTENER (Ctrl+V Screenshots)
  const handlePaste = async (e) => {
    const imgFile = getClipboardImage(e);
    if (imgFile) {
      e.preventDefault();
      try {
        const att = await fileToAttachment(imgFile);
        if (att) {
          att.name = `Screenshot_${new Date().toLocaleTimeString().replace(/:/g, "-")}.png`;
          setForm((prev) => ({
            ...prev,
            attachments: [...(prev.attachments || []), att],
          }));
          showToast("📸 Screenshot pasted from clipboard!");
        }
      } catch (err) {
        console.warn("Screenshot paste error:", err);
      }
    }
  };

  // 📥 DRAG & DROP HANDLERS
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer && e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingOver(true);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "copy";
    }
    if (!isDraggingOver) setIsDraggingOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDraggingOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDraggingOver(false);
    if (e.dataTransfer?.files?.length > 0) {
      handleFilesUpload(e.dataTransfer.files);
    }
  };

  // 🎥 VIDEO EMBED SUBMIT
  const handleAddVideoSubmit = (e) => {
    e.preventDefault();
    setVideoInputError("");

    if (!videoInputUrl.trim()) {
      setVideoInputError("Please enter a video URL.");
      return;
    }

    const parsed = parseVideoUrl(videoInputUrl.trim());
    if (!parsed) {
      setVideoInputError("Unsupported video URL. Please enter a valid YouTube, Vimeo, Loom, or MP4 link.");
      return;
    }

    const videoObj = {
      id: `vid_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      ...parsed,
      createdAt: new Date().toISOString(),
    };

    setForm((prev) => ({
      ...prev,
      mediaLinks: [...(prev.mediaLinks || []), videoObj],
    }));

    setVideoInputUrl("");
    setIsVideoModalOpen(false);
    showToast("🎥 Video embedded successfully!");
  };

  const handleRemoveAttachment = (id) => {
    setForm((prev) => ({
      ...prev,
      attachments: (prev.attachments || []).filter((a) => a.id !== id),
    }));
  };

  const handleRemoveMediaLink = (id) => {
    setForm((prev) => ({
      ...prev,
      mediaLinks: (prev.mediaLinks || []).filter((m, idx) => (m.id || idx) !== id),
    }));
  };

  const handleSaveClick = useCallback(() => {
    const rawTitle = (titleRef.current?.value ?? formRef.current.title ?? "").trim();
    if (!rawTitle) {
      setTitleError("Note title is required to save.");
      setPanelView("note");
      titleRef.current?.focus();
      return false;
    }
    setTitleError("");

    if (historyTimerRef.current) {
      clearTimeout(historyTimerRef.current);
      historyTimerRef.current = null;
    }

    const savedForm = {
      ...formRef.current,
      title: rawTitle,
      content: contentRef.current?.innerHTML || formRef.current.content || "",
      isBold: false,
      isItalic: false,
      attachments: formRef.current.attachments || [],
      mediaLinks: formRef.current.mediaLinks || [],
    };
    setForm(savedForm);
    onSave(savedForm);
    return true;
  }, [onSave, setForm]);

  const applyFontSize = (sizeValue) => {
    const size = Number(sizeValue);
    pushHistory(true);

    setForm((prev) => ({ ...prev, fontSize: size }));

    const titleFocused = document.activeElement === titleRef.current;
    if (titleFocused && titleRef.current) {
      titleRef.current.style.fontSize = `${size}px`;
      pushHistory();
      return;
    }

    contentRef.current?.focus();
    const selection = window.getSelection();

    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      if (contentRef.current?.contains(range.commonAncestorContainer)) {
        const span = document.createElement("span");
        span.style.fontSize = `${size}px`;
        try {
          range.surroundContents(span);
        } catch {
          const fragment = range.extractContents();
          span.appendChild(fragment);
          range.insertNode(span);
        }
        handleContentInput();
        pushHistory(true);
        return;
      }
    }

    if (contentRef.current) {
      contentRef.current.style.fontSize = `${size}px`;
    }
    pushHistory(true);
  };

  useEffect(() => {
    if (!isOpen) {
      loadedKeyRef.current = null;
      if (historyTimerRef.current) {
        clearTimeout(historyTimerRef.current);
        historyTimerRef.current = null;
      }
      return;
    }
    if (loadedKeyRef.current === editorKey) return;

    loadedKeyRef.current = editorKey;
    const size = formRef.current.fontSize || 16;

    if (contentRef.current) {
      contentRef.current.innerHTML = loadContentHtml(formRef.current.content);
      contentRef.current.style.fontSize = `${size}px`;
    }
    if (titleRef.current) {
      titleRef.current.value = formRef.current.title || "";
      titleRef.current.style.fontSize = "";
    }

    historyRef.current = {
      past: [getSnapshot()],
      future: [],
      skip: false,
    };
    refreshHistoryFlags();
    refreshFormatState();
  }, [isOpen, editorKey, getSnapshot, refreshHistoryFlags]);

  useEffect(() => {
    if (isOpen && titleRef.current && panelView === "note") {
      titleRef.current.focus();
    }
  }, [isOpen, editorKey, panelView]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      const mod = event.ctrlKey || event.metaKey;
      if (mod && (event.key === "s" || event.key === "S")) {
        event.preventDefault();
        handleSaveClick();
        return;
      }
      if (mod && (event.key === "z" || event.key === "Z")) {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }
      if (mod && (event.key === "y" || event.key === "Y")) {
        event.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleSaveClick, undo, redo]);

  const applyFormat = (command) => {
    contentRef.current?.focus();
    document.execCommand(command, false, null);
    refreshFormatState();
    handleContentInput();
  };

  const handleAlignChange = (alignment) => {
    pushHistory(true);
    setForm((prev) => ({ ...prev, align: alignment }));
    pushHistory(true);
  };

  const handleContentKeyDown = (event) => {
    if (event.key === "Tab") {
      event.preventDefault();
      document.execCommand("insertText", false, "  ");
      handleContentInput();
    }
  };

  if (!isOpen) return null;

  const isEdit = mode === "edit";
  const analysisNote = noteRecord || {
    id: "temp-preview",
    title: form.title,
    content: form.content,
    date: form.date,
    time: form.time,
    status: form.status,
    categoryId: form.categoryId,
    color: form.color,
  };

  const totalMediaCount = (form.attachments?.length || 0) + (form.mediaLinks?.length || 0);

  return (
    <div 
      className={"note-editor-backdrop " + (layoutMode === "split" ? "is-split" : "")} 
      onClick={handleSaveClick}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden File Inputs for Toolbar Menu */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={handleFileInputChange}
      />
      <input
        ref={pdfInputRef}
        type="file"
        accept=".pdf,application/pdf"
        multiple
        style={{ display: "none" }}
        onChange={handleFileInputChange}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        multiple
        style={{ display: "none" }}
        onChange={handleFileInputChange}
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: "none" }}
        onChange={handleFileInputChange}
      />

      <div
        className={"note-editor-panel " + (isDraggingOver ? "is-dragging-files" : "")}
        onClick={(event) => event.stopPropagation()}
        onPaste={handlePaste}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? "Edit note" : "New note"}
      >
        {/* Toast Notification */}
        {toastMsg && (
          <div className="note-editor-toast">
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Drag & Drop Visual Overlay */}
        {isDraggingOver && (
          <div 
            className="note-editor-drag-overlay"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="note-editor-drag-box">
              <Upload size={38} color="#4f46e5" />
              <h3>Drop Files, Photos, or PDFs Here</h3>
              <p>They will be instantly attached and embedded in this note</p>
            </div>
          </div>
        )}

        <header className="note-editor-topbar">
          <div className="note-editor-topbar-left">
            <div className="note-editor-view-switch">
              <button
                type="button"
                className={`note-editor-view-btn ${panelView === "note" ? "is-active" : ""}`}
                onClick={() => setPanelView("note")}
              >
                <FileText size={15} />
                Note
              </button>
              <button
                type="button"
                className={`note-editor-view-btn ${panelView === "drawing" ? "is-active" : ""}`}
                onClick={() => setPanelView("drawing")}
                title="Hand-drawn diagram or sketch"
              >
                <Pencil size={15} />
                Sketch {form.drawingDataUrl ? "✓" : ""}
              </button>
              {isEdit && (
                <button
                  type="button"
                  className={`note-editor-view-btn ${panelView === "analysis" ? "is-active" : ""}`}
                  onClick={() => setPanelView("analysis")}
                >
                  <Sparkles size={15} />
                  Analysis
                </button>
              )}
            </div>
          </div>
          <div className="note-editor-topbar-right">
            {isEdit && onDelete && (
              <button type="button" className="note-editor-link note-editor-link--danger" onClick={onDelete}>
                Delete
              </button>
            )}
            <button
              type="button"
              className={"note-editor-layout-btn " + (layoutMode === "split" ? "is-active" : "")}
              onClick={toggleLayoutMode}
              title={layoutMode === "split" ? "Switch to Centered Modal View" : "Dock to Right (Split-View with Tree & Mind Map)"}
            >
              {layoutMode === "split" ? <Maximize2 size={13} /> : <Columns2 size={13} />}
              <span>{layoutMode === "split" ? "Modal" : "Split-View"}</span>
            </button>
            <button type="button" className="note-editor-save" onClick={handleSaveClick}>
              Done
            </button>
            <button
              type="button"
              className="note-editor-close"
              onClick={() => {
                setTitleError("");
                if (onClose) onClose();
              }}
              aria-label="Close"
              title="Close editor"
            >
              ×
            </button>
          </div>
        </header>

        {isEdit && (onJumpToCalendar || onJumpToMindMap || onJumpToBoard || onJumpToTree) && (
          <div className="note-editor-jump-bar">
            <span className="note-editor-jump-label">Cross-Screen Jump:</span>
            {onJumpToCalendar && (
              <button
                type="button"
                className="note-editor-jump-btn"
                onClick={() => {
                  const ok = handleSaveClick();
                  if (ok) onJumpToCalendar(form.date || noteRecord?.date);
                }}
                title="Open this note in Calendar View"
              >
                <CalendarIcon size={12} /> Calendar ({form.date || noteRecord?.date || "Today"})
              </button>
            )}
            {onJumpToMindMap && noteRecord?.id && (
              <button
                type="button"
                className="note-editor-jump-btn"
                onClick={() => {
                  const ok = handleSaveClick();
                  if (ok) onJumpToMindMap(noteRecord.id);
                }}
                title="Locate and center this node in Mind Map"
              >
                <Network size={12} /> Mind Map
              </button>
            )}
            {onJumpToBoard && (
              <button
                type="button"
                className="note-editor-jump-btn"
                onClick={() => {
                  const ok = handleSaveClick();
                  if (ok) onJumpToBoard(noteRecord?.id);
                }}
                title="View this card in Board View"
              >
                <Kanban size={12} /> Board
              </button>
            )}
            {onJumpToTree && (
              <button
                type="button"
                className="note-editor-jump-btn"
                onClick={() => {
                  const ok = handleSaveClick();
                  if (ok) onJumpToTree(form.categoryId || noteRecord?.categoryId);
                }}
                title="View this note in Tree of Notes View"
              >
                <Trees size={12} /> Tree
              </button>
            )}
            <a
              href={getGoogleCalendarUrl(noteRecord, form)}
              target="_blank"
              rel="noreferrer"
              className="note-editor-jump-btn"
              style={{ color: "#2563eb", textDecoration: "none" }}
              title="Add this note directly to your Google Calendar in 1 click"
            >
              <CalendarIcon size={12} /> + Google Cal
            </a>
            <button
              type="button"
              className="note-editor-jump-btn"
              style={{ color: "#111827" }}
              onClick={() => {
                const catObj = categories.find((c) => c.id === (form.categoryId || noteRecord?.categoryId));
                exportSingleNoteIcs({ ...noteRecord, ...form }, catObj?.title || "General", "apple");
              }}
              title="Add this note directly to your Apple / iPhone Calendar (.ics)"
            >
              <Smartphone size={12} /> + iPhone Cal
            </button>
          </div>
        )}

        {panelView === "analysis" ? (
          <div className="note-editor-analysis">
            <NoteAnalysisView
              note={analysisNote}
              onSaveAnalysis={onSaveAnalysis}
              compact
            />
          </div>
        ) : panelView === "drawing" ? (
          <div className="note-editor-drawing-view" style={{ padding: "16px" }}>
            <NoteDrawingCanvas
              initialDrawing={form.drawingDataUrl || ""}
              onDrawingChange={(dataUrl) => {
                setForm((prev) => ({ ...prev, drawingDataUrl: dataUrl }));
              }}
            />
          </div>
        ) : (
          <>
            <div className="note-editor-formatbar">
              {categories?.length > 0 && (
                <label className="note-editor-font-picker">
                  <span>Category</span>
                  <select
                    className="note-editor-format-select note-editor-format-select--status"
                    value={form.categoryId || "work"}
                    onChange={(e) => {
                      const chosenCat = categories.find((c) => c.id === e.target.value);
                      setForm((prev) => ({
                        ...prev,
                        categoryId: e.target.value,
                        folderId: e.target.value,
                        color: chosenCat?.color || prev.color,
                      }));
                    }}
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.title}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="note-editor-font-picker">
                <span>Status</span>
                <select
                  className="note-editor-format-select note-editor-format-select--status"
                  value={form.status || "todo"}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                >
                  <option value="todo">⚪ To Do</option>
                  <option value="in-progress">⏳ In Progress</option>
                  <option value="done">✅ Completed</option>
                </select>
              </label>

              <span className="note-editor-format-divider" />

              {/* 🌟 ATTACH / EMBED MEDIA DROPDOWN */}
              <div className="note-editor-attach-dropdown-wrapper">
                <button
                  type="button"
                  className={`note-editor-attach-btn ${isAttachMenuOpen ? "is-active" : ""}`}
                  onClick={() => setIsAttachMenuOpen((prev) => !prev)}
                  title="Attach photos, videos, PDFs, audio, or files"
                >
                  <Paperclip size={13} />
                  <span>+ Attach {totalMediaCount > 0 ? `(${totalMediaCount})` : ""}</span>
                </button>

                {isAttachMenuOpen && (
                  <div className="note-editor-attach-menu" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="note-editor-attach-menu-item"
                      onClick={() => {
                        imageInputRef.current?.click();
                        setIsAttachMenuOpen(false);
                      }}
                    >
                      <ImageIcon size={15} color="#10b981" />
                      <div className="note-editor-attach-menu-text">
                        <strong>Photos & Screenshots</strong>
                        <small>Upload images or press Ctrl+V to paste</small>
                      </div>
                    </button>

                    <button
                      type="button"
                      className="note-editor-attach-menu-item"
                      onClick={() => {
                        setIsVideoModalOpen(true);
                        setIsAttachMenuOpen(false);
                      }}
                    >
                      <Film size={15} color="#ef4444" />
                      <div className="note-editor-attach-menu-text">
                        <strong>Video Link / Embed</strong>
                        <small>YouTube, Vimeo, Loom, MP4 player</small>
                      </div>
                    </button>

                    <button
                      type="button"
                      className="note-editor-attach-menu-item"
                      onClick={() => {
                        pdfInputRef.current?.click();
                        setIsAttachMenuOpen(false);
                      }}
                    >
                      <FileText size={15} color="#dc2626" />
                      <div className="note-editor-attach-menu-text">
                        <strong>PDF Document</strong>
                        <small>Attach PDF with inline reader</small>
                      </div>
                    </button>

                    <button
                      type="button"
                      className="note-editor-attach-menu-item"
                      onClick={() => {
                        audioInputRef.current?.click();
                        setIsAttachMenuOpen(false);
                      }}
                    >
                      <Music size={15} color="#8b5cf6" />
                      <div className="note-editor-attach-menu-text">
                        <strong>Audio / Voice Note</strong>
                        <small>Upload MP3 or audio clip</small>
                      </div>
                    </button>

                    <button
                      type="button"
                      className="note-editor-attach-menu-item"
                      onClick={() => {
                        fileInputRef.current?.click();
                        setIsAttachMenuOpen(false);
                      }}
                    >
                      <Upload size={15} color="#3b82f6" />
                      <div className="note-editor-attach-menu-text">
                        <strong>Any Document / File</strong>
                        <small>Word, Excel, ZIP, code archive</small>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              <span className="note-editor-format-divider" />
              <button
                type="button"
                className={`note-editor-format ${formatState.bold ? "is-active" : ""}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => applyFormat("bold")}
                aria-label="Bold selection"
              >
                B
              </button>
              <button
                type="button"
                className={`note-editor-format ${formatState.italic ? "is-active" : ""}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => applyFormat("italic")}
                aria-label="Italic selection"
              >
                I
              </button>
              <button
                type="button"
                className="note-editor-format"
                onClick={undo}
                disabled={!canUndo}
                aria-label="Undo"
                title="Undo (Ctrl+Z)"
              >
                Undo
              </button>
              <button
                type="button"
                className="note-editor-format note-editor-format--wide"
                onClick={redo}
                disabled={!canRedo}
                aria-label="Redo"
                title="Redo (Ctrl+Y)"
              >
                Redo
              </button>
              <span className="note-editor-format-divider" />
              <label className="note-editor-font-picker">
                <span>Size</span>
                <select
                  className="note-editor-format-select note-editor-format-select--font"
                  value={form.fontSize || 16}
                  onChange={(event) => applyFontSize(event.target.value)}
                >
                  {FONT_SIZE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} ({option.value}px)
                    </option>
                  ))}
                </select>
              </label>
              <label className="note-editor-font-picker">
                <span>Align</span>
                <select
                  className="note-editor-format-select"
                  value={form.align}
                  onChange={(event) => handleAlignChange(event.target.value)}
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </label>
            </div>

            {/* VIDEO EMBED PROMPT MODAL */}
            {isVideoModalOpen && (
              <div className="note-video-modal-backdrop" onClick={() => setIsVideoModalOpen(false)}>
                <div className="note-video-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="note-video-modal-header">
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Film size={18} color="#ef4444" />
                      <strong>Embed Video into Note</strong>
                    </div>
                    <button
                      type="button"
                      className="note-video-modal-close"
                      onClick={() => setIsVideoModalOpen(false)}
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <form onSubmit={handleAddVideoSubmit} className="note-video-modal-body">
                    <p className="note-video-modal-hint">
                      Paste a link to a YouTube video, YouTube Short, Vimeo, Loom, or direct MP4 video:
                    </p>
                    <input
                      type="text"
                      className="note-video-modal-input"
                      placeholder="e.g. https://www.youtube.com/watch?v=..."
                      value={videoInputUrl}
                      onChange={(e) => {
                        setVideoInputUrl(e.target.value);
                        setVideoInputError("");
                      }}
                      autoFocus
                    />
                    {videoInputError && (
                      <span className="note-video-modal-error">{videoInputError}</span>
                    )}
                    <div className="note-video-modal-actions">
                      <button
                        type="button"
                        className="note-video-modal-btn secondary"
                        onClick={() => setIsVideoModalOpen(false)}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="note-video-modal-btn primary">
                        <Check size={14} /> Embed Player
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="note-editor-scroll">
              <div className="note-editor-page" style={{ textAlign: form.align }}>
                <div className="note-editor-title-container">
                  <input
                    ref={titleRef}
                    className={`note-editor-title ${titleError ? "has-error" : ""}`}
                    placeholder="Note title (required)..."
                    defaultValue={form.title}
                    onInput={handleTitleInput}
                  />
                  {titleError && (
                    <div className="note-editor-title-error-badge">
                      <span>⚠️ {titleError}</span>
                    </div>
                  )}
                </div>

                <div
                  ref={contentRef}
                  className="note-editor-content"
                  contentEditable
                  suppressContentEditableWarning
                  role="textbox"
                  aria-multiline="true"
                  data-placeholder="Write something... (Tip: Press Ctrl+V to paste screenshots directly or drag & drop files)"
                  onInput={handleContentInput}
                  onKeyDown={handleContentKeyDown}
                  onKeyUp={refreshFormatState}
                  onMouseUp={refreshFormatState}
                  onPaste={handlePaste}
                />

                {/* Dedicated Interactive Drop Zone & Upload Trigger */}
                <div
                  className="note-editor-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  title="Click to browse files or drag & drop any image, video, PDF, or document here"
                >
                  <div className="note-editor-dropzone-inner">
                    <div className="note-editor-dropzone-icon">
                      <Upload size={16} />
                    </div>
                    <div className="note-editor-dropzone-text">
                      <strong>Click to attach or drag & drop files here</strong>
                      <span>Supports Photos, Screenshots, PDFs, Videos, Audios, and Docs</span>
                    </div>
                  </div>
                </div>

                {/* Attached Hand-Drawn Sketch Preview in Note Body */}
                {form.drawingDataUrl && (
                  <div className="note-drawing-preview-card">
                    <div className="note-drawing-preview-header">
                      <span>🎨 Attached Drawing / Diagram</span>
                      <button
                        type="button"
                        onClick={() => setPanelView("drawing")}
                        className="note-drawing-edit-btn"
                      >
                        Edit Drawing
                      </button>
                    </div>
                    <img 
                      src={form.drawingDataUrl} 
                      alt="Note sketch" 
                      className="note-drawing-preview-img" 
                      onClick={() => setPanelView("drawing")}
                    />
                  </div>
                )}

                {/* 🌟 SMART RICH MEDIA VIEWER (Images, YouTube/Videos, PDFs, Audios, Files) */}
                <RichMediaViewer
                  attachments={form.attachments || []}
                  mediaLinks={form.mediaLinks || []}
                  onRemoveAttachment={handleRemoveAttachment}
                  onRemoveMediaLink={handleRemoveMediaLink}
                  isEditable={true}
                />
              </div>
            </div>

            <footer className="note-editor-footer">
              <div className="note-editor-footer-left">
                <label className="note-editor-time">
                  <CalendarDays size={15} />
                  <span>Date</span>
                  <input
                    type="date"
                    value={form.date || ""}
                    onChange={(event) => setForm({ ...form, date: event.target.value })}
                  />
                </label>

                <label className="note-editor-time">
                  <Clock size={15} />
                  <span>Time</span>
                  <input
                    type="time"
                    value={form.time || "12:00"}
                    onChange={(event) => setForm({ ...form, time: event.target.value })}
                  />
                </label>

                <div className="note-editor-color-group">
                  <span className="note-editor-color-label">Marker Color</span>
                  <div className="note-editor-swatches">
                    {["#4f46e5", "#0d9488", "#d97706", "#ef4444", "#7c3aed", "#10b981", "#db2777", "#2563eb"].map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`note-editor-swatch ${form.color === c ? "is-selected" : ""}`}
                        style={{ backgroundColor: c }}
                        onClick={() => setForm((prev) => ({ ...prev, color: c }))}
                        title={c}
                        aria-label={`Select color ${c}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="note-editor-footer-right">
                <label className="note-editor-reminder">
                  <input
                    type="checkbox"
                    checked={Boolean(form.reminder)}
                    onChange={(event) => handleToggleReminder(event.target.checked)}
                  />
                  <Bell size={15} color={form.reminder ? "#4f46e5" : "#9ca3af"} />
                  <span>Reminder Alert</span>
                </label>
              </div>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
