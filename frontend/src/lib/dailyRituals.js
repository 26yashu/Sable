// frontend/src/lib/dailyRituals.js

const DAILY_KEY = "sable_daily_rituals";

function safeGet() {
  try {
    return JSON.parse(localStorage.getItem(DAILY_KEY) || "[]");
  } catch {
    return [];
  }
}

function safeSet(data) {
  localStorage.setItem(DAILY_KEY, JSON.stringify(data));
}

export function getTodayRitual() {
  const today = new Date().toISOString().slice(0, 10);

  const rituals = safeGet();

  let ritual = rituals.find(r => r.date === today);

  if (!ritual) {
    ritual = {
      id: crypto.randomUUID(),
      date: today,
      mood: "",
      reflection: "",
      completed: false
    };

    rituals.push(ritual);
    safeSet(rituals);
  }

  return ritual;
}

export function saveTodayRitual(data) {
  const rituals = safeGet();

  const updated = rituals.map(r =>
    r.date === data.date ? data : r
  );

  safeSet(updated);

  return data;
}

export function getAllRituals() {
  return safeGet();
}