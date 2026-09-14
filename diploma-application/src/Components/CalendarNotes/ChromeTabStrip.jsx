import React, { useState, useRef } from "react";
import { 
  Calendar, 
  Network, 
  Kanban, 
  Cpu, 
  Layers, 
  X, 
  Sparkles,
  Trees
} from "lucide-react";
import "./ChromeTabStrip.css";

export const TAB_DEFINITIONS = [
  { id: "tree-view", label: "Tree of Notes", icon: Trees, color: "#10b981", desc: "Tree of Knowledge & Deep Leaf Zoom" },
  { id: "calendar", label: "Calendar", icon: Calendar, color: "#2563eb", desc: "Planner & Timeline" },
  { id: "mindmap", label: "Mind Map", icon: Network, color: "#7c3aed", desc: "Radial Graph" },
  { id: "board", label: "Board View", icon: Kanban, color: "#d97706", desc: "Kanban Columns" },
  { id: "ai-analyzer", label: "AI Insights", icon: Cpu, color: "#059669", desc: "Deep Analysis" },
  { id: "a2-map", label: "A2 Mind Map", icon: Layers, color: "#ec4899", desc: "A2 Life Balance Canvas" },
];

export default function ChromeTabStrip({
  activeTabs = ["tree-view", "calendar", "mindmap", "board", "a2-map"],
  currentTab = "tree-view",
  onSelectTab,
  onCloseTab,
  onReorderTabs,
}) {
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [hoverIndex, setHoverIndex] = useState(null);

  const hoverIndexRef = useRef(null);
  const dragStartRef = useRef({ x: 0, index: null, tabId: null, tabWidth: 0, hasMoved: false });
  const containerRef = useRef(null);

  const handlePointerDown = (e, index, tabId) => {
    if (e.target.closest(".chrome-tab-close")) return;
    if (e.button !== 0) return;

    const tabElem = e.currentTarget;
    const rect = tabElem.getBoundingClientRect();
    const tabWidth = rect.width + 3;

    hoverIndexRef.current = index;
    dragStartRef.current = {
      x: e.clientX,
      index,
      tabId,
      tabWidth: tabWidth || 150,
      hasMoved: false,
    };

    const handlePointerMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - dragStartRef.current.x;
      if (!dragStartRef.current.hasMoved && Math.abs(deltaX) > 4) {
        dragStartRef.current.hasMoved = true;
        setDraggingIndex(index);
      }

      if (dragStartRef.current.hasMoved) {
        setDragOffset(deltaX);

        const slotWidth = dragStartRef.current.tabWidth || 150;
        const slotsMoved = Math.round(deltaX / slotWidth);
        const targetSlot = Math.max(0, Math.min(index + slotsMoved, activeTabs.length - 1));

        if (hoverIndexRef.current !== targetSlot) {
          hoverIndexRef.current = targetSlot;
          setHoverIndex(targetSlot);
        }
      }
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);

      const wasDragging = dragStartRef.current.hasMoved;
      const target = hoverIndexRef.current;

      if (wasDragging && target !== null && target !== index) {
        const reordered = [...activeTabs];
        const [moved] = reordered.splice(index, 1);
        reordered.splice(target, 0, moved);
        if (onReorderTabs) {
          onReorderTabs(reordered);
        }
      } else if (!wasDragging) {
        onSelectTab(tabId);
      }

      hoverIndexRef.current = null;
      setDraggingIndex(null);
      setDragOffset(0);
      setHoverIndex(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <div className="chrome-tabstrip-container" ref={containerRef}>
      <div className="chrome-tabstrip" role="tablist">
        {activeTabs.map((tabId, index) => {
          const tabMeta = TAB_DEFINITIONS.find((t) => t.id === tabId) || {
            id: tabId,
            label: tabId,
            icon: Sparkles,
            color: "#37352f",
          };
          const Icon = tabMeta.icon;
          const isActive = currentTab === tabId;
          const isDraggingThis = draggingIndex === index;

          let shiftX = 0;
          if (draggingIndex !== null && hoverIndex !== null) {
            if (isDraggingThis) {
              shiftX = dragOffset;
            } else if (draggingIndex < hoverIndex && index > draggingIndex && index <= hoverIndex) {
              shiftX = -(dragStartRef.current.tabWidth || 150);
            } else if (draggingIndex > hoverIndex && index < draggingIndex && index >= hoverIndex) {
              shiftX = (dragStartRef.current.tabWidth || 150);
            }
          }

          return (
            <div
              key={tabId}
              role="tab"
              aria-selected={isActive}
              onPointerDown={(e) => handlePointerDown(e, index, tabId)}
              className={`chrome-tab ${isActive ? "is-active" : ""} ${isDraggingThis ? "is-dragging" : ""}`}
              style={{
                transform: `translateX(${shiftX}px)`,
                zIndex: isDraggingThis ? 100 : (isActive ? 2 : 1),
                transition: isDraggingThis ? "none" : "transform 0.24s cubic-bezier(0.2, 0, 0, 1), background 0.12s ease",
              }}
              title={`${tabMeta.label} Tab (Drag left or right to reorder)`}
            >
              <div className="chrome-tab-bg" />
              
              <div className="chrome-tab-content">
                <span className="chrome-tab-icon" style={{ color: tabMeta.color }}>
                  <Icon size={14} />
                </span>
                <span className="chrome-tab-title">{tabMeta.label}</span>
                
                {activeTabs.length > 1 && (
                  <button
                    type="button"
                    className="chrome-tab-close"
                    title={`Close ${tabMeta.label} tab`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab(tabId);
                    }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
