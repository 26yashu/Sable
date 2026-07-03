import { useState, useEffect, useCallback } from "react";
import BreathingExercise from "../components/BreathingExercise";
import { CALMING_QUOTES, GROUNDING_PROMPTS, pickRandom } from "../lib/comfortContent";

export default function ComfortScreen() {
  const [loading, setLoading] = useState(true);
  const [quote,   setQuote]   = useState(() => pickRandom(CALMING_QUOTES));
  const [prompt,  setPrompt]  = useState(() => pickRandom(GROUNDING_PROMPTS));
  const [musicOn, setMusicOn] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 320);
    return () => clearTimeout(t);
  }, []);

  const newQuote = useCallback(() => {
    setQuote((prev) => pickRandom(CALMING_QUOTES, prev));
  }, []);

  const newPrompt = useCallback(() => {
    setPrompt((prev) => pickRandom(GROUNDING_PROMPTS, prev));
  }, []);

  return (
    <div className="screen comfort-screen">
      <header className="screen__header">
        <div className="screen__header-inner">
          <div className="screen__eyebrow">Comfort Space 🌙</div>
          <h1 className="screen__title">A gentle place to pause.</h1>
          <p className="screen__sub">No goals here. Just a few quiet tools, whenever you need them.</p>
        </div>
      </header>

      <div className="screen__body">

        {loading ? (
          <>
            <div className="skeleton skeleton-panel" style={{ maxWidth: 680, margin: "0 auto", width: "100%", minHeight: 220 }}>
              <div className="skeleton__bar skeleton__bar--xs" style={{ width: "30%" }} />
              <div className="skeleton__block" style={{ height: 160 }} />
            </div>
            <div className="skeleton skeleton-panel" style={{ maxWidth: 680, margin: "0 auto", width: "100%" }}>
              <div className="skeleton__bar skeleton__bar--xs" style={{ width: "40%" }} />
              <div className="skeleton__block" style={{ height: 60 }} />
            </div>
          </>
        ) : (
          <>
            {/* ── Breathing exercise ── */}
            <section className="insights-section" aria-label="Breathing exercise">
              <h2 className="insights-section__heading">Breathing exercise</h2>
              <div className="insights-panel">
                <BreathingExercise />
              </div>
            </section>

            {/* ── Calming quote ── */}
            <section className="insights-section" aria-label="Calming quote">
              <h2 className="insights-section__heading">A gentle reminder</h2>
              <div className="comfort-quote-card">
                <span className="comfort-quote-card__mark" aria-hidden="true">"</span>
                <p className="comfort-quote-card__text">{quote}</p>
                <button
                  className="comfort-quote-card__refresh"
                  onClick={newQuote}
                  aria-label="Show another quote"
                >
                  ↻ Another
                </button>
              </div>
            </section>

            {/* ── Grounding prompt ── */}
            <section className="insights-section" aria-label="Grounding prompt">
              <h2 className="insights-section__heading">Mini grounding moment</h2>
              <div className="comfort-grounding-card">
                <span className="comfort-grounding-card__icon" aria-hidden="true">🌿</span>
                <p className="comfort-grounding-card__text">{prompt}</p>
                <button
                  className="comfort-grounding-card__refresh"
                  onClick={newPrompt}
                  aria-label="Show another grounding prompt"
                >
                  ↻ Try another
                </button>
              </div>
            </section>

            {/* ── Music placeholder ── */}
            <section className="insights-section" aria-label="Calming sound">
              <h2 className="insights-section__heading">Calming sound</h2>
              <div className="comfort-music-card">
                <div className="comfort-music-card__info">
                  <span className="comfort-music-card__icon" aria-hidden="true">🎵</span>
                  <div>
                    <p className="comfort-music-card__title">Gentle ambience</p>
                    <p className="comfort-music-card__note">Soft background sound — coming soon.</p>
                  </div>
                </div>
                <button
                  className={`comfort-music-card__toggle${musicOn ? " comfort-music-card__toggle--on" : ""}`}
                  onClick={() => setMusicOn((v) => !v)}
                  aria-pressed={musicOn}
                  aria-label={musicOn ? "Pause gentle ambience" : "Play gentle ambience"}
                  disabled
                  title="Audio playback is coming in a future update"
                >
                  {musicOn ? "❚❚" : "▶"}
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
