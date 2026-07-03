import { useState, useEffect, useRef } from "react";

// activity: "idle" | "typing" | "listening" | "thinking" | "present"
//         | "resting" | "happy" | "supportive"   ← Rituals & Presence phase additions
const STATUS_MAP = {
  idle:        { emoji: "🌙", label: "Quiet",     pulse: false },
  typing:      { emoji: "💭", label: "Thinking…", pulse: true  },
  listening:   { emoji: "🌿", label: "Listening", pulse: true  },
  thinking:    { emoji: "💭", label: "Thinking…", pulse: true  },
  present:     { emoji: "✨", label: "Present",   pulse: true  },
  // New presence states — additive, existing keys above are unchanged
  resting:     { emoji: "🌙", label: "Resting",          pulse: false },
  happy:       { emoji: "😊", label: "Happy you're back", pulse: true  },
  supportive:  { emoji: "🌿", label: "Here for you",      pulse: true  },
};

export default function CompanionStatus({ activity = "idle", companionName }) {
  const [display, setDisplay]   = useState(activity);
  const [fading,  setFading]    = useState(false);
  const prevRef = useRef(activity);
  const timerRef = useRef(null);

  useEffect(() => {
    if (activity === prevRef.current) return;
    // Cross-fade to new status
    setFading(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDisplay(activity);
      setFading(false);
      prevRef.current = activity;
    }, 220);
    return () => clearTimeout(timerRef.current);
  }, [activity]);

  const status = STATUS_MAP[display] ?? STATUS_MAP.idle;

  // Build presence text — "Luna is listening…", "Luna is happy you're back",
  // "Luna is here for you" when a companion name is provided.
  // Some labels (happy/supportive) are already full phrases without "is" baked in
  // differently, so we special-case them rather than mechanically lowercasing.
  function buildPresenceText() {
    if (!companionName) return status.label;
    if (display === "happy")      return `${companionName} is happy you're back`;
    if (display === "supportive") return `${companionName} is here for you`;
    const lower = status.label.replace(/…$/, "").toLowerCase();
    return `${companionName} is ${lower}${status.label.endsWith("…") ? "…" : ""}`;
  }

  const presenceText = buildPresenceText();

  return (
    <div
      className={`companion-status${fading ? " companion-status--fading" : ""}${status.pulse ? " companion-status--pulse" : ""}`}
      aria-live="polite"
      aria-label={presenceText}
      title={presenceText}
    >
      <span className="companion-status__dot" aria-hidden="true" />
      <span className="companion-status__emoji" aria-hidden="true">{status.emoji}</span>
      <span className="companion-status__label">{status.label}</span>
    </div>
  );
}
