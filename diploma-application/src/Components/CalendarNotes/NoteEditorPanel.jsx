import React, { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Sparkles, Paperclip } from "lucide-react";
import NoteAnalysisView from "./NoteAnalysisView";
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

const snapshotsEqual = (a, b) =>
  a.title === b.title &&
  a.content === b.content &&
  a.fontSize === b.fontSize &&
  a.align === b.align;

export default function NoteEditorPanel({
  isOpen,
  mode,
  editorKey,
  form,
  setForm,
  contextLabel,
  onSave,
  onClose,
  onDelete,
  noteRecord,
  onSaveAnalysis,
}) {
  const titleRef = useRef(null);
  const contentRef = useRef(null);
  const loadedKeyRef = useRef(null);
  const formRef = useRef(form);
  const historyRef = useRef({ past: [], future: [], skip: false });
  const historyTimerRef = useRef(null);

  const [formatState, setFormatState] = useState({ bold: false, italic: false });
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [panelView, setPanelView] = useState("note");

  useEffect(() => {
    setPanelView("note");
  }, [editorKey, isOpen]);

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
    [setForm]
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
    pushHistory();
  };

  const handleSaveClick = useCallback(() => {
    if (historyTimerRef.current) {
      clearTimeout(historyTimerRef.current);
      historyTimerRef.current = null;
    }

    const savedForm = {
      ...formRef.current,
      title: titleRef.current?.value ?? formRef.current.title,
      content: contentRef.current?.innerHTML || "",
      isBold: false,
      isItalic: false,
    };
    setForm(savedForm);
    onSave(savedForm);
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
    if (isOpen && titleRef.current) {
      titleRef.current.focus();
    }
  }, [isOpen, editorKey]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      const mod = event.ctrlKey || event.metaKey;
      if (!mod) {
        if (event.key === "Escape") onClose();
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "s") {
        event.preventDefault();
        handleSaveClick();
        return;
      }

      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }

      if (key === "y" || (key === "z" && event.shiftKey)) {
        event.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, handleSaveClick, undo, redo]);

  const applyFormat = (command) => {
    pushHistory(true);
    contentRef.current?.focus();
    document.execCommand(command, false, null);
    refreshFormatState();
    handleContentInput();
    pushHistory(true);
  };

  const handleContentKeyDown = (event) => {
    if (!(event.ctrlKey || event.metaKey)) return;

    const key = event.key.toLowerCase();
    if (key === "z" || key === "y") return;

    if (key === "b") {
      event.preventDefault();
      pushHistory(true);
      document.execCommand("bold");
      refreshFormatState();
      handleContentInput();
      pushHistory(true);
    }

    if (key === "i") {
      event.preventDefault();
      pushHistory(true);
      document.execCommand("italic");
      refreshFormatState();
      handleContentInput();
      pushHistory(true);
    }
  };

  const handleAlignChange = (align) => {
    pushHistory(true);
    setForm((prev) => ({ ...prev, align }));
    pushHistory(true);
  };

  if (!isOpen) return null;

  const isEdit = mode === "edit";
  const showAnalysis = isEdit && panelView === "analysis";

  const analysisNote = noteRecord
    ? {
        id: noteRecord.id,
        title: form.title || noteRecord.title,
        content: form.content || noteRecord.content,
        aiAnalysis: noteRecord.aiAnalysis,
      }
    : null;

  return (
    <div className="note-editor-backdrop" onClick={onClose}>
      <div
        className="note-editor-panel"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? "Edit note" : "New note"}
      >
        <header className="note-editor-topbar">
          <div className="note-editor-topbar-left">
            {isEdit ? (
              <div className="note-editor-view-toggle">
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
                  className={`note-editor-view-btn ${panelView === "analysis" ? "is-active" : ""}`}
                  onClick={() => setPanelView("analysis")}
                >
                  <Sparkles size={15} />
                  Analysis
                </button>
              </div>
            ) : (
              contextLabel && <span className="note-editor-path">{contextLabel}</span>
            )}
          </div>
          <div className="note-editor-topbar-right">
            {isEdit && onDelete && (
              <button type="button" className="note-editor-link note-editor-link--danger" onClick={onDelete}>
                Delete
              </button>
            )}
            <button type="button" className="note-editor-save" onClick={handleSaveClick}>
              Done
            </button>
            <button type="button" className="note-editor-close" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
        </header>

        {showAnalysis ? (
          <div className="note-editor-analysis">
            <NoteAnalysisView
              note={analysisNote}
              onSaveAnalysis={onSaveAnalysis}
              compact
            />
          </div>
        ) : (
          <>
        <div className="note-editor-formatbar">
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

        <div className="note-editor-scroll">
          <div className="note-editor-page" style={{ textAlign: form.align }}>
            <input
              ref={titleRef}
              className="note-editor-title"
              placeholder="Untitled"
              defaultValue={form.title}
              onInput={handleTitleInput}
            />

            <div
              ref={contentRef}
              className="note-editor-content"
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-multiline="true"
              data-placeholder="Write something..."
              onInput={handleContentInput}
              onKeyDown={handleContentKeyDown}
              onKeyUp={refreshFormatState}
              onMouseUp={refreshFormatState}
            />

            {noteRecord?.attachments?.length > 0 && (
              <div className="note-attachments">
                <div className="note-attachments__title">
                  <Paperclip size={14} />
                  Attachments
                </div>
                {noteRecord.attachments.map((att) => (
                  <div key={att.id} className="note-attachment-item">
                    <FileText size={16} />
                    <span>{att.name}</span>
                    {att.dataUrl && (
                      <a href={att.dataUrl} download={att.name} target="_blank" rel="noreferrer">
                        Open PDF
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <footer className="note-editor-footer">
          <label className="note-editor-time">
            Scheduled time
            <input
              type="time"
              value={form.time}
              onChange={(event) => setForm({ ...form, time: event.target.value })}
            />
          </label>
        </footer>
          </>
        )}
      </div>
    </div>
  );
}
