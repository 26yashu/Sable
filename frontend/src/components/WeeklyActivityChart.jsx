function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function shortDay(iso) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short" });
}

/**
 * WeeklyActivityChart — stacked bar chart showing daily activity
 * (journal entries + mood check-ins + chat messages) over the last 7 days.
 * Pure React + inline SVG, no external chart library.
 */
export default function WeeklyActivityChart({ journals = [], moods = [], messages = [] }) {
  const days = getLast7Days();

  const buckets = days.map((day) => {
    const journalCount = journals.filter((j) => j.ts?.slice(0, 10) === day).length;
    const moodCount    = moods.filter((m) => m.ts?.slice(0, 10) === day).length;
    const chatCount    = messages.filter((m) => m.role === "user" && m.ts?.slice(0, 10) === day).length;
    return { day, journalCount, moodCount, chatCount, total: journalCount + moodCount + chatCount };
  });

  const maxTotal = Math.max(...buckets.map((b) => b.total), 1);
  const isEmpty  = buckets.every((b) => b.total === 0);

  // SVG layout
  const W        = 560;
  const H        = 160;
  const PADX     = 24;
  const PADY_TOP = 14;
  const PADY_BOT = 28;
  const chartH   = H - PADY_TOP - PADY_BOT;
  const barW     = 26;
  const step     = (W - PADX * 2) / (buckets.length - 1 || 1);
  const cx       = (i) => PADX + i * step;

  // Segment colours — same palette family as MoodTrendChart
  const SEG_JOURNAL = "#5ec4a0";
  const SEG_MOOD    = "#7ab8a8";
  const SEG_CHAT    = "#8c9fc4";

  return (
    <div className="weekly-activity" aria-label="Activity over the last 7 days">
      {isEmpty ? (
        <p className="weekly-activity__empty">No activity yet this week. Journal, mood, and chat all show up here.</p>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="xMidYMid meet"
            className="weekly-activity__svg"
            role="img"
            aria-label="Stacked bar chart of weekly activity"
          >
            {/* Guide lines */}
            {[0.25, 0.5, 0.75, 1].map((frac) => {
              const y = PADY_TOP + chartH * (1 - frac);
              return (
                <line key={frac} x1={PADX} y1={y} x2={W - PADX} y2={y} stroke="#243028" strokeWidth="1" strokeDasharray="3 4" />
              );
            })}

            {/* Stacked bars */}
            {buckets.map((b, i) => {
              const x = cx(i) - barW / 2;
              const scale = (n) => (n / maxTotal) * chartH;

              const journalH = scale(b.journalCount);
              const moodH    = scale(b.moodCount);
              const chatH    = scale(b.chatCount);

              const baseY = PADY_TOP + chartH;
              const journalY = baseY - journalH;
              const moodY    = journalY - moodH;
              const chatY    = moodY - chatH;

              return (
                <g key={b.day}>
                  {b.journalCount > 0 && (
                    <rect x={x} y={journalY} width={barW} height={journalH} fill={SEG_JOURNAL} fillOpacity="0.70" rx="3" />
                  )}
                  {b.moodCount > 0 && (
                    <rect x={x} y={moodY} width={barW} height={moodH} fill={SEG_MOOD} fillOpacity="0.65" rx="3" />
                  )}
                  {b.chatCount > 0 && (
                    <rect x={x} y={chatY} width={barW} height={chatH} fill={SEG_CHAT} fillOpacity="0.60" rx="3" />
                  )}
                  {b.total > 0 && (
                    <text x={cx(i)} y={chatY - 6} textAnchor="middle" fontSize="10" fill="#728a7e" fontFamily="inherit">
                      {b.total}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Day labels */}
            {buckets.map((b, i) => (
              <text key={`label-${b.day}`} x={cx(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="#46584f" fontFamily="inherit">
                {shortDay(b.day)}
              </text>
            ))}
          </svg>

          {/* Legend */}
          <div className="weekly-activity__legend" aria-hidden="true">
            <span className="weekly-activity__legend-item">
              <span className="weekly-activity__swatch" style={{ background: SEG_JOURNAL }} /> Journal
            </span>
            <span className="weekly-activity__legend-item">
              <span className="weekly-activity__swatch" style={{ background: SEG_MOOD }} /> Mood
            </span>
            <span className="weekly-activity__legend-item">
              <span className="weekly-activity__swatch" style={{ background: SEG_CHAT }} /> Chat
            </span>
          </div>
        </>
      )}
    </div>
  );
}
