import { useState, useEffect, useRef } from "react";

// Simple box-breathing pattern: inhale 4s, hold 4s, exhale 4s, hold 4s
const PHASES = [
  { id: "inhale", label: "Breathe in",  duration: 4000 },
  { id: "hold1",  label: "Hold",        duration: 4000 },
  { id: "exhale", label: "Breathe out", duration: 4000 },
  { id: "hold2",  label: "Hold",        duration: 4000 },
];

export default function BreathingExercise() {
  const [running, setRunning]   = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [cycles, setCycles]     = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!running) return;

    const current = PHASES[phaseIdx];
    timerRef.current = setTimeout(() => {
      const next = (phaseIdx + 1) % PHASES.length;
      setPhaseIdx(next);
      if (next === 0) setCycles((c) => c + 1);
    }, current.duration);

    return () => clearTimeout(timerRef.current);
  }, [running, phaseIdx]);

  function handleToggle() {
    if (running) {
      setRunning(false);
      clearTimeout(timerRef.current);
    } else {
      setPhaseIdx(0);
      setCycles(0);
      setRunning(true);
    }
  }

  const phase = PHASES[phaseIdx];

  return (
    <div className="breathing-exercise" role="region" aria-label="Breathing exercise">
      <div
        className={`breathing-circle${running ? ` breathing-circle--${phase.id}` : ""}`}
        aria-hidden="true"
      >
        <span className="breathing-circle__inner" />
      </div>

      <p className="breathing-exercise__phase" role="status" aria-live="polite">
        {running ? phase.label : "Ready when you are"}
      </p>

      {running && cycles > 0 && (
        <p className="breathing-exercise__cycles">
          {cycles} {cycles === 1 ? "cycle" : "cycles"} complete
        </p>
      )}

      <button
        className="breathing-exercise__toggle"
        onClick={handleToggle}
        aria-label={running ? "Stop breathing exercise" : "Start breathing exercise"}
      >
        {running ? "Stop" : "Begin breathing"}
      </button>
    </div>
  );
}
