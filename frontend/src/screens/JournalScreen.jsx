import { useState, useEffect, useCallback } from "react";
import JournalCard from "../components/JournalCard";
import { saveJournal, getJournalHistory } from "../lib/api";
import { getAnonymousSession } from "../auth/AnonymousSession";

export default function JournalScreen() {
  const [entries,  setEntries]  = useState([]);
  const [text,     setText]     = useState("");
  const [loading,  setLoading]  = useState(true);   // initial history load
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [syncNote, setSyncNote] = useState(null);    // non-blocking backend hint

  // Load history on mount
  useEffect(() => {
    const session = getAnonymousSession();
    getJournalHistory(session?.id || "anon").then(({ entries, source }) => {
      setEntries(entries);
      setLoading(false);
      if (source === "local") setSyncNote("Using offline data");
    });
  }, []);

  const handleSave = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || saving) return;

    // Optimistic: add to list immediately
    const optimistic = { id: crypto.randomUUID(), text: trimmed, ts: new Date().toISOString() };
    setEntries((prev) => [optimistic, ...prev]);
    setText("");
    setSaving(true);
    setSyncNote(null);

    const session = getAnonymousSession();
    const { entry, source, error } = await saveJournal({
      anonId: session?.id || "anon",
      text:   trimmed,
    });

    // Reconcile optimistic entry with server response
    setEntries((prev) =>
      prev.map((e) => (e.id === optimistic.id ? entry : e)),
    );
    setSaving(false);
    setSaved(true);
    if (source === "local" && error) setSyncNote("Saved locally — will sync when online");
    setTimeout(() => setSaved(false), 1800);
  }, [text, saving]);

  function handleKeyDown(e) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
  }

  const saveLabel = saving ? "Saving…" : saved ? "✓ Saved" : "Save entry";

  return (
    <div className="screen journal-screen">
      <header className="screen__header">
        <div className="screen__header-inner">
          <div className="screen__eyebrow">Journal</div>
          <h1 className="screen__title">Your private space.</h1>
          <p className="screen__sub">
            Words stay here. Only you can read them.
            {syncNote && (
              <span className="screen__sync-note" aria-live="polite"> · {syncNote}</span>
            )}
          </p>
        </div>
      </header>

      <div className="screen__body">
        {/* ── Compose ── */}
        <div className="journal-compose" role="region" aria-label="Write a journal entry">
          <textarea
            className="journal-compose__textarea"
            placeholder="What's on your mind today…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={5}
            aria-label="Journal entry text"
            aria-multiline="true"
            disabled={saving}
          />
          <div className="journal-compose__footer">
            <span className="journal-compose__hint" aria-hidden="true">⌘ + Enter to save</span>
            <button
              className={`journal-compose__save${saved ? " journal-compose__save--saved" : ""}${saving ? " journal-compose__save--saving" : ""}`}
              onClick={handleSave}
              disabled={!text.trim() || saving}
              aria-label={saveLabel}
              aria-live="polite"
              aria-busy={saving}
            >
              {saving && <span className="btn-spinner" aria-hidden="true" />}
              {saveLabel}
            </button>
          </div>
        </div>

        {/* ── History ── */}
        {loading ? (
          <div className="screen__loading" role="status" aria-live="polite">
            <span className="screen__loading-spinner" aria-hidden="true" />
            Loading your entries…
          </div>
        ) : entries.length > 0 ? (
          <section className="journal-history" aria-label="Previous journal entries">
            <h2 className="journal-history__heading">Previous entries</h2>
            <div className="journal-history__list" role="list">
              {entries.map((e) => (
                <div key={e.id} role="listitem">
                  <JournalCard entry={e} />
                </div>
              ))}
            </div>
          </section>
        ) : (
          <div className="screen__empty-state" role="status" aria-live="polite">
            <span className="screen__empty-icon" aria-hidden="true">🌿</span>
            <p className="screen__empty-heading">No journal entries yet</p>
            <p className="screen__empty-sub">Your words are safe here. Begin whenever you're ready.</p>
          </div>
        )}
      </div>
    </div>
  );
}
