import { useState, useEffect } from "react";
import CompanionProfile from "../components/CompanionProfile";
import ThemeSelector    from "../components/ThemeSelector";
import { applyTheme }   from "../App";

const PROFILE_KEY      = "sable_companion_profile";
const DISPLAY_NAME_KEY = "sable_display_name";
const COMPANION_KEY    = "sable_companion_name";
const THEME_KEY        = "sable_theme";

// Full companion profile shape: { name, personality, communicationStyle, memory: [] }
function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return { personality: "gentle", communicationStyle: "warm and calm", memory: [] };
    const p = JSON.parse(raw);
    return {
      personality:        p.personality        || "gentle",
      communicationStyle: p.communicationStyle || "warm and calm",
      memory:             Array.isArray(p.memory) ? p.memory : [],
    };
  } catch {
    return { personality: "gentle", communicationStyle: "warm and calm", memory: [] };
  }
}

export default function SettingsScreen({ session, onSessionUpdate }) {
  const initialProfile = loadProfile();

  const [displayName,        setDisplayName]        = useState(session?.displayName  || "");
  const [companionName,      setCompanionName]      = useState(session?.companionName || "");
  const [personality,        setPersonality]        = useState(initialProfile.personality);
  const [communicationStyle, setCommunicationStyle] = useState(initialProfile.communicationStyle);
  const [theme,              setTheme]              = useState(() => localStorage.getItem(THEME_KEY) || "dark");
  const [saved,              setSaved]              = useState(false);
  const [dirty,              setDirty]              = useState(false);
  const [nameError,          setNameError]          = useState(false);

  // Track dirtiness after mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (mounted) setDirty(true);
  }, [displayName, companionName, personality, communicationStyle, theme]); // eslint-disable-line

  // Preview theme immediately on toggle
  useEffect(() => { applyTheme(theme); }, [theme]);

  function handleSave() {
    if (!companionName.trim()) { setNameError(true); return; }
    setNameError(false);

    localStorage.setItem(DISPLAY_NAME_KEY, displayName.trim());
    localStorage.setItem(COMPANION_KEY,    companionName.trim());
    localStorage.setItem(THEME_KEY,        theme);

    // Preserve existing memory array — never overwrite it on settings save
    const existing = loadProfile();
    localStorage.setItem(PROFILE_KEY, JSON.stringify({
      name:                companionName.trim(),
      personality,
      communicationStyle,
      memory:              existing.memory, // preserved, not touched by Settings
    }));

    applyTheme(theme);

    onSessionUpdate({
      ...session,
      displayName:   displayName.trim(),
      companionName: companionName.trim(),
    });

    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  return (
    <div className="screen settings-screen">
      <header className="screen__header">
        <div className="screen__header-inner">
          <div className="screen__eyebrow">Settings</div>
          <h1 className="screen__title">Your Sable space.</h1>
          <p className="screen__sub">All changes are stored locally on your device.</p>
        </div>
      </header>

      <div className="screen__body">

        {/* ── You ── */}
        <section className="settings-section" aria-labelledby="settings-you">
          <h2 className="settings-section__heading" id="settings-you">You</h2>
          <div className="settings-panel">
            <div className="settings-field">
              <label className="settings-field__label" htmlFor="display-name-input">
                Display name <span className="settings-field__optional">optional</span>
              </label>
              <input
                id="display-name-input"
                className="settings-field__input"
                type="text"
                value={displayName}
                onChange={(e) => { setDisplayName(e.target.value); }}
                placeholder="How should your companion call you?"
                maxLength={40}
                autoComplete="off"
              />
            </div>
          </div>
        </section>

        {/* ── Companion ── */}
        <section className="settings-section" aria-labelledby="settings-companion">
          <h2 className="settings-section__heading" id="settings-companion">Your companion</h2>
          <div className="settings-panel">
            <CompanionProfile
              name={companionName}
              personality={personality}
              communicationStyle={communicationStyle}
              onChangeName={(v) => { setCompanionName(v); setNameError(false); }}
              onChangePersonality={setPersonality}
              onChangeCommunicationStyle={setCommunicationStyle}
              nameError={nameError}
            />
          </div>
        </section>

        {/* ── Appearance ── */}
        <section className="settings-section" aria-labelledby="settings-appearance">
          <h2 className="settings-section__heading" id="settings-appearance">Appearance</h2>
          <div className="settings-panel">
            <ThemeSelector selected={theme} onSelect={setTheme} />
          </div>
        </section>

        {/* ── Save row ── */}
        <div className="settings-save-row">
          {saved && (
            <span className="settings-save-row__confirm" role="status" aria-live="polite">
              ✓ Changes saved
            </span>
          )}
          <button
            className={`settings-save-btn${!dirty || saved ? " settings-save-btn--idle" : ""}${saved ? " settings-save-btn--saved" : ""}`}
            onClick={handleSave}
            disabled={!companionName.trim()}
          >
            {saved ? "✓ Saved" : "Save changes"}
          </button>
        </div>

      </div>
    </div>
  );
}
