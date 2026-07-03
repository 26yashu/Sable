/**
 * monthlyStoryCache.js — caching layer for generated monthly stories.
 *
 * Stories are cached under localStorage keys like:
 *   monthly_story_2026-06
 *
 * Cached shape:
 * {
 *   month:             "June 2026",
 *   monthKey:          "2026-06",
 *   title:             string,
 *   narrative:         string,
 *   dominantMood:      string|null,
 *   themes:            string[],
 *   journalCount:      number,
 *   conversationCount: number,
 *   growthReflection:  string,
 *   encouragement:     string,
 *   generatedAt:       ISO string,
 *   source:            "backend" | "local",
 * }
 *
 * A story is regenerated automatically only once per calendar month.
 * The user can force a fresh generation via the Regenerate button,
 * which simply overwrites the cache entry for the current month.
 */

function getMonthKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function cacheKeyFor(monthKey) {
  return `monthly_story_${monthKey}`;
}

/** Reads the cached story for the given month key, or null if none exists. */
export function getCachedStory(monthKey = getMonthKey()) {
  try {
    const raw = localStorage.getItem(cacheKeyFor(monthKey));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Writes a story into the cache for the given month key. */
export function setCachedStory(story, monthKey = getMonthKey()) {
  try {
    localStorage.setItem(cacheKeyFor(monthKey), JSON.stringify(story));
  } catch {
    // localStorage full or unavailable — fail silently, story still renders this session
  }
}

/** Clears the cached story for the current month (used by Regenerate). */
export function clearCachedStory(monthKey = getMonthKey()) {
  try {
    localStorage.removeItem(cacheKeyFor(monthKey));
  } catch {}
}

export { getMonthKey };
