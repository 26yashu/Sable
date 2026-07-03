/**
 * StreakProgressCard — shows the current consecutive-day streak with
 * a row of 7 dots representing the last 7 days (filled = active day).
 * Pure React + CSS, no external libraries.
 */
export default function StreakProgressCard({ streakDays, journals = [], moods = [] }) {
  // Build last-7-day activity map for the dot strip
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toDateString());
  }

  const activeDates = new Set();
  for (const j of journals) activeDates.add(new Date(j.ts).toDateString());
  for (const m of moods)    activeDates.add(new Date(m.ts).toDateString());

  const milestone = streakDays >= 30 ? "30+ day streak — remarkable consistency."
    : streakDays >= 14 ? "Two weeks strong. This is becoming a rhythm."
    : streakDays >= 7  ? "A full week. You're building something real."
    : streakDays >= 3  ? "Momentum is building."
    : streakDays >= 1  ? "You showed up today. That's how it starts."
    : "Log a mood or journal entry to begin your streak.";

  return (
    <div className="streak-card" role="status" aria-label={`Current streak: ${streakDays} days`}>
      <div className="streak-card__top">
        <div className="streak-card__flame" aria-hidden="true">🔥</div>
        <div className="streak-card__count-wrap">
          <span className="streak-card__count">{streakDays}</span>
          <span className="streak-card__unit">{streakDays === 1 ? "day" : "days"}</span>
        </div>
      </div>

      <div className="streak-card__dots" aria-hidden="true">
        {days.map((d) => (
          <span
            key={d}
            className={`streak-card__dot${activeDates.has(d) ? " streak-card__dot--active" : ""}`}
          />
        ))}
      </div>

      <p className="streak-card__milestone">{milestone}</p>
    </div>
  );
}
