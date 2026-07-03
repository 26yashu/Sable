import { getCategoryMeta } from "../lib/memory";

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day:   "numeric",
    year:  "numeric",
  });
}

export default function MemoryCard({ memory, onDelete, index = 0 }) {
  const meta = getCategoryMeta(memory.category);
  const style = { animationDelay: `${Math.min(index, 10) * 50}ms` };

  return (
    <article className="memory-card" style={style} role="article">
      <div className="memory-card__top">
        <span
          className="memory-card__badge"
          style={{ color: meta.color, borderColor: `${meta.color}33`, background: `${meta.color}14` }}
        >
          <span aria-hidden="true">{meta.emoji}</span> {meta.label}
        </span>
        {onDelete && (
          <button
            className="memory-card__delete"
            onClick={() => onDelete(memory.id)}
            aria-label="Forget this memory"
            title="Forget this memory"
          >
            ×
          </button>
        )}
      </div>
      <p className="memory-card__content">{memory.content}</p>
      <time className="memory-card__date" dateTime={memory.timestamp}>
        {formatDate(memory.timestamp)}
      </time>
    </article>
  );
}
