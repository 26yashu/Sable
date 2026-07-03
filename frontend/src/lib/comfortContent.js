/**
 * comfortContent.js — static, local-only content for the Comfort Space.
 * No network calls, no AI generation — just gentle, pre-written content.
 */

export const CALMING_QUOTES = [
  "This feeling is real, but it isn't permanent.",
  "You don't have to have it figured out right now.",
  "Slow is still moving forward.",
  "You're allowed to rest before you're done.",
  "Whatever today held, you made it through.",
  "Small breaths count as progress too.",
  "You are not behind. You are exactly where you are.",
  "It's okay to not be okay for a little while.",
  "One gentle moment is enough for now.",
  "You've survived every hard day so far.",
];

export const GROUNDING_PROMPTS = [
  "Name 3 things you can see right now.",
  "Notice 2 things you can physically feel — a surface, the air, your clothes.",
  "Listen for 1 sound nearby. Just notice it, nothing more.",
  "Feel your feet on the floor. Press down gently.",
  "Take one breath slower than the last.",
  "Unclench your jaw. Drop your shoulders.",
  "Hold something nearby — notice its texture and weight.",
  "Say your name quietly, out loud or in your head.",
  "Look around and find one thing that's a calm color.",
  "Place a hand on your chest and feel it rise and fall.",
];

/** Returns a random item from an array, avoiding immediate repeats when possible. */
export function pickRandom(arr, avoid = null) {
  if (arr.length <= 1) return arr[0];
  let choice;
  do {
    choice = arr[Math.floor(Math.random() * arr.length)];
  } while (choice === avoid);
  return choice;
}
