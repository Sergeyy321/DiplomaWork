import React, { useRef, useState, useEffect, useCallback } from "react";
import { 
  Pencil, 
  Highlighter, 
  Eraser, 
  Undo2, 
  Redo2, 
  Trash2, 
  Download
} from "lucide-react";
import "./NoteDrawingCanvas.css";

const DRAW_COLORS = [
  "#1e293b", // Slate Black
  "#2563eb", // Blue
  "#ef4444", // Red
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#64748b", // Slate Grey
];

const BRUSH_SIZES = [
  { label: "Fine", size: 2 },
  { label: "Medium", size: 4 },
  { label: "Thick", size: 8 },
  { label: "Bold", size: 14 },
];

export default function NoteDrawingCanvas({
  initialDrawing = "",
  onDrawingChange,
  width = 640,
  height = 360,
}) {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState("pen"); // 'pen' | 'highlighter' | 'eraser'
  const [color, setColor] = useState("#1e293b");
  const [brushSize, setBrushSize] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);

  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);

  // Save current canvas state for undo/redo
  const saveSnapshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(data);
    if (historyRef.current.length > 20) {
      historyRef.current.shift();
    }
    historyIndexRef.current = historyRef.current.length - 1;

    // Export Data URL
    if (onDrawingChange) {
      const dataUrl = canvas.toDataURL("image/png");
      onDrawingChange(dataUrl);
    }
  }, [onDrawingChange]);

  // Load initial drawing or blank canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    if (initialDrawing) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        saveSnapshot();
      };
      img.src = initialDrawing;
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      saveSnapshot();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX);
    const clientY = e.clientY ?? (e.touches && e.touches[0]?.clientY);

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const coords = getCanvasCoords(e);
    setIsDrawing(true);

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = brushSize * 4;
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else if (tool === "highlighter") {
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize * 3;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
    }
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const coords = getCanvasCoords(e);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveSnapshot();
    }
  };

  const handleUndo = () => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.putImageData(historyRef.current[historyIndexRef.current], 0, 0);
      if (onDrawingChange) {
        onDrawingChange(canvas.toDataURL("image/png"));
      }
    }
  };

  const handleRedo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.putImageData(historyRef.current[historyIndexRef.current], 0, 0);
      if (onDrawingChange) {
        onDrawingChange(canvas.toDataURL("image/png"));
      }
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveSnapshot();
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "note-sketch.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="note-drawing-pad">
      {/* Drawing Toolbar */}
      <div className="note-drawing-toolbar">
        {/* Tools */}
        <div className="note-drawing-btn-group">
          <button
            type="button"
            className={`note-drawing-tool-btn ${tool === "pen" ? "is-active" : ""}`}
            onClick={() => setTool("pen")}
            title="Pencil / Pen"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            className={`note-drawing-tool-btn ${tool === "highlighter" ? "is-active" : ""}`}
            onClick={() => setTool("highlighter")}
            title="Highlighter"
          >
            <Highlighter size={14} />
          </button>
          <button
            type="button"
            className={`note-drawing-tool-btn ${tool === "eraser" ? "is-active" : ""}`}
            onClick={() => setTool("eraser")}
            title="Eraser"
          >
            <Eraser size={14} />
          </button>
        </div>

        {/* Brush Size */}
        <div className="note-drawing-sizes">
          {BRUSH_SIZES.map((b) => (
            <button
              key={b.size}
              type="button"
              className={`note-drawing-size-dot ${brushSize === b.size ? "is-active" : ""}`}
              onClick={() => setBrushSize(b.size)}
              title={`${b.label} (${b.size}px)`}
            >
              <span style={{ width: `${b.size * 1.5 + 4}px`, height: `${b.size * 1.5 + 4}px` }} />
            </button>
          ))}
        </div>

        {/* Color Swatches */}
        <div className="note-drawing-swatches">
          {DRAW_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`note-drawing-swatch ${color === c ? "is-active" : ""}`}
              style={{ backgroundColor: c }}
              onClick={() => {
                setColor(c);
                if (tool === "eraser") setTool("pen");
              }}
              title={c}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="note-drawing-actions">
          <button
            type="button"
            className="note-drawing-action-btn"
            onClick={handleUndo}
            title="Undo"
          >
            <Undo2 size={13} />
          </button>
          <button
            type="button"
            className="note-drawing-action-btn"
            onClick={handleRedo}
            title="Redo"
          >
            <Redo2 size={13} />
          </button>
          <button
            type="button"
            className="note-drawing-action-btn note-drawing-action-btn--danger"
            onClick={handleClear}
            title="Clear canvas"
          >
            <Trash2 size={13} />
          </button>
          <button
            type="button"
            className="note-drawing-action-btn"
            onClick={handleDownload}
            title="Download sketch PNG"
          >
            <Download size={13} />
          </button>
        </div>
      </div>

      {/* Drawing Canvas Area */}
      <div className="note-drawing-canvas-wrap">
        <canvas
          ref={canvasRef}
          className="note-drawing-canvas"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      <div className="note-drawing-footer">
        <span>Draw diagrams, handwriting, or sketches. Automatically saves with note.</span>
      </div>
    </div>
  );
}
