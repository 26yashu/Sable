import { useState, useEffect, useMemo, useCallback } from "react";
import MemoryCard from "../components/MemoryCard";
import {
  getMemories,
  deleteMemory,
  MEMORY_CATEGORIES,
} from "../lib/memory";

export default function MemoryScreen() {
  const [memories, setMemories] = useState(() => getMemories());
  const [loading,  setLoading]  = useState(true);
  const [query,    setQuery]    = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  // Brief loading phase for skeleton consistency with other screens
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 360);
    return () => clearTimeout(t);
  }, []);

  const handleDelete = useCallback((id) => {
    setMemories(deleteMemory(id));
  }, []);

  // Counts per category, for filter chips
  const categoryCounts = useMemo(() => {
    const counts = {};
    for (const m of memories) counts[m.category] = (counts[m.category] || 0) + 1;
    return counts;
  }, [memories]);

  const filtered = useMemo(() => {
    let list = memories;

    if (activeFilter !== "all") {
      list = list.filter((m) => m.category === activeFilter);
    }

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((m) => m.content.toLowerCase().includes(q));
    }

    return list;
  }, [memories, activeFilter, query]);

  const hasAnyMemories = memories.length > 0;
  const hasResults     = filtered.length > 0;

  return (
    <div className="screen memory-screen">
      <header className="screen__header">
        <div className="screen__header-inner">
          <div className="screen__eyebrow">Memory Garden 🌱</div>
          <h1 className="screen__title">What your companion remembers.</h1>
          <p className="screen__sub">
            Small, gentle things — kept only here, on your device.
          </p>
        </div>
      </header>

      <div className="screen__body">

        {loading ? (
          <div className="skeleton-list" aria-hidden="true">
            <div className="skeleton skeleton-stat" style={{ maxWidth: 680, margin: "0 auto", width: "100%" }}>
              <div className="skeleton__bar skeleton__bar--md" style={{ width: "50%" }} />
            </div>
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton__row" style={{ maxWidth: 680, margin: "0 auto" }}>
                <div className="skeleton__circle" />
                <div className="skeleton__lines">
                  <div className="skeleton__bar skeleton__bar--md" />
                  <div className="skeleton__bar skeleton__bar--xs" />
                </div>
              </div>
            ))}
          </div>
        ) : !hasAnyMemories ? (
          <div className="screen__empty-state" role="status" aria-live="polite">
            <span className="screen__empty-icon" aria-hidden="true">🌱</span>
            <p className="screen__empty-heading">Your memory garden is still growing.</p>
            <p className="screen__empty-sub">
              As you chat, your companion will gently remember things you share —
              preferences, goals, and moments that matter to you.
            </p>
          </div>
        ) : (
          <>
            {/* ── Search ── */}
            <div className="memory-search-wrap">
              <input
                type="text"
                className="memory-search"
                placeholder="Search your memories…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search memories"
              />
              {query && (
                <button
                  className="memory-search__clear"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            {/* ── Category filter chips ── */}
            <div className="memory-filters" role="group" aria-label="Filter by category">
              <button
                className={`memory-filter-chip${activeFilter === "all" ? " memory-filter-chip--active" : ""}`}
                onClick={() => setActiveFilter("all")}
                aria-pressed={activeFilter === "all"}
              >
                All <span className="memory-filter-chip__count">{memories.length}</span>
              </button>
              {MEMORY_CATEGORIES.map((cat) => {
                const count = categoryCounts[cat.id] || 0;
                if (count === 0) return null;
                return (
                  <button
                    key={cat.id}
                    className={`memory-filter-chip${activeFilter === cat.id ? " memory-filter-chip--active" : ""}`}
                    onClick={() => setActiveFilter(cat.id)}
                    aria-pressed={activeFilter === cat.id}
                  >
                    <span aria-hidden="true">{cat.emoji}</span> {cat.label}{" "}
                    <span className="memory-filter-chip__count">{count}</span>
                  </button>
                );
              })}
            </div>

            {/* ── Memory grid ── */}
            {hasResults ? (
              <div className="memory-grid" role="list">
                {filtered.map((memory, i) => (
                  <MemoryCard key={memory.id} memory={memory} onDelete={handleDelete} index={i} />
                ))}
              </div>
            ) : (
              <div className="screen__empty-state" role="status" aria-live="polite">
                <span className="screen__empty-icon" aria-hidden="true">🔍</span>
                <p className="screen__empty-heading">No memories match that search.</p>
                <p className="screen__empty-sub">Try a different word, or clear the filter above.</p>
              </div>
            )}

            <p className="memory-screen__cap-note">
              Up to 10 memories are kept at a time — the oldest gently fades as new ones form.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
