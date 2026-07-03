const PERSONALITIES = [
  { id: "gentle",     emoji: "🌿", label: "Gentle",     tagline: "Soft, patient presence" },
  { id: "cheerful",   emoji: "✨", label: "Cheerful",   tagline: "Warm and uplifting"     },
  { id: "thoughtful", emoji: "🧠", label: "Thoughtful", tagline: "Curious, reflective"    },
  { id: "calm",       emoji: "🌙", label: "Calm",       tagline: "Still and grounding"    },
  { id: "motivating", emoji: "🔥", label: "Motivating", tagline: "Energetic, encouraging" },
];

export { PERSONALITIES };

export default function CompanionProfile({ name, personality, onChangeName, onChangePersonality, nameError }) {
  return (
    <div className="companion-profile">
      {/* Name */}
      <div className="settings-field">
        <label className="settings-field__label" htmlFor="companion-name-input">
          Companion name <span className="settings-field__required">*</span>
        </label>
        <input
          id="companion-name-input"
          className={`settings-field__input${nameError ? " settings-field__input--error" : ""}`}
          type="text"
          value={name}
          onChange={(e) => onChangeName(e.target.value)}
          placeholder="e.g. Sable, Mira, Lune…"
          maxLength={40}
          autoComplete="off"
          aria-describedby={nameError ? "companion-name-error" : undefined}
          aria-invalid={nameError}
        />
        {nameError && (
          <span id="companion-name-error" className="settings-field__error" role="alert">
            Companion name is required.
          </span>
        )}
      </div>

      {/* Personality */}
      <div className="settings-field">
        <span className="settings-field__label" id="personality-label">Personality</span>
        <div
          className="personality-grid"
          role="group"
          aria-labelledby="personality-label"
        >
          {PERSONALITIES.map((p) => (
            <button
              key={p.id}
              className={`personality-btn${personality === p.id ? " personality-btn--active" : ""}`}
              onClick={() => onChangePersonality(p.id)}
              aria-pressed={personality === p.id}
              title={p.tagline}
            >
              <span className="personality-btn__emoji" aria-hidden="true">{p.emoji}</span>
              <span className="personality-btn__label">{p.label}</span>
              <span className="personality-btn__tagline">{p.tagline}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
