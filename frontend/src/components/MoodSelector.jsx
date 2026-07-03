const MOODS = [
  { id: "happy",      emoji: "😊", label: "Happy"      },
  { id: "sad",        emoji: "😔", label: "Sad"        },
  { id: "anxious",    emoji: "😰", label: "Anxious"    },
  { id: "tired",      emoji: "😴", label: "Tired"      },
  { id: "calm",       emoji: "😌", label: "Calm"       },
  { id: "frustrated", emoji: "😡", label: "Frustrated" },
];

export default function MoodSelector({ selected, onSelect }) {
  return (
    <div className="mood-grid" role="group" aria-label="Select your mood">
      {MOODS.map((m) => (
        <button
          key={m.id}
          className={`mood-btn${selected === m.id ? " mood-btn--active" : ""}`}
          onClick={() => onSelect(m.id)}
          aria-pressed={selected === m.id}
          title={m.label}
        >
          <span className="mood-btn__emoji" aria-hidden="true">{m.emoji}</span>
          <span className="mood-btn__label">{m.label}</span>
        </button>
      ))}
    </div>
  );
}

export { MOODS };
