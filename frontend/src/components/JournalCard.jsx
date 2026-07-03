function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month:   "long",
    day:     "numeric",
  });
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], {
    hour:   "2-digit",
    minute: "2-digit",
  });
}

export default function JournalCard({ entry }) {
  return (
    <article className="jcard">
      <header className="jcard__header">
        <time className="jcard__date" dateTime={entry.ts}>
          {formatDate(entry.ts)}
        </time>
        <span className="jcard__time">{formatTime(entry.ts)}</span>
      </header>
      <p className="jcard__body">{entry.text}</p>
    </article>
  );
}
