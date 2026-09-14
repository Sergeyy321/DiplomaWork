import React, { useState } from "react";
import { FolderPlus, Briefcase, Home, Lightbulb, Rocket, Target, Folder } from "lucide-react";
import "./CreateWorkspaceModal.css";

const ICON_OPTIONS = [
  { id: "work", label: "Work", icon: <Briefcase size={14} /> },
  { id: "personal", label: "Personal", icon: <Home size={14} /> },
  { id: "ideas", label: "Ideas", icon: <Lightbulb size={14} /> },
  { id: "study", label: "Study", icon: <Rocket size={14} /> },
  { id: "goals", label: "Goals", icon: <Target size={14} /> },
  { id: "general", label: "General", icon: <Folder size={14} /> },
];

export default function CreateWorkspaceModal({ isOpen, onClose, onCreate }) {
  const [title, setTitle] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("work");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    const chosen = ICON_OPTIONS.find((opt) => opt.id === selectedIcon);
    onCreate({
      title: title.trim(),
      iconKey: selectedIcon,
      icon: chosen ? chosen.icon : <Folder size={14} />,
    });
    setTitle("");
    onClose();
  };

  return (
    <div className="workspace-modal-backdrop" onClick={onClose}>
      <div className="workspace-modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="workspace-modal-header">
          <h3>
            <FolderPlus size={16} /> Create New Workspace
          </h3>
          <button type="button" className="workspace-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="workspace-modal-form">
          <div className="workspace-modal-field">
            <label htmlFor="ws-title-input">Workspace Name</label>
            <input
              id="ws-title-input"
              type="text"
              placeholder="e.g. Thesis Project, Daily Routine, Startup..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="workspace-modal-field">
            <label>Select Workspace Icon</label>
            <div className="workspace-icon-picker">
              {ICON_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`workspace-icon-option ${selectedIcon === opt.id ? "is-selected" : ""}`}
                  onClick={() => setSelectedIcon(opt.id)}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="workspace-modal-footer">
            <button
              type="button"
              className="workspace-modal-btn workspace-modal-btn--ghost"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="workspace-modal-btn workspace-modal-btn--primary"
              disabled={!title.trim()}
            >
              Create Workspace
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
