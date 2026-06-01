import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadSubcategoriesByTopic, loadStorage, saveStorage } from "../../utils/topicStorage";
import "./TopicNotesView.css";

const TOPIC_COLORS = ["#4f46e5", "#0d9488", "#d97706", "#7c3aed", "#2563eb", "#db2777"];
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;

const DEFAULT_VIEWPORT = { panX: 0, panY: 0, zoom: 1 };

const getViewportKey = (topicId, subcategoryId) => {
  if (subcategoryId) return `subcategory:${subcategoryId}`;
  if (topicId) return `topic:${topicId}`;
  return "network";
};

const loadViewport = (topicId, subcategoryId) => {
  const saved = loadStorage().viewports || {};
  return saved[getViewportKey(topicId, subcategoryId)] || DEFAULT_VIEWPORT;
};

const buildTopicPositions = (folders, existing = {}) => {
  const positions = { ...existing };
  folders.forEach((folder, index) => {
    if (positions[folder.id]) return;
    const angle = (index / Math.max(folders.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const radius = 185 + (index % 2) * 25;
    positions[folder.id] = {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  });
  return positions;
};

const buildSubcategoryPositions = (subcategories, existing = {}) => {
  const positions = { ...existing };
  subcategories.forEach((subcategory, index) => {
    if (positions[subcategory.id]) return;
    const angle = (index / Math.max(subcategories.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const radius = 165 + (index % 2) * 20;
    positions[subcategory.id] = {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  });
  return positions;
};

const buildDefaultNotePosition = (index, total) => {
  const angle = (index / Math.max(total, 1)) * Math.PI * 2 - Math.PI / 2;
  const radius = 125 + (index % 3) * 28;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
};

const clampZoom = (value) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

const ConnectionLine = ({ x, y, color, opacity = 0.35 }) => {
  const angleRad = Math.atan2(y, x);
  const angleDeg = (angleRad * 180) / Math.PI;
  const distance = Math.hypot(x, y);

  return (
    <div
      className="topic-spatial-line"
      style={{
        width: `${distance}px`,
        background: `linear-gradient(90deg, ${color} 0%, rgba(148, 163, 184, 0.45) 100%)`,
        opacity,
        transform: `rotate(${angleDeg}deg)`,
      }}
    />
  );
};

export default function TopicNotesView({
  folders,
  events,
  onCreateNote,
  onOpenNote,
  onDeleteNote,
  onUpdateNotePosition,
  onUnassignSubcategoryNotes,
}) {
  const savedStorage = useMemo(() => loadStorage(), []);

  const [activeTopicId, setActiveTopicId] = useState(null);
  const [activeSubcategoryId, setActiveSubcategoryId] = useState(null);
  const [subcategoriesByTopic, setSubcategoriesByTopic] = useState(() => savedStorage.subcategoriesByTopic || {});
  const [topicPositions, setTopicPositions] = useState(() =>
    buildTopicPositions(folders, savedStorage.topicPositions || {})
  );
  const [subcategoryPositions, setSubcategoryPositions] = useState(() => savedStorage.subcategoryPositions || {});
  const [notePositions, setNotePositions] = useState(() => savedStorage.notePositions || {});
  const [viewport, setViewport] = useState(() => loadViewport(null, null));
  const [draggingId, setDraggingId] = useState(null);
  const [isPanning, setIsPanning] = useState(false);
  const [showSubcategoryForm, setShowSubcategoryForm] = useState(false);
  const [newSubcategoryTitle, setNewSubcategoryTitle] = useState("");

  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const panRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0, originX: 0, originY: 0 });
  const dragMovedRef = useRef(false);
  const viewportRef = useRef(viewport);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    setTopicPositions((prev) => buildTopicPositions(folders, prev));
  }, [folders]);

  useEffect(() => {
    const syncSubcategories = () => {
      setSubcategoriesByTopic(loadSubcategoriesByTopic());
    };
    window.addEventListener("topic-storage-changed", syncSubcategories);
    return () => window.removeEventListener("topic-storage-changed", syncSubcategories);
  }, []);

  useEffect(() => {
    saveStorage({ subcategoriesByTopic });
  }, [subcategoriesByTopic]);

  useEffect(() => {
    saveStorage({ subcategoryPositions });
  }, [subcategoryPositions]);

  useEffect(() => {
    saveStorage({ topicPositions });
  }, [topicPositions]);

  useEffect(() => {
    setNotePositions((prev) => {
      const next = { ...prev };
      let changed = false;
      const validIds = new Set(events.map((event) => String(event.id)));

      Object.keys(next).forEach((id) => {
        if (!validIds.has(id)) {
          delete next[id];
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [events]);

  useEffect(() => {
    saveStorage({ notePositions });
  }, [notePositions]);

  useEffect(() => {
    setViewport(loadViewport(activeTopicId, activeSubcategoryId));

    return () => {
      const viewports = loadStorage().viewports || {};
      viewports[getViewportKey(activeTopicId, activeSubcategoryId)] = viewportRef.current;
      saveStorage({ viewports });
    };
  }, [activeTopicId, activeSubcategoryId]);

  useEffect(() => {
    const viewports = loadStorage().viewports || {};
    viewports[getViewportKey(activeTopicId, activeSubcategoryId)] = viewport;
    saveStorage({ viewports });
  }, [viewport, activeTopicId, activeSubcategoryId]);

  const notesByTopic = useMemo(() => {
    const map = {};
    folders.forEach((folder) => {
      map[folder.id] = events.filter((event) => event.folderId === folder.id);
    });
    return map;
  }, [folders, events]);

  const activeTopic = folders.find((folder) => folder.id === activeTopicId);
  const activeSubcategories = activeTopicId ? subcategoriesByTopic[activeTopicId] || [] : [];
  const activeSubcategory = activeSubcategories.find((item) => item.id === activeSubcategoryId);
  const activeNotes = activeTopicId ? notesByTopic[activeTopicId] || [] : [];
  const uncategorizedNotes = activeNotes.filter((note) => !note.subcategoryId);
  const subcategoryNotes = activeSubcategoryId
    ? activeNotes.filter((note) => note.subcategoryId === activeSubcategoryId)
    : [];

  const activeTopicIndex = folders.findIndex((folder) => folder.id === activeTopicId);
  const activeTopicColor = TOPIC_COLORS[(activeTopicIndex >= 0 ? activeTopicIndex : 0) % TOPIC_COLORS.length];

  useEffect(() => {
    if (!activeTopicId) return;
    const subs = subcategoriesByTopic[activeTopicId] || [];
    setSubcategoryPositions((prev) => buildSubcategoryPositions(subs, prev));
  }, [activeTopicId, subcategoriesByTopic]);

  const getNotePosition = useCallback(
    (note, index, total) => {
      const saved = notePositions[note.id];
      if (saved) return saved;
      if (typeof note.x === "number" && typeof note.y === "number") {
        return { x: note.x, y: note.y };
      }
      return buildDefaultNotePosition(index, total);
    },
    [notePositions]
  );

  const updateNotePosition = useCallback(
    (id, x, y) => {
      setNotePositions((prev) => ({ ...prev, [id]: { x, y } }));
      onUpdateNotePosition(id, x, y);
    },
    [onUpdateNotePosition]
  );

  const handleCanvasMouseDown = (event) => {
    if (event.target.closest(".topic-spatial-node")) return;
    if (event.target.closest(".topic-spatial-toolbar")) return;
    if (event.target.closest(".topic-spatial-controls")) return;
    if (event.target.closest(".topic-spatial-empty")) return;
    if (event.target.closest(".topic-spatial-subform")) return;
    if (event.button !== 0 && event.button !== 1) return;

    panRef.current = {
      x: event.clientX,
      y: event.clientY,
      originPanX: viewportRef.current.panX,
      originPanY: viewportRef.current.panY,
    };
    setIsPanning(true);
    event.preventDefault();
  };

  const handleNodeMouseDown = (event, type, id, currentX, currentY) => {
    event.stopPropagation();
    dragRef.current = { type, id };
    dragMovedRef.current = false;
    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      originX: currentX,
      originY: currentY,
    };
    setDraggingId(id);
  };

  const handleMouseMove = (event) => {
    const panSession = panRef.current;
    if (panSession) {
      const deltaX = event.clientX - panSession.x;
      const deltaY = event.clientY - panSession.y;
      setViewport((prev) => ({
        ...prev,
        panX: panSession.originPanX + deltaX,
        panY: panSession.originPanY + deltaY,
      }));
      return;
    }

    const dragSession = dragRef.current;
    if (!dragSession) return;

    const scale = viewportRef.current.zoom;
    const deltaX = (event.clientX - dragStartRef.current.x) / scale;
    const deltaY = (event.clientY - dragStartRef.current.y) / scale;

    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      dragMovedRef.current = true;
    }

    const nextX = dragStartRef.current.originX + deltaX;
    const nextY = dragStartRef.current.originY + deltaY;
    const { type, id } = dragSession;

    if (type === "topic") {
      setTopicPositions((prev) => ({ ...prev, [id]: { x: nextX, y: nextY } }));
      return;
    }

    if (type === "subcategory") {
      setSubcategoryPositions((prev) => ({ ...prev, [id]: { x: nextX, y: nextY } }));
      return;
    }

    updateNotePosition(id, nextX, nextY);
  };

  const handleMouseUp = () => {
    dragRef.current = null;
    panRef.current = null;
    setDraggingId(null);
    setIsPanning(false);
  };

  const handleWheel = useCallback((event) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const current = viewportRef.current;
    const zoomFactor = event.deltaY > 0 ? 0.92 : 1.08;
    const nextZoom = clampZoom(current.zoom * zoomFactor);
    const worldX = (mouseX - current.panX) / current.zoom;
    const worldY = (mouseY - current.panY) / current.zoom;

    setViewport({
      zoom: nextZoom,
      panX: mouseX - worldX * nextZoom,
      panY: mouseY - worldY * nextZoom,
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const adjustZoom = (direction) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const current = viewportRef.current;
    const nextZoom = clampZoom(current.zoom * direction);
    const worldX = (centerX - current.panX) / current.zoom;
    const worldY = (centerY - current.panY) / current.zoom;

    setViewport({
      zoom: nextZoom,
      panX: centerX - worldX * nextZoom,
      panY: centerY - worldY * nextZoom,
    });
  };

  const resetViewport = () => {
    setViewport(DEFAULT_VIEWPORT);
  };

  const handleTopicClick = (folderId) => {
    if (dragMovedRef.current) return;
    setActiveSubcategoryId(null);
    setActiveTopicId(folderId);
    setShowSubcategoryForm(false);
  };

  const handleSubcategoryClick = (subcategoryId) => {
    if (dragMovedRef.current) return;
    setActiveSubcategoryId(subcategoryId);
  };

  const handleBack = () => {
    if (activeSubcategoryId) {
      setActiveSubcategoryId(null);
      return;
    }
    if (activeTopicId) {
      setActiveTopicId(null);
      setShowSubcategoryForm(false);
    }
  };

  const handleCreateSubcategory = (event) => {
    event.preventDefault();
    if (!activeTopicId || !newSubcategoryTitle.trim()) return;

    const nextSubcategory = {
      id: `sub_${Date.now()}`,
      title: newSubcategoryTitle.trim(),
      color: TOPIC_COLORS[activeSubcategories.length % TOPIC_COLORS.length],
    };

    setSubcategoriesByTopic((prev) => ({
      ...prev,
      [activeTopicId]: [...(prev[activeTopicId] || []), nextSubcategory],
    }));
    setNewSubcategoryTitle("");
    setShowSubcategoryForm(false);
  };

  const handleDeleteSubcategory = (subcategoryId) => {
    if (!activeTopicId) return;

    setSubcategoriesByTopic((prev) => ({
      ...prev,
      [activeTopicId]: (prev[activeTopicId] || []).filter((item) => item.id !== subcategoryId),
    }));
    setSubcategoryPositions((prev) => {
      const next = { ...prev };
      delete next[subcategoryId];
      return next;
    });
    onUnassignSubcategoryNotes(subcategoryId);
    if (activeSubcategoryId === subcategoryId) {
      setActiveSubcategoryId(null);
    }
  };

  const handleNoteOpen = (note) => {
    if (dragMovedRef.current) return;
    onOpenNote(note);
  };

  const renderNoteNode = (note, index, total, accentColor) => {
    const position = getNotePosition(note, index, total);
    const isDragging = draggingId === note.id;

    return (
      <div key={note.id}>
        <ConnectionLine x={position.x} y={position.y} color={note.color || accentColor} opacity={0.42} />
        <div
          className={`topic-spatial-node topic-spatial-node--note ${isDragging ? "is-dragging" : ""}`}
          style={{
            transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
            borderLeftColor: note.color || accentColor,
          }}
          onMouseDown={(event) => handleNodeMouseDown(event, "note", note.id, position.x, position.y)}
          onDoubleClick={() => handleNoteOpen(note)}
        >
          <div className="topic-spatial-note-top">
            <span className="topic-spatial-node-type">Note</span>
            <span className="topic-spatial-drag-label">Drag · Double-click to open</span>
          </div>
              <div
                className="topic-spatial-node-title topic-spatial-node-title--note"
              >
                {note.title || "Untitled"}
              </div>
              <div className="topic-spatial-node-meta">{note.time}</div>
          <div className="topic-spatial-note-actions">
            <button
              type="button"
              className="topic-spatial-action"
              onClick={(event) => {
                event.stopPropagation();
                onOpenNote(note);
              }}
            >
              Open
            </button>
            <button
              type="button"
              className="topic-spatial-action topic-spatial-action--danger"
              onClick={(event) => {
                event.stopPropagation();
                onDeleteNote(note.id);
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderOverview = () => (
    <>
      <div className="topic-spatial-center">
        <div className="topic-spatial-center-label">Topic Network</div>
        <div className="topic-spatial-center-value">{folders.length}</div>
        <div className="topic-spatial-center-meta">themes connected</div>
      </div>

      {folders.map((folder, index) => {
        const position = topicPositions[folder.id] || { x: 0, y: 0 };
        const notes = notesByTopic[folder.id] || [];
        const subcategoryCount = (subcategoriesByTopic[folder.id] || []).length;
        const color = TOPIC_COLORS[index % TOPIC_COLORS.length];
        const isDragging = draggingId === folder.id;

        return (
          <div key={folder.id}>
            <ConnectionLine x={position.x} y={position.y} color={color} />
            <div
              role="button"
              tabIndex={0}
              className={`topic-spatial-node topic-spatial-node--topic ${isDragging ? "is-dragging" : ""}`}
              style={{
                transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
                borderColor: color,
                boxShadow: `0 14px 28px ${color}33`,
              }}
              onMouseDown={(event) => handleNodeMouseDown(event, "topic", folder.id, position.x, position.y)}
              onClick={() => handleTopicClick(folder.id)}
            >
              <span className="topic-spatial-node-type">Theme</span>
              <span className="topic-spatial-node-title">{folder.title}</span>
              <span className="topic-spatial-node-meta">
                {subcategoryCount} sub · {notes.length} notes
              </span>
              <span className="topic-spatial-node-hint">Open</span>
            </div>
          </div>
        );
      })}

      {folders.length === 0 && (
        <div className="topic-spatial-empty">
          <h3>No themes yet</h3>
          <p>Create a workspace in the sidebar to start building your topic network.</p>
        </div>
      )}
    </>
  );

  const renderThemeFocus = () => (
    <>
      <div
        className="topic-spatial-center topic-spatial-center--focus"
        style={{ boxShadow: `0 20px 30px ${activeTopicColor}44` }}
      >
        <div className="topic-spatial-center-label">Active Theme</div>
        <div className="topic-spatial-center-title">{activeTopic.title}</div>
        <div className="topic-spatial-center-meta">
          {activeSubcategories.length} subcategories · {activeNotes.length} notes
        </div>
      </div>

      {activeSubcategories.map((subcategory, index) => {
        const position = subcategoryPositions[subcategory.id] || { x: 0, y: 0 };
        const notesCount = activeNotes.filter((note) => note.subcategoryId === subcategory.id).length;
        const isDragging = draggingId === subcategory.id;
        const color = subcategory.color || TOPIC_COLORS[index % TOPIC_COLORS.length];

        return (
          <div key={subcategory.id}>
            <ConnectionLine x={position.x} y={position.y} color={color} opacity={0.4} />
            <div
              role="button"
              tabIndex={0}
              className={`topic-spatial-node topic-spatial-node--subcategory ${isDragging ? "is-dragging" : ""}`}
              style={{
                transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
                borderColor: color,
                boxShadow: `0 12px 24px ${color}33`,
              }}
              onMouseDown={(event) =>
                handleNodeMouseDown(event, "subcategory", subcategory.id, position.x, position.y)
              }
              onClick={() => handleSubcategoryClick(subcategory.id)}
            >
              <span className="topic-spatial-node-type">Subcategory</span>
              <span className="topic-spatial-node-title">{subcategory.title}</span>
              <span className="topic-spatial-node-meta">{notesCount} notes</span>
              <span className="topic-spatial-node-hint">Open</span>
              <button
                type="button"
                className="topic-spatial-sub-delete"
                onClick={(event) => {
                  event.stopPropagation();
                  handleDeleteSubcategory(subcategory.id);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        );
      })}

      {uncategorizedNotes.map((note, index) =>
        renderNoteNode(note, index, uncategorizedNotes.length, activeTopicColor)
      )}

      {activeSubcategories.length === 0 && uncategorizedNotes.length === 0 && (
        <div className="topic-spatial-empty topic-spatial-empty--focus">
          <h3>Start organizing this theme</h3>
          <p>Create subcategories like course subjects, then add notes inside each folder.</p>
          <button type="button" className="topic-spatial-add" onClick={() => setShowSubcategoryForm(true)}>
            Create subcategory
          </button>
        </div>
      )}
    </>
  );

  const renderSubcategoryFocus = () => (
    <>
      <div
        className="topic-spatial-center topic-spatial-center--focus"
        style={{ boxShadow: `0 20px 30px ${activeSubcategory.color}44` }}
      >
        <div className="topic-spatial-center-label">Subcategory</div>
        <div className="topic-spatial-center-title">{activeSubcategory.title}</div>
        <div className="topic-spatial-center-meta">{subcategoryNotes.length} notes linked</div>
      </div>

      {subcategoryNotes.map((note, index) =>
        renderNoteNode(note, index, subcategoryNotes.length, activeSubcategory.color || activeTopicColor)
      )}

      {subcategoryNotes.length === 0 && (
        <div className="topic-spatial-empty topic-spatial-empty--focus">
          <h3>No notes in this subcategory</h3>
          <p>Add notes for this subject or topic area and arrange them around the center node.</p>
          <button
            type="button"
            className="topic-spatial-add"
            onClick={() => onCreateNote(activeTopic.id, activeSubcategory.id)}
          >
            Create first note
          </button>
        </div>
      )}
    </>
  );

  const renderActiveView = () => {
    if (activeSubcategory) return renderSubcategoryFocus();
    if (activeTopic) return renderThemeFocus();
    return renderOverview();
  };

  return (
    <div
      ref={canvasRef}
      className={`topic-spatial-canvas ${isPanning ? "is-panning" : ""}`}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="topic-spatial-toolbar">
        {activeTopic ? (
          <div className="topic-spatial-toolbar-group">
            <button type="button" className="topic-spatial-back" onClick={handleBack}>
              {activeSubcategory ? "Back to theme" : "Back to network"}
            </button>
            {!activeSubcategory && (
              <button
                type="button"
                className="topic-spatial-add topic-spatial-add--ghost"
                onClick={() => setShowSubcategoryForm((prev) => !prev)}
              >
                New subcategory
              </button>
            )}
            <button
              type="button"
              className="topic-spatial-add"
              onClick={() => onCreateNote(activeTopic.id, activeSubcategory?.id || null)}
            >
              New note
            </button>
          </div>
        ) : (
          <span className="topic-spatial-hint">Scroll to zoom · Drag background to pan · Drag nodes to arrange</span>
        )}
      </div>

      {showSubcategoryForm && activeTopic && !activeSubcategory && (
        <form className="topic-spatial-subform" onSubmit={handleCreateSubcategory}>
          <input
            type="text"
            className="topic-spatial-subform-input"
            placeholder="Subcategory name (e.g. Database Systems)"
            value={newSubcategoryTitle}
            onChange={(event) => setNewSubcategoryTitle(event.target.value)}
            autoFocus
          />
          <button type="submit" className="topic-spatial-add">
            Add
          </button>
          <button type="button" className="topic-spatial-back" onClick={() => setShowSubcategoryForm(false)}>
            Cancel
          </button>
        </form>
      )}

      <div className="topic-spatial-controls">
        <button type="button" className="topic-spatial-control-btn" onClick={() => adjustZoom(1.12)} title="Zoom in">
          +
        </button>
        <span className="topic-spatial-zoom-label">{Math.round(viewport.zoom * 100)}%</span>
        <button type="button" className="topic-spatial-control-btn" onClick={() => adjustZoom(0.89)} title="Zoom out">
          -
        </button>
        <button type="button" className="topic-spatial-control-btn topic-spatial-control-btn--wide" onClick={resetViewport}>
          Reset view
        </button>
      </div>

      <div
        className="topic-spatial-world"
        style={{
          transform: `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})`,
        }}
      >
        {renderActiveView()}
      </div>
    </div>
  );
}
