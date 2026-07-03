import { MOODS } from "./MoodSelector";

function getMoodMeta(id) {
  return MOODS.find((m) => m.id === id) ?? { emoji: "•", label: id, color: "#5ec4a0" };
}

function formatShortDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * MoodTimeline — a simple horizontal scroll of recent mood check-ins,
 * most recent last. Pure React + CSS, no external chart library.
 */
export default function MoodTimeline({ moods }) {
  // moods are stored newest-first; reverse for chronological left-to-right reading
  const chronological = [...moods].slice(0, 14).reverse();

  if (chronological.length === 0) {
    return (
      <div className="mood-timeline">
        <p className="mood-timeline__empty">Your mood timeline will appear here once you log a few check-ins.</p>
      </div>
    );
  }

  return (
    <div className="mood-timeline" role="list" aria-label="Recent mood timeline">
      <div className="mood-timeline__track">
        {chronological.map((entry) => {
          const meta = getMoodMeta(entry.mood);
          return (
            <div key={entry.id} className="mood-timeline__point" role="listitem" title={`${meta.label} — ${formatShortDate(entry.ts)}`}>
              <span className="mood-timeline__emoji" aria-hidden="true">{meta.emoji}</span>
              <span className="mood-timeline__dot" aria-hidden="true" />
              <span className="mood-timeline__date">{formatShortDate(entry.ts)}</span>
            </div>
          );
        })}
      </div>
      <div className="mood-timeline__line" aria-hidden="true" />
    </div>
  );
}
