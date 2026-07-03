import { useState, useEffect, useMemo, useCallback } from "react";
import { buildMonthlyStoryData }   from "../lib/monthlyStory";
import { generateMonthlyStory }    from "../lib/api";
import { getCachedStory, setCachedStory, getMonthKey } from "../lib/monthlyStoryCache";
import { MOODS } from "../components/MoodSelector";

function getMoodMeta(id) {
  return MOODS.find((m) => m.id === id) ?? { emoji: "•", label: id };
}

export default function StoryScreen() {
  const monthKey = useMemo(() => getMonthKey(), []);
  const summary  = useMemo(() => buildMonthlyStoryData(), []);

  const [story,         setStory]         = useState(() => getCachedStory(monthKey));
  const [loading,        setLoading]      = useState(() => !getCachedStory(monthKey));
  const [regenerating,   setRegenerating] = useState(false);
  const [syncSource,     setSyncSource]   = useState(null); // "backend" | "local" | null

  const hasActivity = summary.totalEntries > 0 || summary.conversationCount > 0 || summary.dominantMood;

  const fetchStory = useCallback(async (force = false) => {
    if (!hasActivity && !force) {
      setLoading(false);
      return;
    }

    if (force) setRegenerating(true);
    else       setLoading(true);

    const result = await generateMonthlyStory(summary);

    const fullStory = {
      month:             summary.month,
      monthKey,
      title:             result.title,
      narrative:         result.narrative,
      dominantMood:      summary.dominantMood,
      themes:            summary.journalThemes,
      journalCount:      summary.totalEntries,
      conversationCount: summary.conversationCount,
      growthReflection:  result.growthReflection,
      encouragement:     result.encouragement,
      generatedAt:       new Date().toISOString(),
      source:            result.source,
    };

    setCachedStory(fullStory, monthKey);
    setStory(fullStory);
    setSyncSource(result.source);
    setLoading(false);
    setRegenerating(false);
  }, [summary, monthKey, hasActivity]);

  // Generate once per month automatically — only if no cached story exists yet
  useEffect(() => {
    const cached = getCachedStory(monthKey);
    if (cached) {
      setStory(cached);
      setSyncSource(cached.source || null);
      setLoading(false);
    } else {
      fetchStory(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey]);

  function handleRegenerate() {
    fetchStory(true);
  }

  const dominantMeta = story?.dominantMood ? getMoodMeta(story.dominantMood) : null;

  return (
    <div className="screen story-screen">
      <header className="screen__header">
        <div className="screen__header-inner">
          <div className="screen__eyebrow">Monthly Reflection 🌙</div>
          <h1 className="screen__title">
            {story?.title || (summary.month ? `Your ${summary.month} Reflection` : "Your monthly reflection")}
          </h1>
          <p className="screen__sub">
            A gentle look back, written from your own month — nothing leaves your story behind.
          </p>
        </div>
      </header>

      <div className="screen__body">

        {loading ? (
          <div className="story-skeleton" aria-hidden="true">
            <div className="skeleton skeleton-panel" style={{ minHeight: 180 }}>
              <div className="skeleton__bar skeleton__bar--xs" style={{ width: "30%" }} />
              <div className="skeleton__block" style={{ height: 120 }} />
            </div>
            <div className="stats-row">
              <SkeletonStatInline />
              <SkeletonStatInline />
              <SkeletonStatInline />
            </div>
          </div>
        ) : !hasActivity ? (
          <div className="screen__empty-state" role="status" aria-live="polite">
            <span className="screen__empty-icon" aria-hidden="true">🌙</span>
            <p className="screen__empty-heading">Your monthly story begins with you.</p>
            <p className="screen__empty-sub">
              Log a mood, write a journal entry, or have a conversation — your reflection will be written from there.
            </p>
          </div>
        ) : (
          <>
            {/* ── Narrative card ── */}
            <section className="story-card" aria-label="Monthly narrative">
              <div className="story-card__badge">
                <span aria-hidden="true">🌙</span> {story.month}
              </div>
              <h2 className="story-card__title">{story.title}</h2>
              <p className="story-card__narrative">{story.narrative}</p>

              {syncSource === "local" && (
                <span className="chat__sync-badge story-card__sync-badge" role="status">
                  ↻ written locally
                </span>
              )}
            </section>

            {/* ── Stats row ── */}
            <div className="stats-row">
              <div className="stat-pill">
                <span className="stat-pill__value">
                  {dominantMeta ? <>{dominantMeta.emoji}</> : "—"}
                </span>
                <span className="stat-pill__label">
                  {dominantMeta ? dominantMeta.label : "Dominant mood"}
                </span>
              </div>
              <div className="stat-pill">
                <span className="stat-pill__value">{story.journalCount}</span>
                <span className="stat-pill__label">Journal entries</span>
              </div>
              <div className="stat-pill">
                <span className="stat-pill__value">{story.conversationCount}</span>
                <span className="stat-pill__label">Conversations</span>
              </div>
            </div>

            {/* ── Main themes ── */}
            {story.themes?.length > 0 && (
              <section className="insights-section" aria-label="Main themes">
                <h2 className="insights-section__heading">Main themes</h2>
                <div className="insights-panel">
                  <div className="month-glance__themes">
                    {story.themes.map((theme) => (
                      <span key={theme} className="month-glance__theme-chip">{theme}</span>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* ── Growth reflection ── */}
            {story.growthReflection && (
              <section className="insights-section" aria-label="Growth reflection">
                <h2 className="insights-section__heading">Growth reflection</h2>
                <div className="insights-panel story-reflection-panel">
                  <span className="story-reflection-panel__icon" aria-hidden="true">🌱</span>
                  <p className="story-reflection-panel__text">{story.growthReflection}</p>
                </div>
              </section>
            )}

            {/* ── Encouragement ── */}
            {story.encouragement && (
              <section className="insights-section" aria-label="Encouragement">
                <div className="story-encouragement">
                  <span className="story-encouragement__icon" aria-hidden="true">✦</span>
                  <p className="story-encouragement__text">{story.encouragement}</p>
                </div>
              </section>
            )}

            {/* ── Regenerate ── */}
            <div className="story-regenerate-row">
              <button
                className={`story-regenerate-btn${regenerating ? " story-regenerate-btn--loading" : ""}`}
                onClick={handleRegenerate}
                disabled={regenerating}
                aria-label={regenerating ? "Regenerating your story" : "Regenerate this month's story"}
              >
                {regenerating ? (
                  <span className="onboarding__cta-inner">
                    <span className="spinner" aria-hidden="true" /> Regenerating…
                  </span>
                ) : (
                  "↻ Regenerate story"
                )}
              </button>
              <p className="story-regenerate-hint">
                Your story refreshes automatically each new month — or regenerate it any time.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Small inline skeleton for the stats row while loading (no separate file needed)
function SkeletonStatInline() {
  return (
    <div className="skeleton skeleton-stat" aria-hidden="true">
      <div className="skeleton__bar skeleton__bar--lg" />
      <div className="skeleton__bar skeleton__bar--sm" />
    </div>
  );
}
