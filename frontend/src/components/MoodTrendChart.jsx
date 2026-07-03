import { MOODS } from "./MoodSelector";

// Mood valence weights used for the trend line overlay (-1 → +1)
const VALENCE = {
  happy:      1.0,
  calm:       0.6,
  tired:     -0.2,
  sad:       -0.7,
  anxious:   -0.8,
  frustrated:-1.0,
};

// Palette per mood — subtle accent colours that stay within the forest-night system
const MOOD_COLORS = {
  happy:      "#5ec4a0",
  calm:       "#7ab8a8",
  tired:      "#6b8a85",
  sad:        "#5a7a8c",
  anxious:    "#8c7a5a",
  frustrated: "#c47070",
};

function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10)); // "YYYY-MM-DD"
  }
  return days;
}

function shortDay(iso) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short" });
}

export default function MoodTrendChart({ moods }) {
  const days = getLast7Days();

  // Build per-day frequency buckets
  const buckets = days.map((day) => {
    const entries = moods.filter((m) => m.ts.slice(0, 10) === day);
    // Count per mood id
    const counts = {};
    for (const e of entries) counts[e.mood] = (counts[e.mood] || 0) + 1;
    const total   = entries.length;
    // Dominant mood for colour
    let dominant  = null;
    let maxCount  = 0;
    for (const [id, n] of Object.entries(counts)) {
      if (n > maxCount) { maxCount = n; dominant = id; }
    }
    // Average valence for trend line
    const valence = total === 0
      ? null
      : entries.reduce((sum, e) => sum + (VALENCE[e.mood] ?? 0), 0) / total;

    return { day, total, dominant, valence };
  });

  const maxTotal = Math.max(...buckets.map((b) => b.total), 1);

  // SVG dimensions
  const W         = 560;
  const H         = 140;
  const PADX      = 24;
  const PADY_TOP  = 12;
  const PADY_BOT  = 28; // room for day labels
  const chartH    = H - PADY_TOP - PADY_BOT;
  const barW      = 28;
  const step      = (W - PADX * 2) / (buckets.length - 1 || 1);

  // X centre for each column
  const cx = (i) => PADX + i * step;

  // Bar top Y — bars grow from chartH down
  const barY = (total) =>
    PADY_TOP + chartH - Math.max((total / maxTotal) * chartH, total > 0 ? 4 : 0);

  // Trend line points (valence mapped 0→1 in chartH, null days skipped)
  const trendPoints = buckets
    .map((b, i) =>
      b.valence !== null
        ? { x: cx(i), y: PADY_TOP + chartH / 2 - (b.valence * chartH) / 2.6 }
        : null
    )
    .filter(Boolean);

  const trendPath = trendPoints.length > 1
    ? trendPoints
        .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
        .join(" ")
    : null;

  const isEmpty = buckets.every((b) => b.total === 0);

  return (
    <div className="trend-chart" aria-label="Mood trend for the last 7 days">
      {isEmpty ? (
        <p className="trend-chart__empty">Log some moods to see your trend here.</p>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          className="trend-chart__svg"
          role="img"
          aria-label="Bar chart of mood check-ins over 7 days"
        >
          {/* Horizontal guide lines */}
          {[0.25, 0.5, 0.75, 1].map((frac) => {
            const y = PADY_TOP + chartH * (1 - frac);
            return (
              <line
                key={frac}
                x1={PADX} y1={y} x2={W - PADX} y2={y}
                stroke="#263230"
                strokeWidth="1"
                strokeDasharray="3 4"
              />
            );
          })}

          {/* Bars */}
          {buckets.map((b, i) => {
            if (b.total === 0) return null;
            const x   = cx(i) - barW / 2;
            const y   = barY(b.total);
            const h   = PADY_TOP + chartH - y;
            const col = MOOD_COLORS[b.dominant] ?? "#5ec4a0";
            const meta = MOODS.find((m) => m.id === b.dominant);
            return (
              <g key={b.day}>
                {/* Bar */}
                <rect
                  x={x} y={y} width={barW} height={h}
                  rx="6" ry="6"
                  fill={col}
                  fillOpacity="0.55"
                />
                {/* Top accent stripe */}
                <rect
                  x={x} y={y} width={barW} height={4}
                  rx="3" ry="3"
                  fill={col}
                  fillOpacity="0.9"
                />
                {/* Count label */}
                <text
                  x={cx(i)} y={y - 5}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#7a9490"
                  fontFamily="inherit"
                >
                  {b.total}
                </text>
                {/* Emoji above count */}
                {meta && (
                  <text
                    x={cx(i)} y={y - 18}
                    textAnchor="middle"
                    fontSize="13"
                  >
                    {meta.emoji}
                  </text>
                )}
              </g>
            );
          })}

          {/* Trend line */}
          {trendPath && (
            <path
              d={trendPath}
              fill="none"
              stroke="#5ec4a0"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity="0.45"
              strokeDasharray="4 3"
            />
          )}

          {/* Day labels */}
          {buckets.map((b, i) => (
            <text
              key={`label-${b.day}`}
              x={cx(i)} y={H - 6}
              textAnchor="middle"
              fontSize="10"
              fill="#4a5e59"
              fontFamily="inherit"
            >
              {shortDay(b.day)}
            </text>
          ))}
        </svg>
      )}
    </div>
  );
}
