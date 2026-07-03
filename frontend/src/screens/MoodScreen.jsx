import { useState, useEffect, useCallback } from "react";
import MoodSelector, { MOODS } from "../components/MoodSelector";
import { saveMood, getMoodSummary } from "../lib/api";
import { getAnonymousSession } from "../auth/AnonymousSession";

function getMoodMeta(id) {
  return MOODS.find((m) => m.id === id) || { emoji: "•", label: id };
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function MoodScreen() {
  const [moods,    setMoods]    = useState([]);
  const [summary,  setSummary]  = useState(null);   // daily summary from API
  const [selected, setSelected] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [syncNote, setSyncNote] = useState(null);

  // Load daily summary on mount
  useEffect(() => {
    const session = getAnonymousSession();
    getMoodSummary(session?.id || "anon").then(({ summary, source }) => {
      setSummary(summary);
      if (summary?.entries) setMoods(summary.entries);
      setLoading(false);
      if (source === "local") setSyncNote("Using offline data");
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!selected || saving) return;

    // Optimistic entry
    const optimistic = { id: crypto.randomUUID(), mood: selected, ts: new Date().toISOString() };
    setMoods((prev) => [optimistic, ...prev]);
    setSelected(null);
    setSaving(true);
    setSyncNote(null);

    const session = getAnonymousSession();
    const { entry, source, error } = await saveMood({
      anonId: session?.id || "anon",
      mood:   optimistic.mood,
    });

    // Reconcile
    setMoods((prev) => prev.map((e) => (e.id === optimistic.id ? entry : e)));
    setSaving(false);
    setSaved(true);
    if (source === "local" && error) setSyncNote("Saved locally — will sync when online");
    setTimeout(() => setSaved(false), 1800);
  }, [selected, saving]);

  const saveLabel = saving ? "Logging…" : saved ? "✓ Logged" : "Log mood";
  const todayCount = moods.filter(
    (m) => m.ts?.slice(0, 10) === new Date().toISOString().slice(0, 10),
  ).length;

  return (
    <div className="screen mood-screen">
      <header className="screen__header">
        <div className="screen__header-inner">
          <div className="screen__eyebrow">Mood</div>
          <h1 className="screen__title">How are you feeling?</h1>
          <p className="screen__sub">
            No judgement. Just a quiet check-in.
            {todayCount > 0 && !loading && (
              <span className="screen__sync-note" aria-live="polite">
                {" "}· {todayCount} check-in{todayCount > 1 ? "s" : ""} today
              </span>
            )}
            {syncNote && (
              <span className="screen__sync-note" aria-live="polite"> · {syncNote}</span>
            )}
          </p>
        </div>
      </header>

      <div className="screen__body">
        {/* ── Picker ── */}
        <div className="mood-picker" role="region" aria-label="Mood check-in">
          <MoodSelector selected={selected} onSelect={setSelected} />
          <button
            className={`mood-picker__save${saved ? " mood-picker__save--saved" : ""}${saving ? " mood-picker__save--saving" : ""}`}
            onClick={handleSave}
            disabled={!selected || saving}
            aria-label={saveLabel}
            aria-live="polite"
            aria-busy={saving}
          >
            {saving && <span className="btn-spinner" aria-hidden="true" />}
            {saveLabel}
          </button>
        </div>

        {/* ── Summary card (from backend) ── */}
        {summary && summary.dominant && (
          <div className="mood-summary-card" aria-label="Today's mood summary">
            <span className="mood-summary-card__emoji" aria-hidden="true">
              {getMoodMeta(summary.dominant).emoji}
            </span>
            <div className="mood-summary-card__body">
              <span className="mood-summary-card__label">Today's dominant mood</span>
              <span className="mood-summary-card__value">{getMoodMeta(summary.dominant).label}</span>
            </div>
            <span className="mood-summary-card__count">{summary.count} today</span>
          </div>
        )}

        {/* ── History ── */}
        {loading ? (
          <div className="screen__loading" role="status" aria-live="polite">
            <span className="screen__loading-spinner" aria-hidden="true" />
            Loading your mood history…
          </div>
        ) : moods.length > 0 ? (
          <section className="mood-history" aria-label="Mood history">
            <h2 className="mood-history__heading">Recent check-ins</h2>
            <div className="mood-history__list" role="list">
              {moods.map((entry) => {
                const meta = getMoodMeta(entry.mood);
                return (
                  <div key={entry.id} className="mood-log" role="listitem">
                    <span className="mood-log__emoji" aria-hidden="true">{meta.emoji}</span>
                    <div className="mood-log__info">
                      <span className="mood-log__label">{meta.label}</span>
                      <time className="mood-log__time" dateTime={entry.ts}>
                        {formatDateTime(entry.ts)}
                      </time>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : (
          <div className="screen__empty-state" role="status" aria-live="polite">
            <span className="screen__empty-icon" aria-hidden="true">🌙</span>
            <p className="screen__empty-heading">Your mood journey begins here.</p>
            <p className="screen__empty-sub">Pick how you feel and log it — patterns emerge over time.</p>
          </div>
        )}
      </div>
    </div>
  );
}
