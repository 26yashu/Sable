import { useState, useEffect, useMemo } from "react";
import InsightCard         from "../components/InsightCard";
import MoodTrendChart       from "../components/MoodTrendChart";
import MoodTimeline         from "../components/MoodTimeline";
import WeeklyActivityChart  from "../components/WeeklyActivityChart";
import StreakProgressCard   from "../components/StreakProgressCard";
import SkeletonCard         from "../components/SkeletonCard";
import { MOODS }            from "../components/MoodSelector";
import { buildMonthlyStoryData } from "../lib/monthlyStory";

// ── Storage readers ────────────────────────────────────────────
function readJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// ── Date helpers ───────────────────────────────────────────────
function isThisWeek(iso) {
  const now  = new Date();
  const then = new Date(iso);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  return then >= startOfWeek;
}

function isToday(iso) {
  const d = new Date(iso).toDateString();
  return d === new Date().toDateString();
}

/**
 * Calculates the current streak of consecutive days with at least
 * one journal entry or mood check-in. Counts backward from today.
 */
function calcStreakDays(journals, moods) {
  const dateSet = new Set();
  for (const j of journals) dateSet.add(new Date(j.ts).toDateString());
  for (const m of moods)    dateSet.add(new Date(m.ts).toDateString());

  let streak = 0;
  const cursor = new Date();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (dateSet.has(cursor.toDateString())) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Returns the dominant (most frequent) mood logged within the current week.
 * Returns null if no mood entries fall within this week.
 */
function getDominantMoodThisWeek(moods) {
  const weekMoods = moods.filter((m) => isThisWeek(m.ts));
  if (weekMoods.length === 0) return null;
  const freq = {};
  for (const m of weekMoods) freq[m.mood] = (freq[m.mood] || 0) + 1;
  const [topId, topCount] = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
  return { id: topId, count: topCount };
}

// ── Insight generator ──────────────────────────────────────────
const MOOD_MESSAGES = {
  anxious:    "You've been feeling anxious lately — remember to give yourself moments of stillness.",
  stressed:   "Stress tends to accumulate quietly. Small pauses help more than you think.",
  sad:        "Sadness deserves space. You're doing well just by showing up.",
  frustrated: "Frustration often signals something that matters deeply to you.",
  tired:      "Rest isn't a reward — it's a need. Be gentle with your energy.",
  happy:      "Joy is worth savouring. Notice what's been bringing it on.",
  calm:       "Calm is something you're cultivating. It shows.",
};

function getMoodMeta(id) {
  return MOODS.find((m) => m.id === id) ?? { emoji: "•", label: id };
}

function deriveInsights(journals, moods) {
  const insights = [];

  // ── Journal stats ──────────────────────────────────────────
  const totalEntries = journals.length;
  const weekEntries  = journals.filter((e) => isThisWeek(e.ts)).length;
  const todayEntries = journals.filter((e) => isToday(e.ts)).length;

  if (totalEntries === 0) {
    insights.push({
      id:   "journal-empty",
      icon: "📓",
      label: "Journal",
      text: "You haven't written any journal entries yet. A few words a day can make a real difference.",
    });
  } else {
    insights.push({
      id:   "journal-total",
      icon: "📓",
      label: "Journal",
      text: totalEntries === 1
        ? "You've written 1 journal entry so far. Every word counts."
        : `You've written ${totalEntries} journal entr${totalEntries === 1 ? "y" : "ies"} in total.`,
    });
    if (weekEntries > 0) {
      insights.push({
        id:   "journal-week",
        icon: "🗓️",
        label: "This week",
        text: weekEntries === 1
          ? "You wrote 1 entry this week. Showing up matters."
          : `You've written ${weekEntries} entries this week. That's consistent reflection.`,
      });
    }
    if (todayEntries > 0) {
      insights.push({
        id:   "journal-today",
        icon: "✍️",
        label: "Today",
        text: `You wrote ${todayEntries === 1 ? "an entry" : `${todayEntries} entries`} today. Words are a form of self-care.`,
      });
    }
  }

  // ── Mood stats ─────────────────────────────────────────────
  if (moods.length === 0) {
    insights.push({
      id:   "mood-empty",
      icon: "🌙",
      label: "Mood",
      text: "No mood check-ins yet. Even a quick log helps you notice patterns over time.",
    });
  } else {
    const freq = {};
    for (const m of moods) freq[m.mood] = (freq[m.mood] || 0) + 1;

    const topMoodId = Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
    const topMeta   = getMoodMeta(topMoodId);
    const topCount  = freq[topMoodId];

    insights.push({
      id:   "mood-top",
      icon: topMeta.emoji,
      label: "Most frequent mood",
      text: `${topMeta.label} has been your most common state — logged ${topCount} ${topCount === 1 ? "time" : "times"}.`,
    });

    const weekMoods = moods.filter((m) => isThisWeek(m.ts));
    if (weekMoods.length > 0) {
      const weekFreq = {};
      for (const m of weekMoods) weekFreq[m.mood] = (weekFreq[m.mood] || 0) + 1;

      for (const [id, count] of Object.entries(weekFreq)) {
        const meta = getMoodMeta(id);
        insights.push({
          id:   `mood-week-${id}`,
          icon: meta.emoji,
          label: "This week",
          text: `You logged ${meta.label} ${count} ${count === 1 ? "time" : "times"} this week.`,
        });
      }
    }

    const advice = MOOD_MESSAGES[topMoodId];
    if (advice) {
      insights.push({ id: "mood-advice", icon: "🌿", label: "Reflection", text: advice });
    }

    const recent5 = moods.slice(0, 5).map((m) => m.mood);
    const positiveSet = new Set(["happy", "calm"]);
    const negativeSet = new Set(["sad", "anxious", "frustrated", "tired"]);
    const posCount = recent5.filter((id) => positiveSet.has(id)).length;
    const negCount = recent5.filter((id) => negativeSet.has(id)).length;

    if (recent5.length >= 3) {
      if (posCount >= 3) {
        insights.push({
          id: "trend-positive", icon: "✦", label: "Emotional trend",
          text: "Your recent moods have leaned positive. Something is working — keep noticing it.",
        });
      } else if (negCount >= 3) {
        insights.push({
          id: "trend-difficult", icon: "🌧️", label: "Emotional trend",
          text: "You've had a stretch of harder days recently. That's okay. You don't have to fix it all at once.",
        });
      } else {
        insights.push({
          id: "trend-mixed", icon: "🌤️", label: "Emotional trend",
          text: "Your recent moods have been a mix. Life rarely runs in a single direction — that's normal.",
        });
      }
    }
  }

  return insights;
}

// ── Mood frequency bar ───────────────────────────────────────
function FreqBar({ moodId, count, max }) {
  const meta  = getMoodMeta(moodId);
  const width = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="freq-row">
      <span className="freq-row__emoji" aria-hidden="true">{meta.emoji}</span>
      <span className="freq-row__label">{meta.label}</span>
      <div className="freq-row__track" role="progressbar" aria-valuenow={count} aria-valuemax={max} aria-label={`${meta.label}: ${count}`}>
        <div className="freq-row__fill" style={{ width: `${width}%` }} />
      </div>
      <span className="freq-row__count">{count}</span>
    </div>
  );
}

// ── Main screen ────────────────────────────────────────────────
export default function InsightsScreen() {
  // Brief loading phase so skeletons are visible — localStorage reads
  // are synchronous and instant, so we simulate a short, honest delay
  // rather than computing on every render.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 420);
    return () => clearTimeout(t);
  }, []);

  const journals = useMemo(() => readJSON("sable_journal_entries"), []);
  const moods    = useMemo(() => readJSON("sable_moods"), []);
  const messages = useMemo(() => readJSON("sable_messages"), []);

  const conversationCount = useMemo(
    () => messages.filter((m) => m.role === "user").length,
    [messages]
  );

  const insights = useMemo(() => deriveInsights(journals, moods), [journals, moods]);

  const moodFreq = useMemo(() => {
    const freq = {};
    for (const m of moods) freq[m.mood] = (freq[m.mood] || 0) + 1;
    return Object.entries(freq).sort((a, b) => b[1] - a[1]);
  }, [moods]);

  const maxFreq = moodFreq.length > 0 ? moodFreq[0][1] : 1;

  const streakDays = useMemo(() => calcStreakDays(journals, moods), [journals, moods]);

  const dominantWeekMood = useMemo(() => getDominantMoodThisWeek(moods), [moods]);
  const dominantWeekMeta = dominantWeekMood ? getMoodMeta(dominantWeekMood.id) : null;

  // Monthly Story Foundation — local data structure only, no AI generation
  const monthlyStory = useMemo(() => buildMonthlyStoryData(), [journals, moods, messages]);

  const hasData = journals.length > 0 || moods.length > 0 || conversationCount > 0;

  return (
    <div className="screen insights-screen">
      {/* ── Header ── */}
      <header className="screen__header">
        <div className="screen__header-inner">
          <div className="screen__eyebrow">Insights</div>
          <h1 className="screen__title">What your data reflects.</h1>
          <p className="screen__sub">Everything is derived locally — nothing leaves your device.</p>
        </div>
      </header>

      <div className="screen__body">

        {loading ? (
          <>
            {/* ── Loading skeletons ── */}
            <div className="stats-row">
              <SkeletonCard variant="stat" />
              <SkeletonCard variant="stat" />
              <SkeletonCard variant="stat" />
              <SkeletonCard variant="stat" />
            </div>
            <SkeletonCard variant="panel" />
            <SkeletonCard variant="panel" />
            <SkeletonCard variant="list" />
          </>
        ) : !hasData ? (
          <div className="screen__empty-state" role="status" aria-live="polite">
            <span className="screen__empty-icon" aria-hidden="true">✦</span>
            <p className="screen__empty-heading">Your insights will grow here.</p>
            <p className="screen__empty-sub">Start with a journal entry, a mood check-in, or a conversation — patterns emerge gently over time.</p>
          </div>
        ) : (
          <>
            {/* ── Stats row ── */}
            <div className="stats-row">
              <div className="stat-pill" style={{ animationDelay: "0ms" }}>
                <span className="stat-pill__value">{journals.length}</span>
                <span className="stat-pill__label">Journal entries</span>
              </div>
              <div className="stat-pill" style={{ animationDelay: "40ms" }}>
                <span className="stat-pill__value">{moods.length}</span>
                <span className="stat-pill__label">Mood check-ins</span>
              </div>
              <div className="stat-pill" style={{ animationDelay: "80ms" }}>
                <span className="stat-pill__value">{conversationCount}</span>
                <span className="stat-pill__label">Conversations</span>
              </div>
              <div className="stat-pill" style={{ animationDelay: "120ms" }}>
                <span className="stat-pill__value">{streakDays > 0 ? `${streakDays}🔥` : "0"}</span>
                <span className="stat-pill__label">Day streak</span>
              </div>
            </div>

            {/* ── Dominant mood this week ── */}
            {dominantWeekMeta && (
              <div className="mood-summary-card" role="status">
                <span className="mood-summary-card__emoji" aria-hidden="true">{dominantWeekMeta.emoji}</span>
                <div className="mood-summary-card__body">
                  <span className="mood-summary-card__label">Dominant mood this week</span>
                  <span className="mood-summary-card__value">{dominantWeekMeta.label}</span>
                </div>
                <span className="mood-summary-card__count">{dominantWeekMood.count}×</span>
              </div>
            )}

            {/* ── Streak progress card ── */}
            <section className="insights-section" aria-label="Streak progress">
              <h2 className="insights-section__heading">Streak progress</h2>
              <div className="insights-panel">
                <StreakProgressCard streakDays={streakDays} journals={journals} moods={moods} />
              </div>
            </section>

            {/* ── Weekly activity chart ── */}
            <section className="insights-section" aria-label="Weekly activity">
              <h2 className="insights-section__heading">Weekly activity</h2>
              <div className="insights-panel">
                <WeeklyActivityChart journals={journals} moods={moods} messages={messages} />
              </div>
            </section>

            {/* ── Mood timeline ── */}
            {moods.length > 0 && (
              <section className="insights-section" aria-label="Mood timeline">
                <h2 className="insights-section__heading">Mood timeline</h2>
                <div className="insights-panel">
                  <MoodTimeline moods={moods} />
                </div>
              </section>
            )}

            {/* ── 7-day mood trend ── */}
            {moods.length > 0 && (
              <section className="insights-section" aria-label="7-day mood trend">
                <h2 className="insights-section__heading">7-day mood trend</h2>
                <div className="insights-panel">
                  <MoodTrendChart moods={moods} />
                </div>
              </section>
            )}

            {/* ── Mood frequency breakdown ── */}
            {moodFreq.length > 0 && (
              <section className="insights-section" aria-label="Mood frequency">
                <h2 className="insights-section__heading">Mood frequency</h2>
                <div className="insights-panel freq-panel">
                  {moodFreq.map(([id, count]) => (
                    <FreqBar key={id} moodId={id} count={count} max={maxFreq} />
                  ))}
                </div>
              </section>
            )}

            {/* ── This month at a glance (Monthly Story Foundation) ── */}
            {(monthlyStory.totalEntries > 0 || monthlyStory.conversationCount > 0 || monthlyStory.dominantMood) && (
              <section className="insights-section" aria-label="This month at a glance">
                <h2 className="insights-section__heading">{monthlyStory.month} at a glance</h2>
                <div className="insights-panel month-glance">
                  <div className="month-glance__row">
                    <span className="month-glance__label">Dominant mood</span>
                    <span className="month-glance__value">
                      {monthlyStory.dominantMood ? (
                        <>{getMoodMeta(monthlyStory.dominantMood).emoji} {getMoodMeta(monthlyStory.dominantMood).label}</>
                      ) : "—"}
                    </span>
                  </div>
                  <div className="month-glance__row">
                    <span className="month-glance__label">Journal entries</span>
                    <span className="month-glance__value">{monthlyStory.totalEntries}</span>
                  </div>
                  <div className="month-glance__row">
                    <span className="month-glance__label">Conversations</span>
                    <span className="month-glance__value">{monthlyStory.conversationCount}</span>
                  </div>
                  {monthlyStory.journalThemes.length > 0 && (
                    <div className="month-glance__themes">
                      {monthlyStory.journalThemes.map((theme) => (
                        <span key={theme} className="month-glance__theme-chip">{theme}</span>
                      ))}
                    </div>
                  )}
                  <p className="month-glance__note">
                    Your monthly story will be written here in a future update.
                  </p>
                </div>
              </section>
            )}

            {/* ── Insight cards ── */}
            <section className="insights-section" aria-label="Personal insights">
              <h2 className="insights-section__heading">Personal insights</h2>
              <div className="insight-list">
                {insights.map((ins, i) => (
                  <InsightCard key={ins.id} insight={ins} index={i} />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
