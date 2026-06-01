import React, { useState, useRef, useCallback } from "react";
import {
  X, Upload, FileText, Loader2, Sparkles, FolderOpen, Layers, Check, ChevronRight,
} from "lucide-react";
import { importPdf } from "../../services/aiApi";
import { loadSubcategoriesByTopic } from "../../utils/topicStorage";
import "./PdfImportModal.css";

const SUBCATEGORY_MODES = [
  { id: "none", label: "No subcategory" },
  { id: "existing", label: "Existing" },
  { id: "new", label: "Create new" },
];

const FOLDER_MODES = [
  { id: "existing", label: "Existing workspace" },
  { id: "new", label: "Create workspace" },
];

export default function PdfImportModal({ isOpen, onClose, folders, onConfirm }) {
  const inputRef = useRef(null);
  const [phase, setPhase] = useState("upload");
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [folderMode, setFolderMode] = useState("existing");
  const [folderId, setFolderId] = useState("");
  const [newFolderTitle, setNewFolderTitle] = useState("");
  const [subcategoryMode, setSubcategoryMode] = useState("none");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [newSubcategoryTitle, setNewSubcategoryTitle] = useState("");

  const reset = useCallback(() => {
    setPhase("upload");
    setFile(null);
    setError(null);
    setResult(null);
    setTitle("");
    setContent("");
    setFolderMode("existing");
    setFolderId(folders[0]?.id || "");
    setNewFolderTitle("");
    setSubcategoryMode("none");
    setSubcategoryId("");
    setNewSubcategoryTitle("");
  }, [folders]);

  const handleClose = () => { reset(); onClose(); };

  const applyAiSuggestions = (data, uploadedFile) => {
    const p = data.placement || {};
    setTitle(data.title || uploadedFile.name.replace(/\.pdf$/i, ""));
    setContent(data.content || "");
    setResult(data);
    if (p.folderAction === "new" || !folders.find((f) => f.id === p.folderId)) {
      setFolderMode("new");
      setNewFolderTitle(p.newFolderTitle || data.title || "New workspace");
    } else {
      setFolderMode("existing");
      setFolderId(p.folderId || folders[0]?.id || "");
    }
    if (p.subcategoryAction === "new") {
      setSubcategoryMode("new");
      setNewSubcategoryTitle(p.newSubcategoryTitle || "");
    } else if (p.subcategoryAction === "existing" && p.subcategoryId) {
      setSubcategoryMode("existing");
      setSubcategoryId(p.subcategoryId);
    } else {
      setSubcategoryMode("none");
    }
  };

  const processFile = async (uploadedFile) => {
    if (!uploadedFile || uploadedFile.type !== "application/pdf") {
      setError("Please select a PDF file.");
      return;
    }
    setFile(uploadedFile);
    setPhase("processing");
    setError(null);
    try {
      const data = await importPdf({
        file: uploadedFile,
        folders: folders.map((f) => ({ id: f.id, title: f.title })),
        subcategoriesByTopic: loadSubcategoriesByTopic(),
      });
      applyAiSuggestions(data, uploadedFile);
      setPhase("review");
    } catch (err) {
      setError(err.message);
      setPhase("upload");
    }
  };

  const handleConfirm = async () => {
    if (!file || !title.trim()) return;
    const reader = new FileReader();
    reader.onload = () => {
      onConfirm({
        title: title.trim(),
        content,
        summary: result?.summary,
        attachment: {
          id: `att_${Date.now()}`,
          name: file.name,
          mimeType: file.type,
          size: file.size,
          dataUrl: reader.result,
        },
        folderMode,
        folderId: folderMode === "existing" ? folderId : null,
        newFolderTitle: folderMode === "new" ? newFolderTitle.trim() : null,
        subcategoryMode,
        subcategoryId: subcategoryMode === "existing" ? subcategoryId : null,
        newSubcategoryTitle: subcategoryMode === "new" ? newSubcategoryTitle.trim() : null,
      });
      handleClose();
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  const activeFolderId = folderMode === "existing" ? folderId : null;
  const subcategories = activeFolderId ? loadSubcategoriesByTopic()[activeFolderId] || [] : [];

  return (
    <div className="pdf-import-backdrop" onClick={handleClose}>
      <div className="pdf-import-modal" onClick={(e) => e.stopPropagation()}>
        <header className="pdf-import-header">
          <div className="pdf-import-header__title">
            <Sparkles size={20} />
            <div><h2>Import PDF</h2><p>AI reads the file and creates a note</p></div>
          </div>
          <button type="button" className="pdf-import-close" onClick={handleClose}><X size={20} /></button>
        </header>

        {phase === "upload" && (
          <div className="pdf-import-dropzone" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); processFile(e.dataTransfer.files?.[0]); }} onClick={() => inputRef.current?.click()}>
            <input ref={inputRef} type="file" accept="application/pdf" hidden onChange={(e) => processFile(e.target.files?.[0])} />
            <Upload size={32} strokeWidth={1.5} />
            <p className="pdf-import-dropzone__title">Drop a PDF here or click to browse</p>
          </div>
        )}

        {phase === "processing" && (
          <div className="pdf-import-processing">
            <Loader2 size={28} className="pdf-import-spin" />
            <p>Reading <strong>{file?.name}</strong>...</p>
          </div>
        )}

        {phase === "review" && (
          <div className="pdf-import-review">
            {result?.placement?.reasoning && (
              <div className="pdf-import-suggestion">
                <Sparkles size={16} />
                <div><strong>AI suggestion</strong><p>{result.placement.reasoning}</p></div>
              </div>
            )}
            <label className="pdf-import-field">Note title<input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
            <label className="pdf-import-field">Preview<div className="pdf-import-preview" dangerouslySetInnerHTML={{ __html: content }} /></label>
            <div className="pdf-import-section">
              <h3><FolderOpen size={16} /> Workspace</h3>
              <div className="pdf-import-segment">
                {FOLDER_MODES.map((m) => (
                  <button key={m.id} type="button" className={folderMode === m.id ? "is-active" : ""} onClick={() => setFolderMode(m.id)}>{m.label}</button>
                ))}
              </div>
              {folderMode === "existing" ? (
                <select value={folderId} onChange={(e) => setFolderId(e.target.value)}>
                  {folders.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
                </select>
              ) : (
                <input placeholder="New workspace name" value={newFolderTitle} onChange={(e) => setNewFolderTitle(e.target.value)} />
              )}
            </div>
            <div className="pdf-import-section">
              <h3><Layers size={16} /> Subcategory</h3>
              <div className="pdf-import-segment">
                {SUBCATEGORY_MODES.map((m) => (
                  <button key={m.id} type="button" className={subcategoryMode === m.id ? "is-active" : ""} onClick={() => setSubcategoryMode(m.id)}>{m.label}</button>
                ))}
              </div>
              {subcategoryMode === "existing" && (
                <select value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)}>
                  <option value="">Select...</option>
                  {subcategories.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              )}
              {subcategoryMode === "new" && (
                <input placeholder="New subcategory name" value={newSubcategoryTitle} onChange={(e) => setNewSubcategoryTitle(e.target.value)} />
              )}
            </div>
            {file && (
              <div className="pdf-import-attachment"><FileText size={16} /><span>{file.name}</span><span className="pdf-import-attachment__tag">Attached</span></div>
            )}
          </div>
        )}

        {error && <div className="pdf-import-error">{error}</div>}

        <footer className="pdf-import-footer">
          <button type="button" className="pdf-import-btn pdf-import-btn--ghost" onClick={handleClose}>Cancel</button>
          {phase === "review" && (
            <button type="button" className="pdf-import-btn pdf-import-btn--primary" onClick={handleConfirm} disabled={!title.trim()}>
              <Check size={16} /> Create note <ChevronRight size={16} />
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
