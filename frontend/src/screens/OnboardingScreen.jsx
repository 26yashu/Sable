import { useState } from "react";
import { createAnonymousSession } from "../auth/AnonymousSession";

export default function OnboardingScreen({ onComplete }) {
  const [displayName, setDisplayName] = useState("");
  const [companionName, setCompanionName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleContinue() {
    if (!companionName.trim()) {
      setError("Give your companion a name to continue.");
      return;
    }
    setError("");
    setLoading(true);
    setTimeout(() => {
      const session = createAnonymousSession({ displayName, companionName });
      onComplete(session);
    }, 420);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleContinue();
  }

  return (
    <main className="onboarding">
      <div className="onboarding__card">
        <div className="onboarding__eyebrow">Sable</div>

        <h1 className="onboarding__headline">
          A quiet space,<br />just for you.
        </h1>

        <p className="onboarding__sub">
          No account. No tracking. Your companion stays on your device.
        </p>

        <div className="onboarding__fields">
          <div className="field">
            <label className="field__label" htmlFor="displayName">
              Your name <span className="field__optional">optional</span>
            </label>
            <input
              id="displayName"
              className="field__input"
              type="text"
              placeholder="How should your companion call you?"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={40}
              autoComplete="off"
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="companionName">
              Companion name <span className="field__required">*</span>
            </label>
            <input
              id="companionName"
              className={`field__input${error ? " field__input--error" : ""}`}
              type="text"
              placeholder="e.g. Sable, Mira, Lune…"
              value={companionName}
              onChange={(e) => {
                setCompanionName(e.target.value);
                if (error) setError("");
              }}
              onKeyDown={handleKeyDown}
              maxLength={40}
              autoComplete="off"
              aria-describedby={error ? "companion-error" : undefined}
            />
            {error && (
              <span id="companion-error" className="field__error" role="alert">
                {error}
              </span>
            )}
          </div>
        </div>

        <button
          className={`onboarding__cta${loading ? " onboarding__cta--loading" : ""}`}
          onClick={handleContinue}
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? (
            <span className="onboarding__cta-inner">
              <span className="spinner" aria-hidden="true" /> Beginning…
            </span>
          ) : (
            <span className="onboarding__cta-inner">
              Continue Anonymously <span aria-hidden="true">🌿</span>
            </span>
          )}
        </button>

        <p className="onboarding__privacy">
          Nothing leaves your browser. Ever.
        </p>
      </div>
    </main>
  );
}
