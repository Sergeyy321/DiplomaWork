import React from "react";

export default function CalendarFilters({ filterQuery, setFilterQuery, activeColorFilter, setActiveColorFilter, events }) {
  const uniqueColors = Array.from(new Set(events.map((e) => e.color)));

  return (
    <div style={filterContainer}>
      <div style={searchWrapper}>
        <span style={searchIcon}>🔍</span>
        <input
          type="text"
          placeholder="Search thought nodes content..."
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          style={searchInput}
        />
        {filterQuery && (
          <button onClick={() => setFilterQuery("")} style={clearBtn}>✕</button>
        )}
      </div>

      <div style={colorFilterWrapper}>
        <span style={filterLabel}>Color Tag:</span>
        <button
          onClick={() => setActiveColorFilter(null)}
          style={{
            ...colorBadge,
            background: "#f3f4f6",
            color: "#374151",
            border: !activeColorFilter ? "2px solid #4f46e5" : "2px solid transparent",
          }}
        >
          All
        </button>
        {uniqueColors.map((color) => (
          <button
            key={color}
            onClick={() => setActiveColorFilter(activeColorFilter === color ? null : color)}
            style={{
              ...colorBadge,
              background: color,
              border: activeColorFilter === color ? "2px solid #111827" : "2px solid transparent",
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              padding: 0,
            }}
            title="Filter by this marker"
          />
        ))}
      </div>
    </div>
  );
}

const filterContainer = { display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap", background: "#ffffff", padding: "16px 20px", borderRadius: "16px", border: "1px solid #e5e7eb" };
const searchWrapper = { display: "flex", alignItems: "center", gap: "8px", background: "#f9fafb", border: "1px solid #d1d5db", borderRadius: "10px", padding: "8px 14px", flex: 1, minWidth: "260px", position: "relative" };
const searchIcon = { color: "#9ca3af", fontSize: "14px" };
const searchInput = { border: "none", background: "transparent", outline: "none", width: "100%", fontSize: "14px", color: "#111827" };
const clearBtn = { background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "12px" };
const colorFilterWrapper = { display: "flex", alignItems: "center", gap: "8px" };
const filterLabel = { fontSize: "13px", fontWeight: "600", color: "#6b7280" };
const colorBadge = { cursor: "pointer", fontSize: "12px", fontWeight: "600", padding: "4px 10px", borderRadius: "8px", border: "none", transition: "all 0.15s" };