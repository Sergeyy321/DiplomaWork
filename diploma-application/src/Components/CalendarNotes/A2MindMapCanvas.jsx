import React, { useState, useRef, useEffect, useCallback } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { 
  Download, 
  Palette, 
  Plus, 
  Edit3, 
  Sparkles, 
  Heart, 
  Briefcase, 
  Users, 
  Smile, 
  Lightbulb, 
  Activity, 
  Check, 
  LayoutGrid,
  Pencil,
  Highlighter,
  Eraser,
  MousePointer,
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
  Square,
  Circle as CircleIcon,
  ArrowUpRight,
  GripHorizontal,
  Shapes,
  Crosshair,
  X,
  Trash2
} from "lucide-react";
import "./A2MindMapCanvas.css";

export const BG_PALETTES = [
  { id: "white", label: "Pure White", bg: "#ffffff", cardBg: "#ffffff", border: "#e2e8f0", text: "#1e293b", subText: "#64748b" },
  { id: "cream", label: "Warm Paper", bg: "#faf8f5", cardBg: "#ffffff", border: "#ede7de", text: "#2c2a29", subText: "#78716c" },
  { id: "mint", label: "Mint Sage", bg: "#f0fdf4", cardBg: "#ffffff", border: "#dcfce7", text: "#14532d", subText: "#15803d" },
  { id: "lavender", label: "Pastel Lavender", bg: "#faf5ff", cardBg: "#ffffff", border: "#f3e8ff", text: "#581c87", subText: "#7e22ce" },
  { id: "sky", label: "Soft Blue", bg: "#f0f9ff", cardBg: "#ffffff", border: "#e0f2fe", text: "#0c4a6e", subText: "#0369a1" },
  { id: "dark", label: "Midnight Slate", bg: "#0f172a", cardBg: "#1e293b", border: "#334155", text: "#f8fafc", subText: "#94a3b8" },
  { id: "studio", label: "Obsidian Dark", bg: "#18181b", cardBg: "#27272a", border: "#3f3f46", text: "#fafafa", subText: "#a1a1aa" },
];

export const SHAPES_CONFIG = [
  { id: "rounded", label: "Modern Card", desc: "Rounded sleek card geometry" },
  { id: "sharp", label: "Blueprint Box", desc: "Strict geometric frame with tech brackets" },
  { id: "hexagon", label: "Cyber Hexagon", desc: "Chamfered 45-degree polygon" },
  { id: "pill", label: "Capsule Pill", desc: "Smooth continuous stadium pill" },
  { id: "bubble", label: "Thought Bubble", desc: "Speech cloud with talk notch" },
  { id: "badge", label: "Shield Crest", desc: "Tapered bottom milestone shield" },
  { id: "organic", label: "Flowing Cloud", desc: "Asymmetric fluid wave shape" },
];

export const INITIAL_A2_CATEGORIES = [
  {
    id: "family",
    title: "Family",
    icon: "Heart",
    color: "#ec4899",
    glow: "rgba(236, 72, 153, 0.15)",
    x: 140,
    y: 120,
    width: 360,
    height: 280,
    shape: "rounded",
    items: ["Weekly family dinner", "Call parents on Sunday", "Plan summer vacation trip"],
  },
  {
    id: "work",
    title: "Work",
    icon: "Briefcase",
    color: "#2563eb",
    glow: "rgba(37, 99, 235, 0.15)",
    x: 1180,
    y: 120,
    width: 360,
    height: 280,
    shape: "rounded",
    items: ["Complete diploma architecture slides", "Deploy version 2.0 release", "Review team deliverables"],
  },
  {
    id: "friends",
    title: "Friends",
    icon: "Users",
    color: "#10b981",
    glow: "rgba(16, 185, 129, 0.15)",
    x: 80,
    y: 460,
    width: 360,
    height: 280,
    shape: "rounded",
    items: ["Weekend board game night", "Catch up with college friends", "Birthday dinner planning"],
  },
  {
    id: "hobbies",
    title: "Hobbies",
    icon: "Smile",
    color: "#f59e0b",
    glow: "rgba(245, 158, 11, 0.15)",
    x: 1240,
    y: 460,
    width: 360,
    height: 280,
    shape: "rounded",
    items: ["Digital painting practice", "Guitar 30 mins daily", "Photography photo walk"],
  },
  {
    id: "ideas",
    title: "New Ideas",
    icon: "Lightbulb",
    color: "#8b5cf6",
    glow: "rgba(139, 92, 246, 0.15)",
    x: 200,
    y: 800,
    width: 360,
    height: 280,
    shape: "rounded",
    items: ["Build AI note-taking extension", "Design A2 visual poster planner", "Automate weekly summaries"],
  },
  {
    id: "health",
    title: "Health",
    icon: "Activity",
    color: "#06b6d4",
    glow: "rgba(6, 182, 212, 0.15)",
    x: 1120,
    y: 800,
    width: 360,
    height: 280,
    shape: "rounded",
    items: ["Morning 5km run", "Drink 2.5L water daily", "8 hours consistent sleep"],
  },
];

const ICONS_MAP = {
  Heart,
  Briefcase,
  Users,
  Smile,
  Lightbulb,
  Activity,
  Sparkles,
};

const DRAW_COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#10b981",
  "#06b6d4",
  "#2563eb",
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#1e293b",
];

const A2_CANVAS_WIDTH = 1680;
const A2_CANVAS_HEIGHT = 1188;

export default function A2MindMapCanvas() {
  const [categories, setCategories] = useState(() => {
    try {
      const saved = localStorage.getItem("a2_canvas_categories");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_A2_CATEGORIES;
  });

  const [centerTitle, setCenterTitle] = useState(() => {
    return localStorage.getItem("a2_canvas_center_title") || "My Life & Goals 2026";
  });

  const [centerPos, setCenterPos] = useState(() => {
    try {
      const saved = localStorage.getItem("a2_canvas_center_pos");
      if (saved) return JSON.parse(saved);
    } catch {}
    return { x: 700, y: 514, width: 280, height: 160, shape: "rounded" };
  });

  const centerHubCenterX = (centerPos?.x ?? 700) + (centerPos?.width ?? 280) / 2;
  const centerHubCenterY = (centerPos?.y ?? 514) + (centerPos?.height ?? 160) / 2;

  const [selectedPalette, setSelectedPalette] = useState(BG_PALETTES[1]);
  const [zoomLevel, setZoomLevel] = useState(0.75);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(centerTitle);
  const [isExporting, setIsExporting] = useState(false);
  const [newItemInputs, setNewItemInputs] = useState({});
  const [appMode, setAppMode] = useState("interact");
  const [openShapeMenuId, setOpenShapeMenuId] = useState(null);

  const [drawTool, setDrawTool] = useState("pen");
  const [drawColor, setDrawColor] = useState("#2563eb");
  const [brushSize, setBrushSize] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);

  const canvasRef = useRef(null);
  const paintCanvasRef = useRef(null);
  const viewportRef = useRef(null);
  const drawingHistory = useRef([]);
  const historyIndex = useRef(-1);
  const startDrawPos = useRef({ x: 0, y: 0 });
  const snapshotRef = useRef(null);

  const dragInfo = useRef(null);
  const resizeInfo = useRef(null);

  // Center viewport scroll on mount and zoom
  useEffect(() => {
    if (viewportRef.current) {
      const vp = viewportRef.current;
      const scrollX = (A2_CANVAS_WIDTH * zoomLevel - vp.clientWidth) / 2;
      const scrollY = (A2_CANVAS_HEIGHT * zoomLevel - vp.clientHeight) / 2;
      vp.scrollLeft = Math.max(0, scrollX);
      vp.scrollTop = Math.max(0, scrollY);
    }
  }, [zoomLevel]);

  useEffect(() => {
    try {
      localStorage.setItem("a2_canvas_categories", JSON.stringify(categories));
    } catch {}
  }, [categories]);

  useEffect(() => {
    try {
      localStorage.setItem("a2_canvas_center_pos", JSON.stringify(centerPos));
    } catch {}
  }, [centerPos]);

  useEffect(() => {
    try {
      localStorage.setItem("a2_canvas_center_title", centerTitle);
    } catch {}
  }, [centerTitle]);

  const centerCanvasInViewport = useCallback((smooth = false) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const centerPointX = ((centerPos?.x ?? 700) + (centerPos?.width ?? 280) / 2) * zoomLevel;
    const centerPointY = ((centerPos?.y ?? 514) + (centerPos?.height ?? 160) / 2) * zoomLevel;
    const targetScrollLeft = Math.max(0, centerPointX - viewport.clientWidth / 2);
    const targetScrollTop = Math.max(0, centerPointY - viewport.clientHeight / 2);
    
    viewport.scrollTo({
      left: targetScrollLeft,
      top: targetScrollTop,
      behavior: smooth ? "smooth" : "auto",
    });
  }, [centerPos, zoomLevel]);

  useEffect(() => {
    const timer = setTimeout(() => {
      centerCanvasInViewport(false);
    }, 150);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handlePointerMove = (e) => {
      const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX);
      const clientY = e.clientY ?? (e.touches && e.touches[0]?.clientY);
      if (clientX === undefined || clientY === undefined) return;

      if (dragInfo.current) {
        const { targetId, startMouseX, startMouseY, startX, startY } = dragInfo.current;
        const dx = (clientX - startMouseX) / zoomLevel;
        const dy = (clientY - startMouseY) / zoomLevel;

        const newX = Math.round(startX + dx);
        const newY = Math.round(startY + dy);

        if (targetId === "center") {
          setCenterPos((prev) => ({ ...prev, x: newX, y: newY }));
        } else {
          setCategories((prev) =>
            prev.map((c) => (c.id === targetId ? { ...c, x: newX, y: newY } : c))
          );
        }
      }

      if (resizeInfo.current) {
        const { targetId, startMouseX, startMouseY, startW, startH } = resizeInfo.current;
        const dw = (clientX - startMouseX) / zoomLevel;
        const dh = (clientY - startMouseY) / zoomLevel;

        const newW = Math.max(220, Math.round(startW + dw));
        const newH = Math.max(140, Math.round(startH + dh));

        if (targetId === "center") {
          setCenterPos((prev) => ({ ...prev, width: newW, height: newH }));
        } else {
          setCategories((prev) =>
            prev.map((c) => (c.id === targetId ? { ...c, width: newW, height: newH } : c))
          );
        }
      }
    };

    const handlePointerUp = () => {
      dragInfo.current = null;
      resizeInfo.current = null;
    };

    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);
    window.addEventListener("touchmove", handlePointerMove);
    window.addEventListener("touchend", handlePointerUp);
    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
      window.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("touchend", handlePointerUp);
    };
  }, [zoomLevel]);

  const handleStartDrag = (e, targetId) => {
    if (appMode !== "interact") return;
    e.stopPropagation();

    const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX);
    const clientY = e.clientY ?? (e.touches && e.touches[0]?.clientY);

    const item = targetId === "center" 
      ? centerPos 
      : categories.find((c) => c.id === targetId);

    if (item && clientX !== undefined && clientY !== undefined) {
      dragInfo.current = {
        targetId,
        startMouseX: clientX,
        startMouseY: clientY,
        startX: item.x,
        startY: item.y,
      };
    }
  };

  const handleStartResize = (e, targetId) => {
    if (appMode !== "interact") return;
    e.stopPropagation();

    const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX);
    const clientY = e.clientY ?? (e.touches && e.touches[0]?.clientY);

    const item = targetId === "center" 
      ? centerPos 
      : categories.find((c) => c.id === targetId);

    if (item && clientX !== undefined && clientY !== undefined) {
      resizeInfo.current = {
        targetId,
        startMouseX: clientX,
        startMouseY: clientY,
        startW: item.width,
        startH: item.height,
      };
    }
  };

  const handleChangeShape = (targetId, shapeId) => {
    setOpenShapeMenuId(null);
    if (targetId === "center") {
      setCenterPos((prev) => ({ ...prev, shape: shapeId }));
    } else {
      setCategories((prev) =>
        prev.map((c) => (c.id === targetId ? { ...c, shape: shapeId } : c))
      );
    }
  };

  const handleAddNewTopic = () => {
    const newId = `topic_${Date.now()}`;
    const newColor = DRAW_COLORS[categories.length % DRAW_COLORS.length];
    const count = categories.length;

    const angle = (count * (2 * Math.PI / Math.max(6, count + 1))) - Math.PI / 2;
    const radius = 340;

    let spawnX = Math.round(centerHubCenterX + Math.cos(angle) * radius - 170);
    let spawnY = Math.round(centerHubCenterY + Math.sin(angle) * radius - 130);

    spawnX = Math.max(50, Math.min(A2_CANVAS_WIDTH - 390, spawnX));
    spawnY = Math.max(50, Math.min(A2_CANVAS_HEIGHT - 300, spawnY));

    const newTopic = {
      id: newId,
      title: `Topic ${count + 1}`,
      icon: "Sparkles",
      color: newColor,
      glow: `${newColor}26`,
      x: spawnX,
      y: spawnY,
      width: 340,
      height: 260,
      shape: "rounded",
      items: ["New focus milestone", "Add actionable goal"],
    };
    setCategories((prev) => [...prev, newTopic]);
  };

  const handleDeleteTopic = (catId) => {
    const topic = categories.find((c) => c.id === catId);
    const confirmed = window.confirm(`Are you sure you want to delete topic "${topic?.title || "Topic"}"?`);
    if (confirmed) {
      setCategories((prev) => prev.filter((c) => c.id !== catId));
    }
  };

  const saveDrawingState = useCallback(() => {
    const pCanvas = paintCanvasRef.current;
    if (!pCanvas) return;
    const ctx = pCanvas.getContext("2d");
    if (!ctx) return;

    const currentData = ctx.getImageData(0, 0, A2_CANVAS_WIDTH, A2_CANVAS_HEIGHT);
    drawingHistory.current = drawingHistory.current.slice(0, historyIndex.current + 1);
    drawingHistory.current.push(currentData);
    if (drawingHistory.current.length > 25) {
      drawingHistory.current.shift();
    }
    historyIndex.current = drawingHistory.current.length - 1;
  }, []);

  const handleUndo = () => {
    if (historyIndex.current > 0) {
      historyIndex.current -= 1;
      const pCanvas = paintCanvasRef.current;
      if (!pCanvas) return;
      const ctx = pCanvas.getContext("2d");
      if (!ctx) return;
      ctx.putImageData(drawingHistory.current[historyIndex.current], 0, 0);
    }
  };

  const handleRedo = () => {
    if (historyIndex.current < drawingHistory.current.length - 1) {
      historyIndex.current += 1;
      const pCanvas = paintCanvasRef.current;
      if (!pCanvas) return;
      const ctx = pCanvas.getContext("2d");
      if (!ctx) return;
      ctx.putImageData(drawingHistory.current[historyIndex.current], 0, 0);
    }
  };

  const handleClearDrawing = () => {
    const pCanvas = paintCanvasRef.current;
    if (!pCanvas) return;
    const ctx = pCanvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, A2_CANVAS_WIDTH, A2_CANVAS_HEIGHT);
    saveDrawingState();
  };

  const getCanvasCoords = (e) => {
    const pCanvas = paintCanvasRef.current;
    if (!pCanvas) return { x: 0, y: 0 };
    const rect = pCanvas.getBoundingClientRect();
    const scaleX = A2_CANVAS_WIDTH / rect.width;
    const scaleY = A2_CANVAS_HEIGHT / rect.height;

    const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX);
    const clientY = e.clientY ?? (e.touches && e.touches[0]?.clientY);

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e) => {
    if (appMode !== "draw") return;
    const pCanvas = paintCanvasRef.current;
    if (!pCanvas) return;
    const ctx = pCanvas.getContext("2d");
    if (!ctx) return;

    const coords = getCanvasCoords(e);
    startDrawPos.current = coords;
    setIsDrawing(true);

    if (["rect", "circle", "arrow"].includes(drawTool)) {
      snapshotRef.current = ctx.getImageData(0, 0, A2_CANVAS_WIDTH, A2_CANVAS_HEIGHT);
    }

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);

    if (drawTool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = brushSize * 4;
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else if (drawTool === "highlighter") {
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = brushSize * 3;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = brushSize;
    }
  };

  const draw = (e) => {
    if (!isDrawing || appMode !== "draw") return;
    const pCanvas = paintCanvasRef.current;
    if (!pCanvas) return;
    const ctx = pCanvas.getContext("2d");
    if (!ctx) return;

    const coords = getCanvasCoords(e);

    if (drawTool === "pen" || drawTool === "highlighter" || drawTool === "eraser") {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    } else if (["rect", "circle", "arrow"].includes(drawTool) && snapshotRef.current) {
      ctx.putImageData(snapshotRef.current, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = brushSize;

      const sx = startDrawPos.current.x;
      const sy = startDrawPos.current.y;
      const ex = coords.x;
      const ey = coords.y;

      if (drawTool === "rect") {
        ctx.strokeRect(sx, sy, ex - sx, ey - sy);
      } else if (drawTool === "circle") {
        const rx = Math.abs(ex - sx) / 2;
        const ry = Math.abs(ey - sy) / 2;
        const cx = Math.min(sx, ex) + rx;
        const cy = Math.min(sy, ey) + ry;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (drawTool === "arrow") {
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        const angle = Math.atan2(ey - sy, ex - sx);
        const headlen = Math.max(12, brushSize * 2.5);
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - headlen * Math.cos(angle - Math.PI / 6), ey - headlen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - headlen * Math.cos(angle + Math.PI / 6), ey - headlen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveDrawingState();
    }
  };

  const handleAddItem = (catId) => {
    const text = (newItemInputs[catId] || "").trim();
    if (!text) return;
    setCategories((prev) =>
      prev.map((c) =>
        c.id === catId ? { ...c, items: [...(Array.isArray(c.items) ? c.items : []), text] } : c
      )
    );
    setNewItemInputs((prev) => ({ ...prev, [catId]: "" }));
  };

  const handleDeleteItem = (catId, index) => {
    const topic = categories.find((c) => c.id === catId);
    const itemText = topic?.items?.[index] || "this item";
    const confirmed = window.confirm(`Delete item "${itemText}"?`);
    if (confirmed) {
      setCategories((prev) =>
        prev.map((c) =>
          c.id === catId
            ? { ...c, items: (Array.isArray(c.items) ? c.items : []).filter((_, i) => i !== index) }
            : c
        )
      );
    }
  };

  const handleDownloadPdf = async () => {
    if (!canvasRef.current) return;
    setIsExporting(true);
    try {
      const element = canvasRef.current;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: selectedPalette.bg,
        logging: false,
        onclone: (clonedDoc) => {
          const clonedZoom = clonedDoc.querySelector(".a2-canvas-zoom-container");
          if (clonedZoom) {
            clonedZoom.style.transform = "none";
          }
          const clonedSheet = clonedDoc.getElementById("a2-printable-canvas");
          if (clonedSheet) {
            clonedSheet.style.width = "1680px";
            clonedSheet.style.height = "1188px";
          }
          clonedDoc.querySelectorAll(".a2-card-drag-bar, .a2-resize-handle, .a2-card-del-btn, .a2-shape-picker-btn, .a2-sector-add-row, .a2-center-edit-icon, .a2-sector-item-del").forEach((el) => {
            el.style.display = "none";
          });
        },
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a2",
        compress: true,
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
      const filename = centerTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "a2-mind-map";
      pdf.save(`${filename}-a2-poster.pdf`);
    } catch (err) {
      console.error("PDF Export failed", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="a2-studio-wrapper">
      {/* Top Main Toolbar */}
      <div className="a2-studio-toolbar">
        <div className="a2-studio-toolbar-left">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="a2-studio-badge">
              <LayoutGrid size={14} /> Real A2 Paper (594 × 420 mm)
            </span>
            <span className="a2-studio-zoom-badge">
              {Math.round(zoomLevel * 100)}% Scale
            </span>
          </div>
          <span className="a2-studio-subtitle">
            Freely Drag & Resize Topics • Custom Geometric Shapes • Radiating Connectors • Paint Layer
          </span>
        </div>

        <div className="a2-studio-toolbar-right">
          {/* Mode Switcher */}
          <div className="a2-mode-selector">
            <button
              type="button"
              className={`a2-mode-btn ${appMode === "interact" ? "is-active" : ""}`}
              onClick={() => setAppMode("interact")}
              title="Drag cards, resize space, type goals, change shapes"
            >
              <MousePointer size={13} /> Select & Move
            </button>
            <button
              type="button"
              className={`a2-mode-btn ${appMode === "draw" ? "is-active" : ""}`}
              onClick={() => setAppMode("draw")}
              title="Freehand Paint directly on A2 canvas"
            >
              <Pencil size={13} /> Draw & Paint
            </button>
          </div>

          {/* Add New Topic Node Button */}
          <button
            type="button"
            className="a2-studio-btn a2-studio-btn--primary"
            onClick={handleAddNewTopic}
            title="Create a new draggable topic space on A2 sheet"
          >
            <Plus size={13} /> Add Topic Space
          </button>

          {/* Zoom & Viewport Controls */}
          <div className="a2-zoom-controls">
            <button
              type="button"
              className="a2-zoom-btn a2-zoom-btn--center"
              onClick={() => centerCanvasInViewport(true)}
              title="Center View on Core Vision Hub"
            >
              <Crosshair size={13} /> Center View
            </button>
            <button
              type="button"
              className="a2-zoom-btn"
              onClick={() => setZoomLevel((z) => Math.max(0.4, Number((z - 0.15).toFixed(2))))}
              title="Zoom Out"
            >
              <ZoomOut size={13} />
            </button>
            <button
              type="button"
              className="a2-zoom-btn"
              onClick={() => setZoomLevel(0.75)}
              title="Fit to Screen (75%)"
            >
              Fit
            </button>
            <button
              type="button"
              className="a2-zoom-btn"
              onClick={() => setZoomLevel(1.0)}
              title="Real A2 100% Poster Size"
            >
              100% A2
            </button>
            <button
              type="button"
              className="a2-zoom-btn"
              onClick={() => setZoomLevel((z) => Math.min(1.5, Number((z + 0.15).toFixed(2))))}
              title="Zoom In"
            >
              <ZoomIn size={13} />
            </button>
          </div>

          {/* Background Palette */}
          <div className="a2-palette-picker">
            <Palette size={13} color="#787774" />
            <div className="a2-palette-swatches">
              {BG_PALETTES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`a2-palette-swatch ${selectedPalette.id === p.id ? "is-active" : ""}`}
                  style={{ backgroundColor: p.bg }}
                  onClick={() => setSelectedPalette(p)}
                  title={p.label}
                />
              ))}
            </div>
          </div>

          {/* Download PDF Button */}
          <button
            type="button"
            className="a2-studio-btn a2-studio-btn--accent"
            onClick={handleDownloadPdf}
            disabled={isExporting}
          >
            <Download size={13} />
            {isExporting ? "Generating A2 PDF..." : "Export A2 PDF"}
          </button>
        </div>
      </div>

      {/* Paint Sub-Toolbar */}
      {appMode === "draw" && (
        <div className="a2-paint-toolbar">
          <div className="a2-paint-tools-group">
            <button
              type="button"
              className={`a2-paint-tool-btn ${drawTool === "pen" ? "is-active" : ""}`}
              onClick={() => setDrawTool("pen")}
              title="Pen / Pencil"
            >
              <Pencil size={15} />
            </button>
            <button
              type="button"
              className={`a2-paint-tool-btn ${drawTool === "highlighter" ? "is-active" : ""}`}
              onClick={() => setDrawTool("highlighter")}
              title="Marker Highlighter"
            >
              <Highlighter size={15} />
            </button>
            <button
              type="button"
              className={`a2-paint-tool-btn ${drawTool === "rect" ? "is-active" : ""}`}
              onClick={() => setDrawTool("rect")}
              title="Draw Rectangle"
            >
              <Square size={15} />
            </button>
            <button
              type="button"
              className={`a2-paint-tool-btn ${drawTool === "circle" ? "is-active" : ""}`}
              onClick={() => setDrawTool("circle")}
              title="Draw Ellipse"
            >
              <CircleIcon size={15} />
            </button>
            <button
              type="button"
              className={`a2-paint-tool-btn ${drawTool === "arrow" ? "is-active" : ""}`}
              onClick={() => setDrawTool("arrow")}
              title="Draw Arrow"
            >
              <ArrowUpRight size={15} />
            </button>
            <button
              type="button"
              className={`a2-paint-tool-btn ${drawTool === "eraser" ? "is-active" : ""}`}
              onClick={() => setDrawTool("eraser")}
              title="Eraser"
            >
              <Eraser size={15} />
            </button>
          </div>

          <div className="a2-paint-divider" />

          {/* Color Palette with Big Comfortable Buttons */}
          <div className="a2-paint-swatches">
            {DRAW_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`a2-paint-swatch ${drawColor === c ? "is-active" : ""}`}
                style={{ backgroundColor: c }}
                onClick={() => {
                  setDrawColor(c);
                  if (drawTool === "eraser") setDrawTool("pen");
                }}
                title={c}
              />
            ))}
          </div>

          <div className="a2-paint-divider" />

          {/* Brush Size Slider */}
          <div className="a2-brush-slider-wrap">
            <span style={{ fontSize: "11px", color: "#787774", fontWeight: 600 }}>Size: {brushSize}px</span>
            <input
              type="range"
              min="1"
              max="24"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="a2-brush-slider"
            />
          </div>

          <div className="a2-paint-divider" />

          {/* Undo / Redo / Clear Paint */}
          <div className="a2-paint-actions">
            <button
              type="button"
              className="a2-paint-action-btn"
              onClick={handleUndo}
              title="Undo stroke"
            >
              <Undo2 size={13} />
            </button>
            <button
              type="button"
              className="a2-paint-action-btn"
              onClick={handleRedo}
              title="Redo stroke"
            >
              <Redo2 size={13} />
            </button>
            <button
              type="button"
              className="a2-paint-action-btn a2-paint-action-btn--danger"
              onClick={handleClearDrawing}
              title="Clear all drawings"
            >
              <Trash2 size={13} /> Clear Paint
            </button>
          </div>
        </div>
      )}

      {/* A2 Scrollable Canvas Viewport */}
      <div className="a2-canvas-viewport" ref={viewportRef}>
        <div 
          className="a2-canvas-zoom-container"
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: "top center",
          }}
        >
          <div
            ref={canvasRef}
            className={`a2-printable-sheet ${appMode === "draw" ? "is-paint-mode" : ""}`}
            id="a2-printable-canvas"
            style={{
              width: `${A2_CANVAS_WIDTH}px`,
              height: `${A2_CANVAS_HEIGHT}px`,
              backgroundColor: selectedPalette.bg,
              color: selectedPalette.text,
              borderColor: selectedPalette.border,
            }}
          >
            {/* Subtle A2 Grid Background */}
            <div 
              className="a2-canvas-grid-bg"
              style={{
                backgroundImage: `radial-gradient(${selectedPalette.border} 1.5px, transparent 1.5px)`,
              }}
            />

            {/* Canvas Header / Poster Watermark */}
            <div className="a2-canvas-header" style={{ color: selectedPalette.subText }}>
              <span>A2 LIFE BALANCE & GOALS FRAMEWORK • DRAGGABLE RADIAL MAP</span>
              <span>REAL A2 POSTER SCALE (594 MM × 420 MM • 1.414 RATIO)</span>
            </div>

            {/* SVG Dynamic Radiating Directional Arrows */}
            <svg className="a2-arrows-svg" viewBox="0 0 1680 1188" preserveAspectRatio="none">
              <defs>
                {categories.map((c) => (
                  <marker
                    key={`arrowhead-${c.id}`}
                    id={`arrowhead-${c.id}`}
                    markerWidth="10"
                    markerHeight="8"
                    refX="8"
                    refY="4"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 4, 0 8" fill={c.color || "#6366f1"} />
                  </marker>
                ))}
              </defs>

              {/* Dynamic Cubic Bezier Paths Connecting Center Hub to Each Card */}
              {categories.map((cat) => {
                const cardCenterX = (cat.x || 0) + (cat.width || 340) / 2;
                const cardCenterY = (cat.y || 0) + (cat.height || 260) / 2;

                const c1x = centerHubCenterX + (cardCenterX - centerHubCenterX) * 0.4;
                const c1y = centerHubCenterY + (cardCenterY - centerHubCenterY) * 0.1;
                const c2x = cardCenterX - (cardCenterX - centerHubCenterX) * 0.2;
                const c2y = cardCenterY - (cardCenterY - centerHubCenterY) * 0.4;

                return (
                  <path
                    key={`arrow-path-${cat.id}`}
                    d={`M ${centerHubCenterX} ${centerHubCenterY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${cardCenterX} ${cardCenterY}`}
                    stroke={cat.color || "#6366f1"}
                    strokeWidth="3.5"
                    strokeDasharray="6,6"
                    fill="none"
                    markerEnd={`url(#arrowhead-${cat.id})`}
                    style={{ pointerEvents: "none" }}
                  />
                );
              })}
            </svg>

            {/* FREEHAND HTML5 PAINT CANVAS LAYER */}
            <canvas
              ref={paintCanvasRef}
              width={A2_CANVAS_WIDTH}
              height={A2_CANVAS_HEIGHT}
              className={`a2-paint-canvas-layer ${appMode === "draw" ? "is-active" : ""}`}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />

            {/* FREELY DRAGGABLE & RESIZABLE CENTRAL LIFE VISION HUB */}
            <div
              className={`a2-center-hub a2-center-hub--shape-${centerPos.shape || "rounded"}`}
              style={{
                position: "absolute",
                left: `${centerPos.x}px`,
                top: `${centerPos.y}px`,
                width: `${centerPos.width}px`,
                height: `${centerPos.height}px`,
                backgroundColor: selectedPalette.cardBg,
                borderColor: selectedPalette.border,
                zIndex: 15,
              }}
            >
              {/* Drag Handle on Header */}
              <div 
                className="a2-center-drag-bar"
                onMouseDown={(e) => handleStartDrag(e, "center")}
                onTouchStart={(e) => handleStartDrag(e, "center")}
                title="Drag to move Central Hub"
              >
                <GripHorizontal size={14} color="#787774" />
                <button
                  type="button"
                  className="a2-shape-picker-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenShapeMenuId(openShapeMenuId === "center" ? null : "center");
                  }}
                  title="Change Center Shape Geometry"
                >
                  <Shapes size={12} />
                </button>

                {openShapeMenuId === "center" && (
                  <div className="a2-shape-dropdown" onClick={(e) => e.stopPropagation()}>
                    {SHAPES_CONFIG.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className={`a2-shape-opt ${centerPos.shape === s.id ? "is-active" : ""}`}
                        onClick={() => handleChangeShape("center", s.id)}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Central Logo Symbol */}
              <div className="a2-center-icon-container">
                <Sparkles size={24} color="#6366f1" />
              </div>

              {isEditingTitle ? (
                <div className="a2-center-title-edit-row">
                  <input
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    className="a2-center-title-input"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setCenterTitle(tempTitle.trim() || "My Life & Goals");
                        setIsEditingTitle(false);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="a2-center-edit-btn"
                    onClick={() => {
                      setCenterTitle(tempTitle.trim() || "My Life & Goals");
                      setIsEditingTitle(false);
                    }}
                  >
                    <Check size={14} />
                  </button>
                </div>
              ) : (
                <div 
                  className="a2-center-title-display"
                  onClick={() => setIsEditingTitle(true)}
                  title="Click to edit topic name"
                >
                  <span className="a2-center-title-text">{centerTitle}</span>
                  <Edit3 size={14} className="a2-center-edit-icon" />
                </div>
              )}
              <span className="a2-center-subtag">Core Focus / Life Balance</span>

              {/* Resize Handle */}
              <div 
                className="a2-resize-handle"
                onMouseDown={(e) => handleStartResize(e, "center")}
                onTouchStart={(e) => handleStartResize(e, "center")}
                title="Drag to resize space"
              />
            </div>

            {/* FREELY DRAGGABLE & RESIZABLE TOPIC SPACES */}
            {categories.map((cat) => {
              const Icon = ICONS_MAP[cat.icon] || Heart;
              const itemsList = Array.isArray(cat.items) ? cat.items : [];

              return (
                <div
                  key={cat.id}
                  className={`a2-sector-card a2-sector-card--${cat.id} a2-shape--${cat.shape || "rounded"}`}
                  style={{
                    position: "absolute",
                    left: `${cat.x}px`,
                    top: `${cat.y}px`,
                    width: `${cat.width}px`,
                    height: `${cat.height}px`,
                    backgroundColor: selectedPalette.cardBg,
                    border: `2px solid ${cat.color}`,
                    boxShadow: `0 10px 30px ${cat.glow || "rgba(0,0,0,0.06)"}`,
                    zIndex: 10,
                  }}
                >
                  {/* Card Drag Bar */}
                  <div
                    className="a2-card-drag-bar"
                    onMouseDown={(e) => handleStartDrag(e, cat.id)}
                    onTouchStart={(e) => handleStartDrag(e, cat.id)}
                    title="Drag to move topic space anywhere"
                  >
                    <GripHorizontal size={14} color="#787774" />
                    
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      {/* Shape Switcher */}
                      <div style={{ position: "relative" }}>
                        <button
                          type="button"
                          className="a2-shape-picker-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenShapeMenuId(openShapeMenuId === cat.id ? null : cat.id);
                          }}
                          title="Change Topic Shape Geometry"
                        >
                          <Shapes size={12} />
                        </button>

                        {openShapeMenuId === cat.id && (
                          <div className="a2-shape-dropdown" onClick={(e) => e.stopPropagation()}>
                            {SHAPES_CONFIG.map((s) => (
                              <button
                                key={s.id}
                                type="button"
                                className={`a2-shape-opt ${cat.shape === s.id ? "is-active" : ""}`}
                                onClick={() => handleChangeShape(cat.id, s.id)}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Delete Custom Topic */}
                      <button
                        type="button"
                        className="a2-card-del-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTopic(cat.id);
                        }}
                        title="Delete topic space"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>

                  <div className="a2-sector-header">
                    <div className="a2-sector-icon-badge" style={{ backgroundColor: cat.glow, color: cat.color }}>
                      <Icon size={18} />
                    </div>
                    <div className="a2-sector-title-box">
                      <h3 className="a2-sector-title" style={{ color: selectedPalette.text }}>
                        {cat.title}
                      </h3>
                      <span className="a2-sector-count" style={{ color: selectedPalette.subText }}>
                        {itemsList.length} focus goals
                      </span>
                    </div>
                  </div>

                  {/* Focus Action Items List */}
                  <div className="a2-sector-items-list">
                    {itemsList.map((item, idx) => (
                      <div
                        key={idx}
                        className="a2-sector-item"
                        style={{
                          backgroundColor: selectedPalette.bg,
                          borderColor: selectedPalette.border,
                        }}
                      >
                        <span className="a2-sector-bullet" style={{ backgroundColor: cat.color }} />
                        <span className="a2-sector-item-text" style={{ color: selectedPalette.text }}>
                          {item}
                        </span>
                        <button
                          type="button"
                          className="a2-sector-item-del"
                          onClick={() => handleDeleteItem(cat.id, idx)}
                          title="Remove item"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add Item Row */}
                  <div className="a2-sector-add-row">
                    <input
                      type="text"
                      placeholder="Add milestone/goal..."
                      value={newItemInputs[cat.id] || ""}
                      onChange={(e) =>
                        setNewItemInputs((prev) => ({ ...prev, [cat.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddItem(cat.id);
                      }}
                      className="a2-sector-add-input"
                    />
                    <button
                      type="button"
                      className="a2-sector-add-btn"
                      style={{ backgroundColor: cat.color }}
                      onClick={() => handleAddItem(cat.id)}
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  {/* Resize Handle on bottom right */}
                  <div 
                    className="a2-resize-handle"
                    onMouseDown={(e) => handleStartResize(e, cat.id)}
                    onTouchStart={(e) => handleStartResize(e, cat.id)}
                    title="Drag to resize space"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
