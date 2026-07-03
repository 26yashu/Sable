import { useState, useEffect, useRef } from "react";

const MOMENTS = [
  "You're safe here.",
  "Small steps still count.",
  "You don't have to carry everything alone.",
  "It's okay to just exist right now.",
  "Your feelings are allowed.",
  "Rest is part of the work.",
  "You showed up. That matters.",
  "This moment belongs to you.",
  "Gentleness is strength.",
  "You are more than your hardest days.",
  "Whatever you're carrying — you can set it down here.",
  "Being here is enough.",
];

const ROTATE_MS = 5000;
const FADE_MS   = 600;

export default function WelcomeMoments() {
  const [index,   setIndex]   = useState(() => Math.floor(Math.random() * MOMENTS.length));
  const [visible, setVisible] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      // Fade out
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % MOMENTS.length);
        setVisible(true);
      }, FADE_MS);
    }, ROTATE_MS);
    return () => clearInterval(timerRef.current);
  }, []);

  return (
    <div className="welcome-moments" aria-live="polite" aria-atomic="true">
      <p className={`welcome-moments__text${visible ? " welcome-moments__text--visible" : ""}`}>
        {MOMENTS[index]}
      </p>
    </div>
  );
}
