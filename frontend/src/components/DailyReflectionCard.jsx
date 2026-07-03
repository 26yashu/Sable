import { useState, useEffect } from "react";

const STORAGE_KEY = "sable_daily_reflection";

const PROMPTS = [
  "What felt lighter today?",
  "What's one small win from today?",
  "What do you wish you heard today?",
  "What moment today felt most like you?",
  "What are you ready to let go of tonight?",
  "What surprised you today — even gently?",
  "What did your body need today that you gave it?",
  "If today had a colour, what would it be?",
  "What's one thing you'd tell yourself from this morning?",
  "Who or what held you up today?",
  "What felt hard today that you did anyway?",
  "What's still sitting with you right now?",
  "What are you grateful for, even if it's small?",
  "What did you learn about yourself today?",
  "What does rest mean to you tonight?",
  "What do you need most right now?",
  "What's one thing that went better than expected?",
  "What emotion visited you most today?",
  "What would feel kind to do for yourself right now?",
  "What are you carrying that isn't yours to carry?",
];

function getTodayKey() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function loadOrAssignPrompt() {
  const today = getTodayKey();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved.date === today) return saved.prompt;
    }
  } catch {}
  // Assign a new prompt for today
  const prompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, prompt }));
  } catch {}
  return prompt;
}

export default function DailyReflectionCard() {
  const [prompt, setPrompt]   = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setPrompt(loadOrAssignPrompt());
    // Slight delay so fade-in feels intentional
    const t = setTimeout(() => setVisible(true), 120);
    return () => clearTimeout(t);
  }, []);

  if (!prompt) return null;

  return (
    <div className={`reflection-card${visible ? " reflection-card--visible" : ""}`} role="complementary" aria-label="Daily reflection prompt">
      <div className="reflection-card__eyebrow">
        <span className="reflection-card__dot" aria-hidden="true">✦</span>
        Today's reflection
      </div>
      <p className="reflection-card__prompt">"{prompt}"</p>
      <p className="reflection-card__nudge">Take a breath. No right answer.</p>
    </div>
  );
}
