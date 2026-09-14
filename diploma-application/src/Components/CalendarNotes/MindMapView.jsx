import React, { useState, useRef, useEffect } from "react";
import { 
  Plus, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Network, 
  Clock, 
  Bell, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  CircleDot, 
  Circle,
  Shapes,
  Square,
  Minus,
  Hexagon,
  Diamond,
  MessageSquare,
  Bookmark,
  Check
} from "lucide-react";
import "./MindMapView.css";

function stripHtml(html = "") {
  return String(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STATUS_CONFIG = {
  todo: { label: "To Do", icon: Circle, className: "status-pill--todo", next: "in-progress" },
  "in-progress": { label: "In Progress", icon: CircleDot, className: "status-pill--progress", next: "done" },
  done: { label: "Done", icon: CheckCircle2, className: "status-pill--done", next: "todo" },
};

export const NODE_SHAPE_OPTIONS = [
  { id: "card", label: "Card", icon: Square, desc: "Classic rounded card" },
  { id: "pill", label: "Capsule Pill", icon: Minus, desc: "Sleek rounded capsule" },
  { id: "hexagon", label: "Hexagon", icon: Hexagon, desc: "Geometric polygon" },
  { id: "diamond", label: "Diamond Badge", icon: Diamond, desc: "Faceted diamond shape" },
  { id: "bubble", label: "Thought Bubble", icon: MessageSquare, desc: "Organic cloud bubble" },
  { id: "badge", label: "Cyber Badge", icon: Bookmark, desc: "Cut-corner tech badge" },
];

export default function MindMapView({
  workspaceTitle,
  events = [],
  onOpenNote,
  onCreateNote,
  onUpdateNotePosition,
  onUpdateNoteStatus,
  onJumpToCalendar,
  focusedNoteId,
}) {
  const [zoom, setZoom] = useState(0.7);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [centerPos, setCenterPos] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState(null);
  const [highlightedId, setHighlightedId] = useState(focusedNoteId);

  const [nodeShape, setNodeShape] = useState(() => {
    try {
      return localStorage.getItem("mindmap_node_shape") || "card";
    } catch {}
    return "card";
  });
  const [isShapeMenuOpen, setIsShapeMenuOpen] = useState(false);

  const panStartRef = useRef({ x: 0, y: 0 });
  const touchStartRef = useRef({ x: 0, y: 0, dist: 0, isPinching: false });
  const canvasRef = useRef(null);

  const handleSelectShape = (shapeId) => {
    setNodeShape(shapeId);
    setIsShapeMenuOpen(false);
    try {
      localStorage.setItem("mindmap_node_shape", shapeId);
    } catch {}
  };

  useEffect(() => {
    const fitMindMap = () => {
      if (canvasRef.current) {
        const w = canvasRef.current.clientWidth || window.innerWidth;
        const h = canvasRef.current.clientHeight || (window.innerHeight - 140);
        const scaleW = (w - 40) / 620;
        const scaleH = (h - 40) / 500;
        const optimal = Math.min(scaleW, scaleH, 1.0);
        setZoom(Math.max(Number(optimal.toFixed(2)), 0.65));
        setPan({ x: 0, y: 0 });
        setCenterPos({ x: 0, y: 0 });
      }
    };
    fitMindMap();
    window.addEventListener("resize", fitMindMap);
    return () => window.removeEventListener("resize", fitMindMap);
  }, []);

  const nodeDragStartRef = useRef({ x: 0, y: 0 });

  const nodesWithPositions = events.map((event, idx) => {
    if (typeof event.x === "number" && typeof event.y === "number") {
      return event;
    }
    const angle = (idx / Math.max(events.length, 1)) * Math.PI * 2;
    const radius = 170 + (idx % 3) * 45;
    return {
      ...event,
      x: Math.round(Math.cos(angle) * radius),
      y: Math.round(Math.sin(angle) * radius),
    };
  });

  useEffect(() => {
    if (!focusedNoteId) return;
    const targetNode = nodesWithPositions.find((n) => String(n.id) === String(focusedNoteId));
    if (targetNode) {
      setPan({
        x: -(targetNode.x || 0) * zoom,
        y: -(targetNode.y || 0) * zoom,
      });
      setHighlightedId(focusedNoteId);
      const timer = setTimeout(() => setHighlightedId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [focusedNoteId, zoom, nodesWithPositions]);

  const handleCanvasMouseDown = (e) => {
    if (
      e.target.closest(".notion-mindmap-node") ||
      e.target.closest(".notion-mindmap-center") ||
      e.target.closest(".notion-mindmap-toolbar") ||
      e.target.closest(".notion-mindmap-shape-menu")
    ) {
      return;
    }
    setIsShapeMenuOpen(false);
    setIsPanning(true);
    panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e) => {
    if (draggedNodeId === "center") {
      const newX = (e.clientX - nodeDragStartRef.current.x) / zoom;
      const newY = (e.clientY - nodeDragStartRef.current.y) / zoom;
      setCenterPos({ x: Math.round(newX), y: Math.round(newY) });
    } else if (draggedNodeId !== null) {
      const newX = (e.clientX - nodeDragStartRef.current.x) / zoom;
      const newY = (e.clientY - nodeDragStartRef.current.y) / zoom;
      if (onUpdateNotePosition) {
        onUpdateNotePosition(draggedNodeId, newX, newY);
      }
    } else if (isPanning) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
    }
  };

  
  const handleTouchStart = (e) => {
    if (e.target.closest(".mindmap-node") || e.target.closest("button") || e.target.closest(".mindmap-toolbar")) {
      return;
    }
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
        dist: 0,
        isPinching: false,
      };
      setIsPanning(true);
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartRef.current = {
        ...touchStartRef.current,
        dist,
        isPinching: true,
      };
      setIsPanning(false);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && touchStartRef.current && !touchStartRef.current.isPinching) {
      setPan({
        x: e.touches[0].clientX - touchStartRef.current.x,
        y: e.touches[0].clientY - touchStartRef.current.y,
      });
    } else if (e.touches.length === 2 && touchStartRef.current && touchStartRef.current.dist > 0) {
      const newDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = newDist / touchStartRef.current.dist;
      if (Math.abs(factor - 1) > 0.02) {
        const delta = factor > 1 ? 0.04 : -0.04;
        setZoom((prev) => Math.min(Math.max(Number((prev + delta).toFixed(2)), 0.25), 1.8));
        touchStartRef.current.dist = newDist;
      }
    }
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
    if (touchStartRef.current) touchStartRef.current.isPinching = false;
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggedNodeId(null);
  };

  const handleCenterMouseDown = (e) => {
    e.stopPropagation();
    setIsShapeMenuOpen(false);
    setDraggedNodeId("center");
    nodeDragStartRef.current = {
      x: e.clientX - centerPos.x * zoom,
      y: e.clientY - centerPos.y * zoom,
    };
  };

  const handleNodeMouseDown = (e, note) => {
    e.stopPropagation();
    setIsShapeMenuOpen(false);
    setDraggedNodeId(note.id);
    nodeDragStartRef.current = {
      x: e.clientX - (note.x || 0) * zoom,
      y: e.clientY - (note.y || 0) * zoom,
    };
  };

  const handleZoom = (delta) => {
    setZoom((prev) => Math.min(Math.max(Number((prev + delta).toFixed(2)), 0.5), 2.0));
  };

  const handleReset = () => {
    if (canvasRef.current) {
      const w = canvasRef.current.clientWidth || window.innerWidth;
      const h = canvasRef.current.clientHeight || (window.innerHeight - 140);
      const scaleW = (w - 40) / 620;
      const scaleH = (h - 40) / 500;
      const optimal = Math.min(scaleW, scaleH, 1.0);
      setZoom(Math.max(Number(optimal.toFixed(2)), 0.65));
    } else {
      setZoom(0.7);
    }
    setPan({ x: 0, y: 0 });
    setCenterPos({ x: 0, y: 0 });
  };

  const handleCycleStatus = (e, note) => {
    e.stopPropagation();
    const currentStatus = note.status || "todo";
    const nextStatus = STATUS_CONFIG[currentStatus]?.next || "todo";
    if (onUpdateNoteStatus) {
      onUpdateNoteStatus(note.id, nextStatus);
    }
  };

  const currentShapeObj = NODE_SHAPE_OPTIONS.find((s) => s.id === nodeShape) || NODE_SHAPE_OPTIONS[0];
  const CurrentShapeIcon = currentShapeObj.icon;

  return (
    <div className="notion-mindmap-wrapper">
      <div className="notion-mindmap-header">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <h3 className="notion-mindmap-title">
            <Network size={16} /> Mind Map View
          </h3>
          <span className="notion-mindmap-shape-badge">
            <CurrentShapeIcon size={11} />
            <span>Shape: {currentShapeObj.label}</span>
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ position: "relative" }}>
            <button
              type="button"
              className="notion-mindmap-shape-toggle-btn"
              onClick={() => setIsShapeMenuOpen((prev) => !prev)}
              title="Change note container shape"
            >
              <Shapes size={13} />
              <span>Note Shape</span>
            </button>

            {isShapeMenuOpen && (
              <div className="notion-mindmap-shape-menu" onClick={(e) => e.stopPropagation()}>
                <div className="notion-mindmap-shape-menu-header">Select Note Shape</div>
                {NODE_SHAPE_OPTIONS.map((shape) => {
                  const ShapeIcon = shape.icon;
                  const isSelected = nodeShape === shape.id;
                  return (
                    <button
                      key={shape.id}
                      type="button"
                      className={"notion-mindmap-shape-item " + (isSelected ? "is-selected" : "")}
                      onClick={() => handleSelectShape(shape.id)}
                    >
                      <ShapeIcon size={14} />
                      <div style={{ flex: 1, textAlign: "left" }}>
                        <div style={{ fontWeight: 600, fontSize: "12px" }}>{shape.label}</div>
                        <div style={{ fontSize: "10px", color: "var(--notion-secondary, #787774)" }}>{shape.desc}</div>
                      </div>
                      {isSelected && <Check size={13} style={{ color: "#2383e2" }} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            className="notion-mindmap-create-btn"
            onClick={() => onCreateNote()}
          >
            <Plus size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
            Add Node
          </button>
        </div>
      </div>

      <div
        ref={canvasRef}
        className={"notion-mindmap-canvas " + (isPanning ? "is-panning" : "")}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      >
        <div
          className="notion-mindmap-world"
          style={{
            transform: "translate(" + pan.x + "px, " + pan.y + "px) scale(" + zoom + ")",
          }}
        >
          <div
            className={"notion-mindmap-center " + (draggedNodeId === "center" ? "is-dragging" : "")}
            style={{
              transform: "translate(calc(-50% + " + centerPos.x + "px), calc(-50% + " + centerPos.y + "px))",
            }}
            onMouseDown={handleCenterMouseDown}
            title="Drag central workspace hub"
          >
            <span className="notion-mindmap-center-label">Mind Map</span>
            <span className="notion-mindmap-center-val">{events.length}</span>
            <span className="notion-mindmap-center-title">{workspaceTitle}</span>
          </div>

          {nodesWithPositions.map((note) => {
            const nx = note.x || 0;
            const ny = note.y || 0;
            const dx = nx - centerPos.x;
            const dy = ny - centerPos.y;
            const lineDistance = Math.hypot(dx, dy);
            const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
            const snippet = stripHtml(note.content);
            const isDragging = draggedNodeId === note.id;
            const isFocused = String(highlightedId) === String(note.id);
            const statusKey = note.status || "todo";
            const statusObj = STATUS_CONFIG[statusKey] || STATUS_CONFIG.todo;
            const StatusIcon = statusObj.icon;
            const isDone = statusKey === "done";

            return (
              <React.Fragment key={note.id}>
                <div
                  className={"notion-mindmap-line " + (isDragging ? "is-dragging " : "") + (isFocused ? "is-focused" : "")}
                  style={{
                    left: "calc(50% + " + centerPos.x + "px)",
                    top: "calc(50% + " + centerPos.y + "px)",
                    width: lineDistance + "px",
                    transform: "rotate(" + angleDeg + "deg)",
                  }}
                />

                <div
                  className={"notion-mindmap-node notion-mindmap-node--" + nodeShape + (isDragging ? " is-dragging" : "") + (isFocused ? " is-focused" : "") + (isDone ? " is-completed" : "")}
                  style={{
                    transform: "translate(calc(-50% + " + nx + "px), calc(-50% + " + ny + "px))",
                    borderLeftColor: note.color || "#2383e2",
                    borderTopColor: note.color || "#2383e2",
                  }}
                  onMouseDown={(e) => handleNodeMouseDown(e, note)}
                  onDoubleClick={() => onOpenNote(note)}
                  title="Double-click to open note"
                >
                  <div className="notion-mindmap-node-header">
                    <button
                      type="button"
                      className={"notion-mindmap-status-pill " + statusObj.className}
                      onClick={(e) => handleCycleStatus(e, note)}
                      title={"Status: " + statusObj.label + ". Click to cycle status."}
                    >
                      <StatusIcon size={10} />
                      <span>{statusObj.label}</span>
                    </button>

                    <div className="notion-mindmap-header-meta">
                      {onJumpToCalendar && note.date && (
                        <button
                          type="button"
                          className="notion-mindmap-jump-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onJumpToCalendar(note.date);
                          }}
                          title={"View on Calendar (" + note.date + ")"}
                        >
                          <CalendarIcon size={10} />
                        </button>
                      )}
                      {note.time && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "2px" }}>
                          <Clock size={9} /> {note.time}
                        </span>
                      )}
                      {note.reminder && <Bell size={9} color="#eb5757" />}
                    </div>
                  </div>

                  <h4 className={"notion-mindmap-node-title " + (isDone ? "is-done-text" : "")}>
                    {note.title || "Untitled"}
                  </h4>

                  {snippet && (
                    <p className="notion-mindmap-node-snippet">{snippet}</p>
                  )}
                </div>
              </React.Fragment>
            );
          })}

          {events.length === 0 && (
            <div className="notion-mindmap-empty">
              <h4>No Notes in this Workspace</h4>
              <p>Create your first note to start mapping your thoughts visually.</p>
              <button
                type="button"
                className="notion-mindmap-create-btn"
                onClick={() => onCreateNote()}
              >
                + Create Note
              </button>
            </div>
          )}
        </div>

        <div className="notion-mindmap-toolbar">
          <button
            type="button"
            className="notion-mindmap-tool-btn"
            onClick={() => handleZoom(0.1)}
            title="Zoom In"
          >
            <ZoomIn size={13} />
          </button>
          <button
            type="button"
            className="notion-mindmap-tool-btn"
            onClick={() => handleZoom(-0.1)}
            title="Zoom Out"
          >
            <ZoomOut size={13} />
          </button>
          <button
            type="button"
            className="notion-mindmap-tool-btn notion-mindmap-tool-btn--wide"
            onClick={handleReset}
            title="Reset Zoom & Pan"
          >
            <RotateCcw size={12} style={{ marginRight: "3px" }} /> {Math.round(zoom * 100)}%
          </button>
        </div>
      </div>
    </div>
  );
}
