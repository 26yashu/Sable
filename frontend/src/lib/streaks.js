// frontend/src/lib/streaks.js

const LS_MESSAGES = "sable_messages";
const LS_JOURNAL = "sable_journal_entries";

export const STREAK_CATEGORIES = {
  CHAT: "chat",
  JOURNAL: "journal",
};

function safeGet(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

export function getCurrentStreaks() {
  const messages = safeGet(LS_MESSAGES);
  const journals = safeGet(LS_JOURNAL);

  return {
    chat: messages.length,
    journal: journals.length,
  };
}

export function syncStreaks() {
  return getCurrentStreaks();
}

export function getMilestone(category, count) {
  if (count >= 30) {
    return {
      title: "30 Day Streak 🔥",
      category,
    };
  }

  if (count >= 7) {
    return {
      title: "7 Day Streak 🌱",
      category,
    };
  }

  return null;
}