const THEMES = [
  {
    id: "dark",
    label: "Midnight",
    icon: "🌑",
    description: "Deep black, maximum contrast",
    swatch: ["#0f1211", "#141918", "#5ec4a0"],
  },
  {
    id: "forest",
    label: "Forest",
    icon: "🌲",
    description: "Warm deep green tones",
    swatch: ["#0d1a14", "#16261e", "#6dd4ae"],
  },
];

export default function ThemeSelector({ selected, onSelect }) {
  return (
    <div className="theme-grid" role="group" aria-label="Choose a theme">
      {THEMES.map((t) => (
        <button
          key={t.id}
          className={`theme-tile${selected === t.id ? " theme-tile--active" : ""}`}
          onClick={() => onSelect(t.id)}
          aria-pressed={selected === t.id}
          title={t.label}
        >
          {/* Colour swatches */}
          <div className="theme-tile__swatches" aria-hidden="true">
            {t.swatch.map((c, i) => (
              <span
                key={i}
                className="theme-tile__swatch"
                style={{ background: c }}
              />
            ))}
          </div>
          <div className="theme-tile__meta">
            <span className="theme-tile__icon" aria-hidden="true">{t.icon}</span>
            <span className="theme-tile__label">{t.label}</span>
            <span className="theme-tile__desc">{t.description}</span>
          </div>
          {selected === t.id && (
            <span className="theme-tile__check" aria-hidden="true">✓</span>
          )}
        </button>
      ))}
    </div>
  );
}

export { THEMES };
