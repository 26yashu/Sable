const KEYS = {
  ANON_ID: "sable_anon_id",
  DISPLAY_NAME: "sable_display_name",
  COMPANION_NAME: "sable_companion_name",
  ONBOARDED: "sable_onboarded",
};

export function createAnonymousSession({ displayName = "", companionName }) {
  const id = crypto.randomUUID();
  localStorage.setItem(KEYS.ANON_ID, id);
  localStorage.setItem(KEYS.DISPLAY_NAME, displayName.trim());
  localStorage.setItem(KEYS.COMPANION_NAME, companionName.trim());
  localStorage.setItem(KEYS.ONBOARDED, "true");
  return { id, displayName: displayName.trim(), companionName: companionName.trim() };
}

export function getAnonymousSession() {
  const onboarded = localStorage.getItem(KEYS.ONBOARDED);
  if (!onboarded) return null;
  return {
    id: localStorage.getItem(KEYS.ANON_ID),
    displayName: localStorage.getItem(KEYS.DISPLAY_NAME) || "",
    companionName: localStorage.getItem(KEYS.COMPANION_NAME) || "",
  };
}
