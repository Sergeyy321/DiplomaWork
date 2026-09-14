import React from "react";
import { Search } from "lucide-react";

export default function CalendarFilters({ filterQuery, setFilterQuery, activeColorFilter, setActiveColorFilter, events }) {
  const uniqueColors = Array.from(new Set(events.map((e) => e.color).filter(Boolean)));

  return (
    <div style={filterContainer} className="notion-filter-container">
      <div style={searchWrapper} className="notion-filter-search-wrapper">
        <Search size={14} color="var(--notion-secondary, #787774)" />
        <input
          type="text"
          placeholder="Filter notes..."
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          style={searchInput}
          className="notion-filter-search-input"
        />
        {filterQuery && (
          <button onClick={() => setFilterQuery("")} style={clearBtn} title="Clear filter">✕</button>
        )}
      </div>

      <div style={colorFilterWrapper}>
        <span style={filterLabel}>Color:</span>
        <button
          type="button"
          onClick={() => setActiveColorFilter(null)}
          style={{
            ...colorBadge,
            background: !activeColorFilter ? "var(--notion-hover, rgba(55, 53, 47, 0.08))" : "var(--notion-sidebar, #f7f7f5)",
            color: "var(--notion-text, #37352f)",
            fontWeight: !activeColorFilter ? "600" : "400",
            border: "1px solid var(--notion-border, #edece9)",
          }}
        >
          All
        </button>
        {uniqueColors.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => setActiveColorFilter(activeColorFilter === color ? null : color)}
            style={{
              ...swatchBtn,
              background: color,
              boxShadow: activeColorFilter === color ? "0 0 0 2px var(--notion-card, #ffffff), 0 0 0 4px " + color : "none",
            }}
            title="Filter by color"
          />
        ))}
      </div>
    </div>
  );
}

const filterContainer = {
  display: "flex",
  gap: "16px",
  alignItems: "center",
  flexWrap: "wrap",
  background: "var(--notion-card, #ffffff)",
  padding: "10px 14px",
  borderRadius: "8px",
  border: "1px solid var(--notion-border, #edece9)",
};

const searchWrapper = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  background: "var(--notion-sidebar, #f7f7f5)",
  border: "1px solid var(--notion-border, #edece9)",
  borderRadius: "6px",
  padding: "6px 10px",
  flex: 1,
  minWidth: "220px",
  position: "relative",
};

const searchInput = {
  border: "none",
  background: "transparent",
  outline: "none",
  width: "100%",
  fontSize: "13px",
  color: "var(--notion-text, #37352f)",
};

const clearBtn = {
  background: "none",
  border: "none",
  color: "var(--notion-placeholder, #9b9a97)",
  cursor: "pointer",
  fontSize: "11px",
  padding: "0 2px",
};

const colorFilterWrapper = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
};

const filterLabel = {
  fontSize: "12px",
  fontWeight: "500",
  color: "var(--notion-secondary, #787774)",
  marginRight: "2px",
};

const colorBadge = {
  cursor: "pointer",
  fontSize: "11px",
  padding: "3px 8px",
  borderRadius: "4px",
  border: "none",
  transition: "background 0.12s",
};

const swatchBtn = {
  cursor: "pointer",
  width: "16px",
  height: "16px",
  borderRadius: "50%",
  border: "1px solid rgba(0,0,0,0.1)",
  padding: 0,
  transition: "transform 0.12s ease, box-shadow 0.12s ease",
};