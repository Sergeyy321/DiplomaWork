import React, { useState, useRef, useMemo, useEffect } from "react";
import confetti from "canvas-confetti";
import { 
  Trees, 
  Plus, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Search, 
  ArrowLeft, 
  CheckCircle2, 
  CircleDot, 
  Circle, 
  Clock, 
  Bell, 
  Calendar as CalendarIcon, 
  Leaf, 
  ChevronRight, 
  Sparkles, 
  Trash2, 
  X, 
  Sprout,
  Palette,
  Sliders,
  Layers,
  Wand2,
  Check
} from "lucide-react";
import "./TreeOfKnowledgeView.css";

function stripHtml(html = "") {
  return String(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STATUS_CONFIG = {
  todo: { label: "To Do", icon: Circle, className: "note-leaf-status--todo", next: "in-progress" },
  "in-progress": { label: "In Progress", icon: CircleDot, className: "note-leaf-status--progress", next: "done" },
  done: { label: "Done", icon: CheckCircle2, className: "note-leaf-status--done", next: "todo" },
};

export const SPECIES_BRANCH_CONFIGS = {
  oak: [
    { id: 0, x: -390, y: 70, cx: -210, cy: 50, startY: 30, angle: -65, side: "left", label: "Lower Bough 1" },
    { id: 1, x: -430, y: -70, cx: -230, cy: -30, startY: -20, angle: -45, side: "left", label: "Mid-Low Bough 2" },
    { id: 2, x: -360, y: -210, cx: -190, cy: -130, startY: -70, angle: -30, side: "left", label: "Mid-High Bough 3" },
    { id: 3, x: -210, y: -330, cx: -120, cy: -190, startY: -110, angle: -18, side: "left", label: "High Crown 4" },
    { id: 4, x: -70, y: -400, cx: -40, cy: -250, startY: -130, angle: -8, side: "left", label: "Apex Left 5" },
    { id: 5, x: 70, y: -400, cx: 40, cy: -250, startY: -130, angle: 8, side: "right", label: "Apex Right 6" },
    { id: 6, x: 210, y: -330, cx: 120, cy: -190, startY: -110, angle: 18, side: "right", label: "High Crown 7" },
    { id: 7, x: 360, y: -210, cx: 190, cy: -130, startY: -70, angle: 30, side: "right", label: "Mid-High Bough 8" },
    { id: 8, x: 430, y: -70, cx: 230, cy: -30, startY: -20, angle: 45, side: "right", label: "Mid-Low Bough 9" },
    { id: 9, x: 390, y: 70, cx: 210, cy: 50, startY: 30, angle: 65, side: "right", label: "Lower Bough 10" },
  ],
  sakura: [
    { id: 0, x: -440, y: 30, cx: -240, cy: 30, startY: 20, angle: -75, side: "left", label: "Low Blossom 1" },
    { id: 1, x: -450, y: -110, cx: -250, cy: -60, startY: -30, angle: -55, side: "left", label: "Floral Tier 2" },
    { id: 2, x: -360, y: -230, cx: -200, cy: -150, startY: -80, angle: -35, side: "left", label: "Cloud Branch 3" },
    { id: 3, x: -190, y: -320, cx: -110, cy: -200, startY: -120, angle: -20, side: "left", label: "Sakura High 4" },
    { id: 4, x: -60, y: -380, cx: -30, cy: -260, startY: -140, angle: -8, side: "left", label: "Apex Sakura 5" },
    { id: 5, x: 60, y: -380, cx: 30, cy: -260, startY: -140, angle: 8, side: "right", label: "Apex Sakura 6" },
    { id: 6, x: 190, y: -320, cx: 110, cy: -200, startY: -120, angle: 20, side: "right", label: "Sakura High 7" },
    { id: 7, x: 360, y: -230, cx: 200, cy: -150, startY: -80, angle: 35, side: "right", label: "Cloud Branch 8" },
    { id: 8, x: 450, y: -110, cx: 250, cy: -60, startY: -30, angle: 55, side: "right", label: "Floral Tier 9" },
    { id: 9, x: 440, y: 30, cx: 240, cy: 30, startY: 20, angle: 75, side: "right", label: "Low Blossom 10" },
  ],
  willow: [
    { id: 0, x: -400, y: 150, cx: -320, cy: -40, startY: -70, angle: -80, side: "left", label: "Tendril Drape 1" },
    { id: 1, x: -350, y: 60, cx: -270, cy: -80, startY: -90, angle: -60, side: "left", label: "Cascading Leaf 2" },
    { id: 2, x: -270, y: -30, cx: -210, cy: -130, startY: -110, angle: -40, side: "left", label: "Weeping Arch 3" },
    { id: 3, x: -180, y: -160, cx: -140, cy: -200, startY: -130, angle: -25, side: "left", label: "Willow Bough 4" },
    { id: 4, x: -80, y: -290, cx: -50, cy: -240, startY: -140, angle: -10, side: "left", label: "Crown Arch 5" },
    { id: 5, x: 80, y: -290, cx: 50, cy: -240, startY: -140, angle: 10, side: "right", label: "Crown Arch 6" },
    { id: 6, x: 180, y: -160, cx: 140, cy: -200, startY: -130, angle: 25, side: "right", label: "Willow Bough 7" },
    { id: 7, x: 270, y: -30, cx: 210, cy: -130, startY: -110, angle: 40, side: "right", label: "Weeping Arch 8" },
    { id: 8, x: 350, y: 60, cx: 270, cy: -80, startY: -90, angle: 60, side: "right", label: "Cascading Leaf 9" },
    { id: 9, x: 400, y: 150, cx: 320, cy: -40, startY: -70, angle: 80, side: "right", label: "Tendril Drape 10" },
  ],
  autumn: [
    { id: 0, x: -410, y: 40, cx: -220, cy: 30, startY: 20, angle: -70, side: "left", label: "Amber Bough 1" },
    { id: 1, x: -430, y: -100, cx: -240, cy: -50, startY: -30, angle: -50, side: "left", label: "Golden Tier 2" },
    { id: 2, x: -350, y: -230, cx: -190, cy: -140, startY: -80, angle: -32, side: "left", label: "Crimson Crown 3" },
    { id: 3, x: -220, y: -350, cx: -130, cy: -210, startY: -120, angle: -18, side: "left", label: "Fiery Bough 4" },
    { id: 4, x: -80, y: -410, cx: -45, cy: -260, startY: -140, angle: -8, side: "left", label: "Apex Flame 5" },
    { id: 5, x: 80, y: -410, cx: 45, cy: -260, startY: -140, angle: 8, side: "right", label: "Apex Flame 6" },
    { id: 6, x: 220, y: -350, cx: 130, cy: -210, startY: -120, angle: 18, side: "right", label: "Fiery Bough 7" },
    { id: 7, x: 350, y: -230, cx: 190, cy: -140, startY: -80, angle: 32, side: "right", label: "Crimson Crown 8" },
    { id: 8, x: 430, y: -100, cx: 240, cy: -50, startY: -30, angle: 50, side: "right", label: "Golden Tier 9" },
    { id: 9, x: 410, y: 40, cx: 220, cy: 30, startY: 20, angle: 70, side: "right", label: "Amber Bough 10" },
  ],
  pine: [
    { id: 0, x: -400, y: -20, cx: -220, cy: -10, startY: 10, angle: -65, side: "left", label: "Base Tier 1" },
    { id: 1, x: -330, y: -110, cx: -180, cy: -90, startY: -40, angle: -50, side: "left", label: "Lower Tier 2" },
    { id: 2, x: -250, y: -210, cx: -140, cy: -170, startY: -90, angle: -35, side: "left", label: "Mid Needle 3" },
    { id: 3, x: -160, y: -320, cx: -90, cy: -240, startY: -130, angle: -20, side: "left", label: "Upper Tier 4" },
    { id: 4, x: -55, y: -420, cx: -30, cy: -300, startY: -160, angle: -8, side: "left", label: "Spire Left 5" },
    { id: 5, x: 55, y: -420, cx: 30, cy: -300, startY: -160, angle: 8, side: "right", label: "Spire Right 6" },
    { id: 6, x: 160, y: -320, cx: 90, cy: -240, startY: -130, angle: 20, side: "right", label: "Upper Tier 7" },
    { id: 7, x: 250, y: -210, cx: 140, cy: -170, startY: -90, angle: 35, side: "right", label: "Mid Needle 8" },
    { id: 8, x: 330, y: -110, cx: 180, cy: -90, startY: -40, angle: 50, side: "right", label: "Lower Tier 9" },
    { id: 9, x: 400, y: -20, cx: 220, cy: -10, startY: 10, angle: 65, side: "right", label: "Base Tier 10" },
  ],
  mystic: [
    { id: 0, x: -440, y: -40, cx: -240, cy: -20, startY: 10, angle: -70, side: "left", label: "Astral Tier 1" },
    { id: 1, x: -400, y: -170, cx: -220, cy: -120, startY: -50, angle: -50, side: "left", label: "Starlight Ring 2" },
    { id: 2, x: -290, y: -290, cx: -160, cy: -200, startY: -100, angle: -32, side: "left", label: "Cosmic Bough 3" },
    { id: 3, x: -170, y: -380, cx: -90, cy: -260, startY: -140, angle: -18, side: "left", label: "Nebula Crown 4" },
    { id: 4, x: -55, y: -440, cx: -30, cy: -310, startY: -160, angle: -7, side: "left", label: "Zenith Star 5" },
    { id: 5, x: 55, y: -440, cx: 30, cy: -310, startY: -160, angle: 7, side: "right", label: "Zenith Star 6" },
    { id: 6, x: 170, y: -380, cx: 90, cy: -260, startY: -140, angle: 18, side: "right", label: "Nebula Crown 7" },
    { id: 7, x: 290, y: -290, cx: 160, cy: -200, startY: -100, angle: 32, side: "right", label: "Cosmic Bough 8" },
    { id: 8, x: 400, y: -170, cx: 220, cy: -120, startY: -50, angle: 50, side: "right", label: "Starlight Ring 9" },
    { id: 9, x: 440, y: -40, cx: 240, cy: -20, startY: 10, angle: 70, side: "right", label: "Astral Tier 10" },
  ],
};

const BOTANICAL_PALETTE = [
  "#10b981", // Emerald
  "#059669", // Forest
  "#14b8a6", // Teal
  "#06b6d4", // Cyan
  "#3b82f6", // Royal Blue
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#f59e0b", // Amber
  "#f97316", // Tangerine
  "#f43f5e", // Rose
];


export const TREE_GROWTH_TIERS = [
  { level: 1, name: "Sprout Seedling", minDone: 0, nextMin: 3, icon: "🌱", desc: "First roots of knowledge growing", auraBonus: 0, flowerCount: 0 },
  { level: 2, name: "Flourishing Boughs", minDone: 3, nextMin: 8, icon: "🌿", desc: "Leaves expanding and branches thriving", auraBonus: 1, flowerCount: 4 },
  { level: 3, name: "Blooming Sanctuary", minDone: 8, nextMin: 15, icon: "🌸", desc: "Blossoming floral canopy with fruits", auraBonus: 2, flowerCount: 8 },
  { level: 4, name: "Ancient World Tree", minDone: 15, nextMin: null, icon: "👑", desc: "Legendary majestic canopy of mastery", auraBonus: 3, flowerCount: 14 },
];

export const TREE_SPECIES_OPTIONS = [
  {
    id: "oak",
    name: "Ancient Oak",
    desc: "Spreading majestic boughs & layered foliage clouds",
    icon: "🌳",
  },
  {
    id: "sakura",
    name: "Sakura Blossom",
    desc: "Blooming cherry petals & cascading floral canopy",
    icon: "🌸",
  },
  {
    id: "willow",
    name: "Weeping Willow",
    desc: "Graceful draped leaf tendrils & serene arched canopy",
    icon: "🌾",
  },
  {
    id: "autumn",
    name: "Golden Maple",
    desc: "Fiery golden & amber foliage with crisp bough contours",
    icon: "🍁",
  },
  {
    id: "pine",
    name: "Nordic Pine",
    desc: "Tiered evergreen needles & conical conifer silhouettes",
    icon: "🌲",
  },
  {
    id: "mystic",
    name: "Mystic Cosmos",
    desc: "Bioluminescent glowing starlight aura & crystal boughs",
    icon: "✨",
  },
];

export const CANOPY_COLOR_PALETTES = [
  {
    id: "emerald",
    name: "Lush Forest Emerald",
    colors: ["#34d399", "#10b981", "#059669", "#064e3b"],
    highlight: "#86efac",
    aura: "rgba(16, 185, 129, 0.35)",
    preview: "#10b981",
  },
  {
    id: "sakura",
    name: "Cherry Blossom Pink",
    colors: ["#f472b6", "#ec4899", "#db2777", "#9d174d"],
    highlight: "#fbcfe8",
    aura: "rgba(236, 72, 153, 0.35)",
    preview: "#ec4899",
  },
  {
    id: "autumn",
    name: "Autumn Fire & Gold",
    colors: ["#fbbf24", "#f59e0b", "#ea580c", "#991b1b"],
    highlight: "#fef08a",
    aura: "rgba(245, 158, 11, 0.35)",
    preview: "#f59e0b",
  },
  {
    id: "violet",
    name: "Mystic Violet Nebula",
    colors: ["#a78bfa", "#8b5cf6", "#6d28d9", "#4c1d95"],
    highlight: "#ddd6fe",
    aura: "rgba(139, 92, 246, 0.35)",
    preview: "#8b5cf6",
  },
  {
    id: "teal",
    name: "Alpine Jade & Teal",
    colors: ["#2dd4bf", "#0f766e", "#115e59", "#134e4a"],
    highlight: "#99f6e4",
    aura: "rgba(15, 118, 110, 0.35)",
    preview: "#0f766e",
  },
  {
    id: "cyber",
    name: "Electric Blue Sky",
    colors: ["#38bdf8", "#0284c7", "#2563eb", "#1e1b4b"],
    highlight: "#bae6fd",
    aura: "rgba(2, 132, 199, 0.35)",
    preview: "#0284c7",
  },
];

export const TRUNK_TONE_OPTIONS = [
  {
    id: "oak",
    name: "Deep Ancient Oak",
    colors: ["#5c381e", "#3d2211", "#241308"],
    fissure: "#1f100a",
    highlight: "#854d0e",
    preview: "#5c381e",
  },
  {
    id: "birch",
    name: "Silver Birch",
    colors: ["#f3f4f6", "#9ca3af", "#4b5563"],
    fissure: "#374151",
    highlight: "#ffffff",
    preview: "#d1d5db",
  },
  {
    id: "charcoal",
    name: "Charcoal Ebony",
    colors: ["#374151", "#1f2937", "#111827"],
    fissure: "#0f172a",
    highlight: "#6b7280",
    preview: "#1f2937",
  },
  {
    id: "cherry",
    name: "Red Cedar & Cherry",
    colors: ["#78350f", "#591c0b", "#3b0704"],
    fissure: "#2b0402",
    highlight: "#9a3412",
    preview: "#78350f",
  },
  {
    id: "crystal",
    name: "Luminous Crystal",
    colors: ["#e0e7ff", "#818cf8", "#3730a3"],
    fissure: "#312e81",
    highlight: "#c7d2fe",
    preview: "#818cf8",
  },
];

const DEFAULT_TREE_CONFIG = {
  species: "oak",
  canopyPalette: "emerald",
  trunkTone: "oak",
  glowAura: true,
  sunbeams: true,
  fruitBerries: true,
};

export default function TreeOfKnowledgeView({
  events = [],
  categories = [],
  onOpenNote,
  onCreateNote,
  onUpdateNoteStatus,
  onJumpToCalendar,
  onAddCategory,
  onDeleteCategory,
  onRequestDeleteCategory,
}) {
  const [viewMode, setViewMode] = useState("tree");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [hoveredBranchId, setHoveredBranchId] = useState(null);
  const [zoom, setZoom] = useState(0.5);
  const [pan, setPan] = useState({ x: 0, y: 10 });
  const [isPanning, setIsPanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [treeConfig, setTreeConfig] = useState(() => {
    try {
      const saved = localStorage.getItem("tree_appearance_config");
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          species: parsed.species || "oak",
          canopyPalette: parsed.canopyPalette || "emerald",
          trunkTone: parsed.trunkTone || "oak",
          glowAura: parsed.glowAura !== undefined ? parsed.glowAura : true,
          sunbeams: parsed.sunbeams !== undefined ? parsed.sunbeams : true,
          fruitBerries: parsed.fruitBerries !== undefined ? parsed.fruitBerries : true,
        };
      }
    } catch {}
    return DEFAULT_TREE_CONFIG;
  });
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [customizerTab, setCustomizerTab] = useState("species");

  const [isGrowModalOpen, setIsGrowModalOpen] = useState(false);
  const [growSlotIndex, setGrowSlotIndex] = useState(null);
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [newTopicColor, setNewTopicColor] = useState(BOTANICAL_PALETTE[0]);

  const viewportRef = useRef(null);
  const panStartRef = useRef({ x: 0, y: 0 });
  const touchStartRef = useRef({ x: 0, y: 0, dist: 0, isPinching: false });

  const updateTreeConfig = (updates) => {
    setTreeConfig((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem("tree_appearance_config", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const activeSpecies = TREE_SPECIES_OPTIONS.find((s) => s?.id === treeConfig?.species) || TREE_SPECIES_OPTIONS[0];
  const activeCanopy = CANOPY_COLOR_PALETTES.find((c) => c?.id === treeConfig?.canopyPalette) || CANOPY_COLOR_PALETTES[0];
  const activeTrunk = TRUNK_TONE_OPTIONS.find((t) => t?.id === treeConfig?.trunkTone) || TRUNK_TONE_OPTIONS[0];

  const canopyHighlight = activeCanopy?.highlight || "#86efac";
  const canopyColors = activeCanopy?.colors || ["#34d399", "#10b981", "#059669", "#064e3b"];
  const canopyAura = activeCanopy?.aura || "rgba(16, 185, 129, 0.35)";
  const canopyPreview = activeCanopy?.preview || "#10b981";
  const trunkColors = activeTrunk?.colors || ["#5c381e", "#3d2211", "#241308"];
  const trunkFissure = activeTrunk?.fissure || "#1f100a";
  const trunkHighlight = activeTrunk?.highlight || "#854d0e";

  const activeBranchSlots = SPECIES_BRANCH_CONFIGS[activeSpecies.id] || SPECIES_BRANCH_CONFIGS.oak;

  const branchSlotsData = useMemo(() => {
    return activeBranchSlots.map((slot, index) => {
      const category = categories[index] || null;
      if (category) {
        const catNotes = events.filter((e) => (e.categoryId || e.folderId) === category.id);
        return {
          ...slot,
          slotIndex: index,
          isOccupied: true,
          category,
          notes: catNotes,
        };
      }
      return {
        ...slot,
        slotIndex: index,
        isOccupied: false,
        category: null,
        notes: [],
      };
    });
  }, [activeBranchSlots, categories, events]);

  const fitTreeToScreen = () => {
    const w = viewportRef.current?.clientWidth || (typeof window !== "undefined" ? window.innerWidth : 1000);
    const h = viewportRef.current?.clientHeight || (typeof window !== "undefined" ? window.innerHeight - 140 : 700);
    if (w > 0 && h > 0) {
      const scaleW = (w - 40) / 1120;
      const scaleH = (h - 40) / 960;
      const optimal = Math.min(scaleW, scaleH);
      const boundedZoom = Math.max(Math.min(Number(optimal.toFixed(2)), 1.1), 0.35);
      setZoom(boundedZoom);
      setPan({ x: 0, y: 0 });
    }
  };

  useEffect(() => {
    fitTreeToScreen();
    const timer = setTimeout(fitTreeToScreen, 120);
    window.addEventListener("resize", fitTreeToScreen);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", fitTreeToScreen);
    };
  }, []);

  const handleCanvasMouseDown = (e) => {
    if (
      e.target.closest(".tree-bough-node") ||
      e.target.closest(".tree-empty-slot-node") ||
      e.target.closest(".tree-floating-toolbar") ||
      e.target.closest(".note-leaf-card") ||
      e.target.closest(".tree-grow-modal-overlay") ||
      e.target.closest(".tree-customizer-sidebar") ||
      e.target.closest("button") ||
      e.target.closest("input")
    ) {
      return;
    }
    setIsPanning(true);
    panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e) => {
    if (!isPanning) return;
    setPan({
      x: e.clientX - panStartRef.current.x,
      y: e.clientY - panStartRef.current.y,
    });
  };

  
  const handleTouchStart = (e) => {
    if (
      e.target.closest(".tree-bough-node") ||
      e.target.closest(".tree-empty-slot-node") ||
      e.target.closest(".tree-floating-toolbar") ||
      e.target.closest(".note-leaf-card") ||
      e.target.closest(".tree-customizer-sidebar") ||
      e.target.closest("button")
    ) {
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
        setZoom((prev) => Math.min(Math.max(Number((prev + delta).toFixed(2)), 0.2), 1.6));
        touchStartRef.current.dist = newDist;
      }
    }
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
    if (touchStartRef.current) {
      touchStartRef.current.isPinching = false;
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleZoom = (delta) => {
    setZoom((prev) => Math.min(Math.max(Number((prev + delta).toFixed(2)), 0.2), 1.6));
  };

  const handleReset = () => {
    fitTreeToScreen();
  };

  const handleDiveIntoBranch = (category) => {
    setSelectedCategory(category);
    setViewMode("branch-detail");
    setStatusFilter("all");
    setSearchQuery("");
  };

  const handleReturnToTree = () => {
    setViewMode("tree");
    setSelectedCategory(null);
  };

  const handleOpenGrowModal = (slotIdx) => {
    setGrowSlotIndex(slotIdx);
    setNewTopicTitle("");
    const nextColor = BOTANICAL_PALETTE[categories.length % BOTANICAL_PALETTE.length];
    setNewTopicColor(nextColor);
    setIsGrowModalOpen(true);
  };

  const handleCloseGrowModal = () => {
    setIsGrowModalOpen(false);
    setGrowSlotIndex(null);
  };

  const handleCreateTopic = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const cleanTitle = (newTopicTitle || "").trim();
    if (!cleanTitle) return;

    if (onAddCategory) {
      const newCat = {
        id: "cat_" + Date.now(),
        title: cleanTitle,
        color: newTopicColor,
      };
      onAddCategory(newCat);

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.65 },
          colors: [newTopicColor, "#10b981", "#34d399", "#f59e0b", "#ffffff"],
        });
      } catch {}
    }

    handleCloseGrowModal();
  };

  const handlePruneBranch = (e, category) => {
    e.stopPropagation();
    if (onRequestDeleteCategory) {
      onRequestDeleteCategory(category);
    } else if (onDeleteCategory) {
      onDeleteCategory(category.id);
    }
  };

  const handleCycleNoteStatus = (e, note) => {
    e.stopPropagation();
    const current = note.status || "todo";
    const next = STATUS_CONFIG[current]?.next || "todo";
    if (next === "done") {
      try {
        confetti({
          particleCount: 45,
          spread: 60,
          origin: { y: 0.6 },
          colors: ["#10b981", "#34d399", "#6ee7b7", "#ffffff"],
        });
      } catch {}
    }
    if (onUpdateNoteStatus) {
      onUpdateNoteStatus(note.id, next);
    }
  };

    const allCategoryNotes = useMemo(() => {
    if (!selectedCategory) return [];
    return events.filter((e) => (e.categoryId || e.folderId) === selectedCategory.id);
  }, [events, selectedCategory]);

  const displayedBranchNotes = useMemo(() => {
    let list = allCategoryNotes;
    if (statusFilter !== "all") {
      list = list.filter((n) => (n.status || "todo") === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((n) => 
        (n.title && n.title.toLowerCase().includes(q)) ||
        (n.content && stripHtml(n.content).toLowerCase().includes(q))
      );
    }
    return list;
  }, [allCategoryNotes, statusFilter, searchQuery]);

  const doneNotesCount = useMemo(() => events.filter((e) => (e.status || "todo") === "done").length, [events]);
  const currentGrowthTier = useMemo(() => {
    return TREE_GROWTH_TIERS.slice().reverse().find((t) => doneNotesCount >= t.minDone) || TREE_GROWTH_TIERS[0];
  }, [doneNotesCount]);

  const activeCategoryCount = categories.length;
  const availableSlotsCount = Math.max(10 - activeCategoryCount, 0);

  return (
    <div className="tree-canvas-wrapper">
      <div className="tree-header-bar">
        <div className="tree-title-group">
          {viewMode === "tree" ? (
            <>
              <h3 className="tree-main-title">
                <Trees size={18} color={canopyPreview} />
                <span>Tree of Knowledge</span>
              </h3>
              <span className="tree-growth-header-pill" title={"Tree Growth Tier: " + currentGrowthTier.name + " (" + doneNotesCount + " completed tasks)"}>
                {currentGrowthTier.icon} Lvl {currentGrowthTier.level} ({doneNotesCount} Done)
              </span>
              <span className="tree-slots-pill">
                {activeCategoryCount}/10 Topics Active
              </span>
              <span className="tree-species-badge" title="Current Tree Species">
                {activeSpecies.icon} {activeSpecies.name}
              </span>
            </>
          ) : (
            <button
              type="button"
              className="tree-breadcrumb-btn"
              onClick={handleReturnToTree}
              title="Return to full tree"
            >
              <ArrowLeft size={14} />
              <span>{activeSpecies.name} of Knowledge</span>
            </button>
          )}
        </div>

        <div className="tree-category-pills">
          {categories.map((cat) => {
            const isCatActive = selectedCategory && selectedCategory.id === cat.id;
            const count = events.filter((e) => (e.categoryId || e.folderId) === cat.id).length;
            return (
              <button
                key={cat.id}
                type="button"
                className={"tree-pill " + (isCatActive ? "is-active" : "")}
                onClick={() => handleDiveIntoBranch(cat)}
              >
                <span className="tree-pill-dot" style={{ backgroundColor: cat.color || "#10b981" }} />
                <span>{cat.title} ({count})</span>
              </button>
            );
          })}
          {availableSlotsCount > 0 && viewMode === "tree" && (
            <button
              type="button"
              className="tree-pill tree-pill--add"
              onClick={() => handleOpenGrowModal(activeCategoryCount)}
              title={"Add new topic branch (" + availableSlotsCount + " slots remaining)"}
            >
              <Plus size={12} /> Add Topic ({availableSlotsCount} free)
            </button>
          )}

          {viewMode === "tree" && (
            <button
              type="button"
              className={"tree-customize-trigger-btn " + (isCustomizerOpen ? "is-active" : "")}
              onClick={() => setIsCustomizerOpen((prev) => !prev)}
              title="Customize tree species shape, canopy colors, wood trunk, and visual aura"
            >
              <Palette size={13} />
              <span>{isCustomizerOpen ? "Close Customizer" : "Customize Tree"}</span>
            </button>
          )}
        </div>
      </div>

      <div className="tree-main-layout">
        {/* Left Side Customizer Panel */}
        {isCustomizerOpen && viewMode === "tree" && (
          <aside className="tree-customizer-sidebar">
            <div className="tree-customizer-sidebar-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div className="tree-customizer-icon-badge" style={{ backgroundColor: canopyPreview + "22", color: canopyPreview }}>
                  <Wand2 size={16} />
                </div>
                <div>
                  <h4 className="tree-customizer-title">Customize Tree</h4>
                  <p className="tree-customizer-sub">Live visual tailoring</p>
                </div>
              </div>
              <button
                type="button"
                className="tree-sidebar-close-btn"
                onClick={() => setIsCustomizerOpen(false)}
                title="Close Customizer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="tree-customizer-tabs">
              {[
                { id: "species", label: "Shape & Species", icon: Trees },
                { id: "canopy", label: "Canopy Colors", icon: Palette },
                { id: "trunk", label: "Trunk Wood", icon: Layers },
                { id: "effects", label: "Aura Effects", icon: Sliders },
              ].map((tab) => {
                const TabIcon = tab.icon;
                const isActive = customizerTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={"tree-custom-tab-btn " + (isActive ? "is-active" : "")}
                    onClick={() => setCustomizerTab(tab.id)}
                  >
                    <TabIcon size={13} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="tree-customizer-sidebar-body">
              {customizerTab === "species" && (
                <div className="tree-species-grid">
                  {TREE_SPECIES_OPTIONS.map((spec) => {
                    const isSelected = activeSpecies.id === spec.id;
                    return (
                      <div
                        key={spec.id}
                        className={"tree-species-card " + (isSelected ? "is-selected" : "")}
                        onClick={() => updateTreeConfig({ species: spec.id })}
                      >
                        <div className="tree-species-icon-wrap">{spec.icon}</div>
                        <div className="tree-species-info">
                          <div className="tree-species-header">
                            <span className="tree-species-name">{spec.name}</span>
                            {isSelected && <Check size={14} className="tree-selected-check" />}
                          </div>
                          <p className="tree-species-desc">{spec.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {customizerTab === "canopy" && (
                <div className="tree-canopy-grid">
                  {CANOPY_COLOR_PALETTES.map((pal) => {
                    const isSelected = activeCanopy.id === pal.id;
                    return (
                      <div
                        key={pal.id}
                        className={"tree-palette-card " + (isSelected ? "is-selected" : "")}
                        onClick={() => updateTreeConfig({ canopyPalette: pal.id })}
                      >
                        <div className="tree-palette-swatches">
                          {pal.colors.map((c, i) => (
                            <span key={i} className="tree-swatch-bar" style={{ backgroundColor: c }} />
                          ))}
                        </div>
                        <div className="tree-palette-info">
                          <span className="tree-palette-name">{pal.name}</span>
                          {isSelected && <Check size={14} className="tree-selected-check" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {customizerTab === "trunk" && (
                <div className="tree-trunk-grid">
                  {TRUNK_TONE_OPTIONS.map((trunk) => {
                    const isSelected = activeTrunk.id === trunk.id;
                    return (
                      <div
                        key={trunk.id}
                        className={"tree-trunk-card " + (isSelected ? "is-selected" : "")}
                        onClick={() => updateTreeConfig({ trunkTone: trunk.id })}
                      >
                        <div className="tree-trunk-preview-strip">
                          {trunk.colors.map((c, i) => (
                            <span key={i} className="tree-trunk-wood-bar" style={{ backgroundColor: c }} />
                          ))}
                        </div>
                        <div className="tree-trunk-info">
                          <span className="tree-trunk-name">{trunk.name}</span>
                          {isSelected && <Check size={14} className="tree-selected-check" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {customizerTab === "effects" && (
                <div className="tree-effects-list">
                  <div className="tree-effect-row">
                    <div>
                      <h4 className="tree-effect-title">Crown Ambient Glow</h4>
                      <p className="tree-effect-desc">Glowing radial aura encircling canopy</p>
                    </div>
                    <label className="tree-toggle-switch">
                      <input
                        type="checkbox"
                        checked={treeConfig.glowAura !== false}
                        onChange={(e) => updateTreeConfig({ glowAura: e.target.checked })}
                      />
                      <span className="tree-toggle-slider" />
                    </label>
                  </div>

                  <div className="tree-effect-row">
                    <div>
                      <h4 className="tree-effect-title">Sunlight Beams</h4>
                      <p className="tree-effect-desc">Ethereal sunbeams through foliage</p>
                    </div>
                    <label className="tree-toggle-switch">
                      <input
                        type="checkbox"
                        checked={treeConfig.sunbeams !== false}
                        onChange={(e) => updateTreeConfig({ sunbeams: e.target.checked })}
                      />
                      <span className="tree-toggle-slider" />
                    </label>
                  </div>

                  <div className="tree-effect-row">
                    <div>
                      <h4 className="tree-effect-title">Hanging Fruit & Acorns</h4>
                      <p className="tree-effect-desc">Flourishing acorn pods on boughs</p>
                    </div>
                    <label className="tree-toggle-switch">
                      <input
                        type="checkbox"
                        checked={treeConfig.fruitBerries !== false}
                        onChange={(e) => updateTreeConfig({ fruitBerries: e.target.checked })}
                      />
                      <span className="tree-toggle-slider" />
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="tree-customizer-sidebar-footer">
              <button
                type="button"
                className="tree-grow-btn tree-grow-btn--cancel"
                onClick={() => updateTreeConfig(DEFAULT_TREE_CONFIG)}
              >
                Reset Default
              </button>
              <button
                type="button"
                className="tree-grow-btn tree-grow-btn--confirm"
                onClick={() => setIsCustomizerOpen(false)}
              >
                <Check size={13} />
                <span>Done</span>
              </button>
            </div>
          </aside>
        )}

        {/* Branch Detail View: Centered Notes for Selected Topic */}
        {viewMode === "branch-detail" && selectedCategory ? (
          <div className="tree-branch-detail-container">
            <div className="tree-branch-detail-inner">
              {/* Centered Topic Hero Card */}
              <div className="tree-detail-hero-card">
                <div className="tree-detail-title-row">
                  <div className="tree-detail-badge-group">
                    <span
                      className="tree-detail-dot"
                      style={{
                        backgroundColor: selectedCategory.color || "#10b981",
                        boxShadow: `0 0 14px ${selectedCategory.color || "#10b981"}88`,
                      }}
                    />
                    <div>
                      <h3 className="tree-detail-name">{selectedCategory.title}</h3>
                      <p className="tree-detail-subtitle">Branch Notes & Flourishing Idea Leaves</p>
                    </div>
                    <span className="tree-detail-count">
                      <Leaf size={12} style={{ marginRight: 4 }} />
                      {displayedBranchNotes.length} {displayedBranchNotes.length === 1 ? "Leaf Note" : "Leaf Notes"}
                    </span>
                  </div>

                  <div className="tree-detail-header-actions">
                    <button
                      type="button"
                      className="tree-detail-back-pill"
                      onClick={handleReturnToTree}
                      title="Return to full tree canvas"
                    >
                      <ArrowLeft size={14} />
                      <span>Return to Tree</span>
                    </button>

                    <button
                      type="button"
                      className="deep-leaf-add-btn"
                      onClick={() => {
                        if (onCreateNote) {
                          onCreateNote(new Date(), "todo", selectedCategory.id);
                        }
                      }}
                      title={"Add new note to " + selectedCategory.title}
                    >
                      <Plus size={14} />
                      <span>New Leaf Note</span>
                    </button>
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="tree-detail-filter-bar">
                  <div className="tree-status-filter-pills">
                    {[
                      { id: "all", label: "All Notes", count: allCategoryNotes.length },
                      { id: "todo", label: "To Do", count: allCategoryNotes.filter((n) => (n.status || "todo") === "todo").length },
                      { id: "in-progress", label: "In Progress", count: allCategoryNotes.filter((n) => n.status === "in-progress").length },
                      { id: "done", label: "Done", count: allCategoryNotes.filter((n) => n.status === "done").length },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        className={"tree-filter-pill " + (statusFilter === st.id ? "is-active" : "")}
                        onClick={() => setStatusFilter(st.id)}
                        style={{
                          borderColor: statusFilter === st.id ? (selectedCategory.color || "#10b981") : undefined,
                          background: statusFilter === st.id ? (selectedCategory.color || "#10b981") : undefined,
                          color: statusFilter === st.id ? "#ffffff" : undefined,
                        }}
                      >
                        <span>{st.label}</span>
                        <span className="tree-filter-count-badge">({st.count})</span>
                      </button>
                    ))}
                  </div>

                  <div className="tree-detail-search-wrap">
                    <Search size={14} color="var(--notion-secondary, #9ca3af)" />
                    <input
                      type="text"
                      placeholder={`Search in ${selectedCategory.title}...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        className="tree-search-clear-btn"
                        onClick={() => setSearchQuery("")}
                        title="Clear search"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Centered Leaf Notes Grid */}
              <div className="deep-leaf-grid">
                {displayedBranchNotes.length === 0 ? (
                  <div className="deep-leaf-empty">
                    <div className="deep-leaf-empty-icon">🍃</div>
                    <h4>No leaf notes found in this topic</h4>
                    <p>
                      {searchQuery
                        ? "No notes matched your search query. Try clearing the filter."
                        : `Cultivate fresh ideas by adding your first leaf note to ${selectedCategory.title}.`}
                    </p>
                    <button
                      type="button"
                      className="deep-leaf-empty-btn"
                      onClick={() => {
                        if (onCreateNote) {
                          onCreateNote(new Date(), "todo", selectedCategory.id);
                        }
                      }}
                    >
                      <Plus size={14} /> Add First Leaf Note
                    </button>
                  </div>
                ) : (
                  displayedBranchNotes.map((note) => {
                    const statusObj = STATUS_CONFIG[note.status || "todo"] || STATUS_CONFIG.todo;
                    const StatusIcon = statusObj.icon;
                    const topicColor = selectedCategory.color || "#10b981";

                    return (
                      <div
                        key={note.id}
                        className="note-leaf-card"
                        onClick={() => onOpenNote(note)}
                        style={{
                          borderTop: `3px solid ${note.color || topicColor}`,
                        }}
                      >
                        <div className="note-leaf-top">
                          <button
                            type="button"
                            className={"note-leaf-status " + statusObj.className}
                            onClick={(e) => handleCycleNoteStatus(e, note)}
                            title={"Status: " + statusObj.label + ". Click to cycle."}
                          >
                            <StatusIcon size={12} />
                            <span>{statusObj.label}</span>
                          </button>
                          {note.reminder && (
                            <span className="note-leaf-reminder-badge" title="Has active reminder">
                              <Bell size={12} color="#f59e0b" />
                            </span>
                          )}
                        </div>

                        <h4 className="note-leaf-title">{note.title || "Untitled Note"}</h4>
                        
                        {note.content && (
                          <p className="note-leaf-snippet">
                            {stripHtml(note.content).slice(0, 130)}
                            {stripHtml(note.content).length > 130 ? "..." : ""}
                          </p>
                        )}

                        <div className="note-leaf-footer">
                          {note.date && (
                            <span className="note-leaf-date">
                              <CalendarIcon size={11} /> {note.date}
                            </span>
                          )}
                          {note.time && (
                            <span className="note-leaf-time">
                              <Clock size={11} /> {note.time}
                            </span>
                          )}
                          <span className="note-leaf-open-hint">Open →</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Full Interactive Tree Canvas Viewport */
          <div
            ref={viewportRef}
            className={"tree-viewport " + (isPanning ? "is-panning" : "") + (isCustomizerOpen ? " with-sidebar" : "")}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="tree-world"
              style={{
                transform: "translate(" + pan.x + "px, " + pan.y + "px) scale(" + zoom + ")",
              }}
            >
              <div className="macro-tree-container">
                <svg className="tree-svg-canvas" viewBox="-560 -480 1120 960">
                  <defs>
                    <linearGradient id="tree-bark-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor={trunkColors[0]} />
                      <stop offset="45%" stopColor={trunkColors[1]} />
                      <stop offset="100%" stopColor={trunkColors[2]} />
                    </linearGradient>

                    <radialGradient id="crown-gradient-1" cx="45%" cy="35%" r="65%">
                      <stop offset="0%" stopColor={canopyColors[0]} />
                      <stop offset="35%" stopColor={canopyColors[1]} />
                      <stop offset="75%" stopColor={canopyColors[2]} />
                      <stop offset="100%" stopColor={canopyColors[3]} />
                    </radialGradient>

                    <radialGradient id="crown-gradient-2" cx="50%" cy="40%" r="60%">
                      <stop offset="0%" stopColor={canopyHighlight} />
                      <stop offset="40%" stopColor={canopyColors[1]} />
                      <stop offset="85%" stopColor={canopyColors[2]} />
                      <stop offset="100%" stopColor={canopyColors[3]} />
                    </radialGradient>

                    <radialGradient id="crown-gradient-3" cx="55%" cy="30%" r="70%">
                      <stop offset="0%" stopColor={canopyHighlight} />
                      <stop offset="30%" stopColor={canopyColors[0]} />
                      <stop offset="70%" stopColor={canopyColors[1]} />
                      <stop offset="100%" stopColor={canopyColors[2]} />
                    </radialGradient>

                    <linearGradient id="sun-ray-grad" x1="0%" y1="0%" x2="40%" y2="100%">
                      <stop offset="0%" stopColor="rgba(254, 240, 138, 0.35)" />
                      <stop offset="50%" stopColor="rgba(253, 224, 71, 0.12)" />
                      <stop offset="100%" stopColor="rgba(254, 240, 138, 0)" />
                    </linearGradient>

                    <radialGradient id="tree-crown-aura" cx="50%" cy="38%" r="60%">
                      <stop offset="0%" stopColor={canopyAura} />
                      <stop offset="50%" stopColor={canopyAura.replace("0.35", "0.12")} />
                      <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
                    </radialGradient>

                    <linearGradient id="acorn-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor={canopyHighlight} />
                      <stop offset="100%" stopColor={canopyColors[2]} />
                    </linearGradient>
                  </defs>

                  {/* Ambient Glow */}
                  {treeConfig.glowAura !== false && (
                    <ellipse cx="0" cy="-170" rx="520" ry="330" fill="url(#tree-crown-aura)" />
                  )}

                  {/* Sunbeams */}
                  {treeConfig.sunbeams !== false && (
                    <g className="tree-sunbeams-group">
                      <polygon points="-280,-420 -80,-440 40,80 -180,100" fill="url(#sun-ray-grad)" />
                      <polygon points="120,-440 280,-420 340,60 180,80" fill="url(#sun-ray-grad)" />
                    </g>
                  )}

                  {/* 1. Oak Foliage */}
                  {activeSpecies.id === "oak" && (
                    <g className="tree-lush-canopy-group" filter="drop-shadow(0 12px 24px rgba(0, 0, 0, 0.25))">
                      <ellipse cx="0" cy="-210" rx="420" ry="240" fill={canopyColors[2]} />
                      <ellipse cx="0" cy="-210" rx="420" ry="240" fill="url(#crown-gradient-1)" opacity="0.95" />
                      <ellipse cx="-220" cy="-180" rx="210" ry="180" fill="url(#crown-gradient-1)" opacity="0.95" />
                      <ellipse cx="220" cy="-180" rx="210" ry="180" fill="url(#crown-gradient-1)" opacity="0.95" />
                      <ellipse cx="-130" cy="-280" rx="190" ry="160" fill="url(#crown-gradient-2)" opacity="0.98" />
                      <ellipse cx="130" cy="-280" rx="190" ry="160" fill="url(#crown-gradient-2)" opacity="0.98" />
                      <ellipse cx="0" cy="-330" rx="180" ry="150" fill="url(#crown-gradient-3)" opacity="0.98" />
                      <ellipse cx="-280" cy="-120" rx="160" ry="140" fill="url(#crown-gradient-2)" opacity="0.96" />
                      <ellipse cx="280" cy="-120" rx="160" ry="140" fill="url(#crown-gradient-2)" opacity="0.96" />
                      <ellipse cx="-70" cy="-360" rx="110" ry="90" fill="url(#crown-gradient-3)" opacity="0.95" />
                      <ellipse cx="70" cy="-360" rx="110" ry="90" fill="url(#crown-gradient-3)" opacity="0.95" />
                      <ellipse cx="0" cy="-380" rx="90" ry="75" fill={canopyHighlight} opacity="0.8" />
                      <ellipse cx="-180" cy="-240" rx="100" ry="80" fill={canopyColors[0]} opacity="0.85" />
                      <ellipse cx="180" cy="-240" rx="100" ry="80" fill={canopyColors[0]} opacity="0.85" />
                    </g>
                  )}

                  {/* 2. Sakura */}
                  {activeSpecies.id === "sakura" && (
                    <g className="tree-lush-canopy-group sakura-canopy" filter="drop-shadow(0 12px 28px rgba(236, 72, 153, 0.28))">
                      <ellipse cx="0" cy="-230" rx="440" ry="220" fill={canopyColors[2]} />
                      <ellipse cx="0" cy="-230" rx="440" ry="220" fill="url(#crown-gradient-1)" opacity="0.92" />
                      <ellipse cx="-240" cy="-190" rx="220" ry="160" fill="url(#crown-gradient-2)" opacity="0.95" />
                      <ellipse cx="240" cy="-190" rx="220" ry="160" fill="url(#crown-gradient-2)" opacity="0.95" />
                      <circle cx="-160" cy="-290" r="140" fill="url(#crown-gradient-3)" opacity="0.96" />
                      <circle cx="160" cy="-290" r="140" fill="url(#crown-gradient-3)" opacity="0.96" />
                      <circle cx="0" cy="-340" r="150" fill="url(#crown-gradient-2)" opacity="0.98" />
                      <ellipse cx="-320" cy="-130" rx="140" ry="110" fill={canopyColors[0]} opacity="0.9" />
                      <ellipse cx="320" cy="-130" rx="140" ry="110" fill={canopyColors[0]} opacity="0.9" />
                      <circle cx="-100" cy="-370" r="12" fill={canopyHighlight} opacity="0.9" />
                      <circle cx="90" cy="-360" r="14" fill={canopyHighlight} opacity="0.9" />
                      <circle cx="-210" cy="-110" r="11" fill={canopyColors[0]} opacity="0.85" />
                      <circle cx="230" cy="-100" r="13" fill={canopyColors[0]} opacity="0.85" />
                      <circle cx="0" cy="-390" r="16" fill="#ffffff" opacity="0.9" />
                    </g>
                  )}

                  {/* 3. Willow */}
                  {activeSpecies.id === "willow" && (
                    <g className="tree-lush-canopy-group willow-canopy" filter="drop-shadow(0 14px 26px rgba(0, 0, 0, 0.22))">
                      <ellipse cx="0" cy="-260" rx="390" ry="180" fill={canopyColors[2]} />
                      <ellipse cx="0" cy="-260" rx="390" ry="180" fill="url(#crown-gradient-1)" opacity="0.95" />
                      <ellipse cx="-160" cy="-300" rx="180" ry="130" fill="url(#crown-gradient-2)" opacity="0.96" />
                      <ellipse cx="160" cy="-300" rx="180" ry="130" fill="url(#crown-gradient-2)" opacity="0.96" />
                      <ellipse cx="0" cy="-350" rx="170" ry="110" fill="url(#crown-gradient-3)" opacity="0.98" />
                      <path d="M -340 -160 C -360 -60 -380 50 -360 140" stroke={canopyColors[1]} strokeWidth="12" strokeLinecap="round" fill="none" opacity="0.85" />
                      <path d="M -260 -190 C -280 -80 -290 60 -280 160" stroke={canopyColors[0]} strokeWidth="10" strokeLinecap="round" fill="none" opacity="0.9" />
                      <path d="M -180 -210 C -190 -70 -200 70 -190 170" stroke={canopyColors[2]} strokeWidth="9" strokeLinecap="round" fill="none" opacity="0.85" />
                      <path d="M 180 -210 C 190 -70 200 70 190 170" stroke={canopyColors[2]} strokeWidth="9" strokeLinecap="round" fill="none" opacity="0.85" />
                      <path d="M 260 -190 C 280 -80 290 60 280 160" stroke={canopyColors[0]} strokeWidth="10" strokeLinecap="round" fill="none" opacity="0.9" />
                      <path d="M 340 -160 C 360 -60 380 50 360 140" stroke={canopyColors[1]} strokeWidth="12" strokeLinecap="round" fill="none" opacity="0.85" />
                    </g>
                  )}

                  {/* 4. Autumn */}
                  {activeSpecies.id === "autumn" && (
                    <g className="tree-lush-canopy-group autumn-canopy" filter="drop-shadow(0 12px 26px rgba(234, 88, 12, 0.28))">
                      <ellipse cx="0" cy="-220" rx="410" ry="230" fill={canopyColors[2]} />
                      <ellipse cx="0" cy="-220" rx="410" ry="230" fill="url(#crown-gradient-1)" opacity="0.95" />
                      <ellipse cx="-230" cy="-180" rx="190" ry="170" fill="url(#crown-gradient-2)" opacity="0.96" />
                      <ellipse cx="230" cy="-180" rx="190" ry="170" fill="url(#crown-gradient-2)" opacity="0.96" />
                      <ellipse cx="-130" cy="-290" rx="180" ry="150" fill="url(#crown-gradient-3)" opacity="0.98" />
                      <ellipse cx="130" cy="-290" rx="180" ry="150" fill="url(#crown-gradient-3)" opacity="0.98" />
                      <ellipse cx="0" cy="-350" rx="160" ry="130" fill="url(#crown-gradient-2)" opacity="0.98" />
                      <circle cx="-60" cy="-370" r="16" fill={canopyHighlight} opacity="0.95" />
                      <circle cx="60" cy="-370" r="16" fill={canopyHighlight} opacity="0.95" />
                      <circle cx="0" cy="-390" r="20" fill={canopyHighlight} opacity="0.9" />
                    </g>
                  )}

                  {/* 5. Pine */}
                  {activeSpecies.id === "pine" && (
                    <g className="tree-lush-canopy-group pine-canopy" filter="drop-shadow(0 14px 28px rgba(15, 118, 110, 0.26))">
                      <polygon points="0,-160 -400,0 400,0" fill={canopyColors[1]} />
                      <polygon points="0,-160 -400,0 400,0" fill="url(#crown-gradient-1)" opacity="0.95" />
                      <polygon points="0,-260 -330,-90 330,-90" fill="url(#crown-gradient-2)" opacity="0.96" />
                      <polygon points="0,-360 -240,-190 240,-190" fill="url(#crown-gradient-3)" opacity="0.98" />
                      <polygon points="0,-430 -140,-290 140,-290" fill={canopyHighlight} opacity="0.9" />
                    </g>
                  )}

                  {/* 6. Mystic */}
                  {activeSpecies.id === "mystic" && (
                    <g className="tree-lush-canopy-group mystic-canopy" filter="drop-shadow(0 0 35px rgba(139, 92, 246, 0.55))">
                      <ellipse cx="0" cy="-210" rx="420" ry="240" fill={canopyColors[2]} />
                      <ellipse cx="0" cy="-210" rx="420" ry="240" fill="url(#crown-gradient-1)" opacity="0.92" />
                      <ellipse cx="-180" cy="-260" rx="190" ry="160" fill="url(#crown-gradient-2)" opacity="0.96" />
                      <ellipse cx="180" cy="-260" rx="190" ry="160" fill="url(#crown-gradient-2)" opacity="0.96" />
                      <ellipse cx="0" cy="-330" rx="200" ry="150" fill="url(#crown-gradient-3)" opacity="0.98" />
                      <ellipse cx="0" cy="-240" rx="460" ry="120" stroke={canopyHighlight} strokeWidth="2.5" strokeDasharray="8,12" fill="none" opacity="0.75" />
                      <circle cx="-190" cy="-330" r="4" fill="#ffffff" />
                      <circle cx="190" cy="-330" r="4" fill="#ffffff" />
                      <circle cx="-80" cy="-380" r="5" fill="#ffffff" />
                      <circle cx="80" cy="-380" r="5" fill="#ffffff" />
                      <circle cx="0" cy="-400" r="6" fill="#ffffff" />
                    </g>
                  )}

                  {/* Roots */}
                  <g className="tree-roots-group">
                    <path
                      d="M 0 210 Q -90 280 -270 340 M 0 210 Q -40 300 -130 380 M 0 210 Q 50 300 150 380 M 0 210 Q 110 280 290 340 M 0 210 Q -10 330 0 420"
                      stroke={trunkColors[2]}
                      strokeWidth="16"
                      strokeLinecap="round"
                      fill="none"
                      opacity="0.9"
                    />
                    <path
                      d="M -15 230 Q -110 300 -240 350 M 15 230 Q 110 300 260 350"
                      stroke={trunkColors[1]}
                      strokeWidth="10"
                      strokeLinecap="round"
                      fill="none"
                      opacity="0.85"
                    />
                    <ellipse cx="-160" cy="310" rx="55" ry="16" fill={canopyColors[2]} opacity="0.75" />
                    <ellipse cx="170" cy="310" rx="60" ry="18" fill={canopyColors[2]} opacity="0.75" />
                    <ellipse cx="0" cy="270" rx="95" ry="24" fill={canopyColors[3]} opacity="0.85" />
                  </g>

                  {/* Trunk */}
                  <path
                    className="tree-trunk-path"
                    d="M -75 220 C -60 70 -85 -20 -55 -100 C -38 -150 0 -155 0 -155 C 0 -155 38 -150 55 -100 C 85 -20 60 70 75 220 Z"
                    fill={trunkColors[1]}
                  />
                  <path
                    className="tree-trunk-path"
                    d="M -75 220 C -60 70 -85 -20 -55 -100 C -38 -150 0 -155 0 -155 C 0 -155 38 -150 55 -100 C 85 -20 60 70 75 220 Z"
                    fill="url(#tree-bark-grad)"
                  />

                  {/* Bark Fissures */}
                  <g className="tree-bark-fissures" opacity="0.6">
                    <path d="M -40 190 Q -22 40 -32 -80" stroke={trunkFissure} strokeWidth="3.5" fill="none" />
                    <path d="M 0 200 Q 14 50 6 -110" stroke={trunkFissure} strokeWidth="4" fill="none" />
                    <path d="M 40 190 Q 22 40 30 -80" stroke={trunkFissure} strokeWidth="3.5" fill="none" />
                    <path d="M -22 120 Q -8 0 -16 -60" stroke={trunkHighlight} strokeWidth="2.5" fill="none" />
                    <path d="M 20 130 Q 9 10 16 -50" stroke={trunkHighlight} strokeWidth="2.5" fill="none" />
                  </g>

                  {/* Dynamic Bough Lines */}
                  {branchSlotsData.map((slot) => {
                    const isHovered = hoveredBranchId === (slot.category ? slot.category.id : ("slot_" + slot.id));
                    const isOccupied = slot.isOccupied;
                    const strokeW = isHovered ? 14 : isOccupied ? 10 : 6;

                    return (
                      <g key={slot.id} className="tree-bough-svg-group">
                        <path
                          d={"M 0 " + slot.startY + " Q " + slot.cx + " " + (slot.cy + 7) + " " + slot.x + " " + (slot.y + 5)}
                          stroke="rgba(0, 0, 0, 0.45)"
                          strokeWidth={strokeW + 4}
                          strokeLinecap="round"
                          fill="none"
                        />
                        <path
                          className={"tree-branch-path " + (isOccupied ? "is-occupied" : "is-empty-slot") + (isHovered ? " is-hovered" : "")}
                          d={"M 0 " + slot.startY + " Q " + slot.cx + " " + slot.cy + " " + slot.x + " " + slot.y}
                          strokeWidth={strokeW}
                          strokeDasharray={isOccupied ? "none" : "6,6"}
                          style={{
                            stroke: isHovered ? (slot.category ? slot.category.color : canopyPreview) : undefined,
                          }}
                        />
                        {isOccupied && treeConfig.fruitBerries !== false && (
                          <g transform={"translate(" + slot.cx + ", " + (slot.cy + 14) + ")"}>
                            <path d="M 0 -6 L 0 0" stroke={trunkColors[1]} strokeWidth="2" />
                            <circle cx="0" cy="4" r="5" fill="url(#acorn-grad)" />
                            <ellipse cx="0" cy="1" rx="4.5" ry="2.5" fill={trunkColors[2]} />
                          </g>
                        )}
                        <circle
                          cx={slot.x}
                          cy={slot.y}
                          r={isOccupied ? 7 : 4.5}
                          fill={isOccupied ? ((slot.category && slot.category.color) || canopyPreview) : "#94a3b8"}
                          opacity="0.9"
                        />
                      </g>
                    );
                  })}
                </svg>

                <div className="tree-trunk-plaque">
                  <div className="tree-trunk-title">
                    <Trees size={15} color={canopyPreview} />
                    <span>{activeSpecies.name} of Knowledge</span>
                  </div>
                  <div className="tree-trunk-growth-badge">
                    <span className="tree-growth-icon">{currentGrowthTier.icon}</span>
                    <span className="tree-growth-name">Level {currentGrowthTier.level}: {currentGrowthTier.name}</span>
                    <span className="tree-growth-done">({doneNotesCount} Done)</span>
                  </div>
                  <div className="tree-trunk-sub">
                    {events.length} Notes Flourishing across {activeCategoryCount} of 10 Branches
                  </div>
                </div>

                {/* Interactive Bough Nodes with Hanging Leaf Notes */}
                {branchSlotsData.map((slot) => {
                  const isOccupied = slot.isOccupied;

                  if (isOccupied) {
                    const bough = slot.category;
                    const noteCount = slot.notes.length;
                    const isHovered = hoveredBranchId === bough.id;

                    return (
                      <div
                        key={bough.id}
                        className="tree-bough-node"
                        style={{
                          left: "calc(50% + " + slot.x + "px)",
                          top: "calc(50% + " + slot.y + "px)",
                        }}
                        onMouseEnter={() => setHoveredBranchId(bough.id)}
                        onMouseLeave={() => setHoveredBranchId(null)}
                      >
                        {/* Topic Header Cloud */}
                        <div 
                          className="tree-foliage-cloud"
                          style={{
                            boxShadow: isHovered 
                              ? ("0 14px 35px " + (bough.color || canopyPreview) + "66, inset 0 2px 14px rgba(255,255,255,0.5)") 
                              : undefined,
                            borderColor: (bough.color || canopyPreview) + "55",
                          }}
                          onClick={() => handleDiveIntoBranch(bough)}
                        >
                          <div className="tree-bough-header-line">
                            <div className="tree-bough-leaves-badge">
                              <Leaf size={11} /> {noteCount} leaf{noteCount === 1 ? "" : "s"}
                            </div>
                            {categories.length > 1 && (
                              <button
                                type="button"
                                className="tree-prune-btn"
                                onClick={(e) => handlePruneBranch(e, bough)}
                                title="Delete topic branch"
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>

                          <div className="tree-bough-name-row">
                            <span className="tree-bough-dot" style={{ backgroundColor: bough.color || canopyPreview }} />
                            <span className="tree-bough-name">{bough.title}</span>
                          </div>

                          <div className="tree-bough-dive-hint">
                            <span>Explore Branch</span>
                            <ChevronRight size={12} />
                          </div>
                        </div>

                        {/* Hanging Note Leaves on Branch */}
                        {slot.notes && slot.notes.length > 0 && (
                          <div className="tree-bough-leaf-notes-list">
                            {slot.notes.slice(0, 3).map((note) => (
                              <div
                                key={note.id}
                                className="tree-branch-leaf-chip"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenNote(note);
                                }}
                                title={"Click to open note: " + (note.title || "Untitled")}
                              >
                                <Leaf size={11} color={note.color || bough.color || "#10b981"} />
                                <span className="tree-leaf-chip-title">{note.title || "Untitled"}</span>
                                {note.reminder && <Bell size={10} color="#f59e0b" style={{ flexShrink: 0 }} />}
                              </div>
                            ))}
                            {slot.notes.length > 3 && (
                              <div 
                                className="tree-branch-leaf-more"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDiveIntoBranch(bough);
                                }}
                              >
                                +{slot.notes.length - 3} more
                              </div>
                            )}
                          </div>
                        )}

                        {/* Quick Add Note Leaf Button */}
                        <button
                          type="button"
                          className="tree-branch-quick-add-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onCreateNote) {
                              onCreateNote(new Date(), "todo", bough.id);
                            }
                          }}
                          title={"Add new note to " + bough.title}
                        >
                          <Plus size={10} />
                          <span>Add Leaf</span>
                        </button>

                        <div className="tree-mini-leaf" style={{ top: "-12px", left: "12px", backgroundColor: bough.color || canopyPreview }} />
                        <div className="tree-mini-leaf" style={{ bottom: "-12px", right: "18px", animationDelay: "1.4s", backgroundColor: bough.color || canopyPreview }} />
                      </div>
                    );
                  }

                  return (
                    <div
                      key={"slot_" + slot.id}
                      className="tree-empty-slot-node"
                      style={{
                        left: "calc(50% + " + slot.x + "px)",
                        top: "calc(50% + " + slot.y + "px)",
                      }}
                      onMouseEnter={() => setHoveredBranchId("slot_" + slot.id)}
                      onMouseLeave={() => setHoveredBranchId(null)}
                      onClick={() => handleOpenGrowModal(slot.slotIndex)}
                      title={"Click to grow a new topic on Branch Slot #" + (slot.slotIndex + 1)}
                    >
                      <div className="tree-sprout-bud">
                        <div className="tree-sprout-pulse" />
                        <div className="tree-sprout-icon-wrap">
                          <Plus size={16} color="#10b981" strokeWidth={2.5} />
                        </div>
                        <span className="tree-sprout-label">Branch #{slot.slotIndex + 1}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="tree-floating-toolbar">
              <button
                type="button"
                className="tree-tool-btn"
                onClick={() => handleZoom(0.15)}
                title="Zoom in (+)"
                aria-label="Zoom in"
              >
                <ZoomIn size={15} />
              </button>
              <button
                type="button"
                className="tree-tool-btn"
                onClick={() => handleZoom(-0.15)}
                title="Zoom out (-)"
                aria-label="Zoom out"
              >
                <ZoomOut size={15} />
              </button>
              <button
                type="button"
                className="tree-tool-btn tree-tool-btn--wide"
                onClick={handleReset}
                title="Auto-Fit Tree to screen"
                aria-label="Fit to screen"
              >
                <RotateCcw size={13} style={{ marginRight: "3px" }} />
                <span>{Math.round(zoom * 100)}%</span>
              </button>
              <button
                type="button"
                className={"tree-tool-btn tree-tool-btn--customize " + (isCustomizerOpen ? "is-active" : "")}
                onClick={() => setIsCustomizerOpen((prev) => !prev)}
                title="Customize Tree Appearance"
                aria-label="Customize Tree"
              >
                <Palette size={14} color={canopyPreview} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Grow Topic Modal */}
      {isGrowModalOpen && (
        <div className="tree-grow-modal-overlay" onClick={handleCloseGrowModal}>
          <div className="tree-grow-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="tree-grow-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div className="tree-grow-icon-badge">
                  <Sprout size={18} color="#10b981" />
                </div>
                <div>
                  <h3 className="tree-grow-title">Grow New Topic Branch</h3>
                  <p className="tree-grow-sub">
                    Branch Slot #{(growSlotIndex !== null ? growSlotIndex + 1 : activeCategoryCount + 1)} of 10
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="tree-modal-close-btn"
                onClick={handleCloseGrowModal}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateTopic} className="tree-grow-form">
              <div className="tree-grow-field">
                <label className="tree-grow-label">Topic / Category Name</label>
                <input
                  type="text"
                  className="tree-grow-input"
                  placeholder="e.g., Computer Science, Literature, Health..."
                  value={newTopicTitle}
                  onChange={(e) => setNewTopicTitle(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="tree-grow-field">
                <label className="tree-grow-label">Botanical Color</label>
                <div className="tree-grow-palette">
                  {BOTANICAL_PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={"tree-grow-swatch " + (newTopicColor === c ? "is-selected" : "")}
                      style={{ backgroundColor: c }}
                      onClick={() => setNewTopicColor(c)}
                    />
                  ))}
                </div>
              </div>

              <div className="tree-grow-actions">
                <button
                  type="button"
                  className="tree-grow-btn tree-grow-btn--cancel"
                  onClick={handleCloseGrowModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="tree-grow-btn tree-grow-btn--confirm"
                  disabled={!newTopicTitle.trim()}
                >
                  <Sparkles size={13} />
                  <span>Sprout Topic</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
