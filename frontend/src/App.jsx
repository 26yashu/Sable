import { useState, useEffect } from "react";
import { getAnonymousSession }  from "./auth/AnonymousSession";
import { getUnreadCount }       from "./lib/notifications";
import OnboardingScreen         from "./screens/OnboardingScreen";
import JournalScreen            from "./screens/JournalScreen";
import MoodScreen               from "./screens/MoodScreen";
import InsightsScreen           from "./screens/InsightsScreen";
import StoryScreen              from "./screens/StoryScreen";
import MemoryScreen             from "./screens/MemoryScreen";
import RitualsScreen            from "./screens/RitualsScreen";
import ComfortScreen            from "./screens/ComfortScreen";
import NotificationsScreen      from "./screens/NotificationsScreen";
import SettingsScreen           from "./screens/SettingsScreen";
import Sidebar                  from "./components/Sidebar";
import ChatArea                 from "./components/ChatArea";

// ── Apply theme tokens to :root immediately (called on boot + settings save)
export function applyTheme(t) {
  const r = document.documentElement;
  if (t === "forest") {
    r.style.setProperty("--ink",        "#0d1a14");
    r.style.setProperty("--surface",    "#111e18");
    r.style.setProperty("--panel",      "#16261e");
    r.style.setProperty("--rim",        "#1f3828");
    r.style.setProperty("--muted",      "#3d6050");
    r.style.setProperty("--subtle",     "#6a9a80");
    r.style.setProperty("--body",       "#a8c8b8");
    r.style.setProperty("--bright",     "#d8ede4");
    r.style.setProperty("--accent",     "#6dd4ae");
    r.style.setProperty("--accent-dim", "#45a07a");
  } else {
    r.style.setProperty("--ink",        "#0f1211");
    r.style.setProperty("--surface",    "#141918");
    r.style.setProperty("--panel",      "#1b2220");
    r.style.setProperty("--rim",        "#263230");
    r.style.setProperty("--muted",      "#4a5e59");
    r.style.setProperty("--subtle",     "#7a9490");
    r.style.setProperty("--body",       "#b8cbc7");
    r.style.setProperty("--bright",     "#e4edeb");
    r.style.setProperty("--accent",     "#5ec4a0");
    r.style.setProperty("--accent-dim", "#3a8f74");
  }
}

function renderPage(page, session, onSessionUpdate) {
  switch (page) {
    case "chat":          return <ChatArea session={session} />;
    case "journal":       return <JournalScreen />;
    case "mood":          return <MoodScreen />;
    case "insights":      return <InsightsScreen />;
    case "story":         return <StoryScreen />;
    case "memory":        return <MemoryScreen />;
    case "rituals":       return <RitualsScreen />;
    case "comfort":       return <ComfortScreen />;
    case "notifications": return <NotificationsScreen />;
    case "settings":      return <SettingsScreen session={session} onSessionUpdate={onSessionUpdate} />;
    default:              return <ChatArea session={session} />;
  }
}

export default function App() {
  const [session, setSession]       = useState(null);
  const [ready, setReady]           = useState(false);
  const [activePage, setPage]       = useState("chat");
  const [unreadCount, setUnread]    = useState(0);

  useEffect(() => {
    const existing = getAnonymousSession();
    if (existing) setSession(existing);
    let savedTheme = "dark";
    try { savedTheme = localStorage.getItem("sable_theme") || "dark"; } catch {}
    applyTheme(savedTheme);
    // Compute unread badge count once on boot (read-only)
    try { setUnread(getUnreadCount()); } catch {}
    setReady(true);
  }, []);

  if (!ready) return null;
  if (!session) return <OnboardingScreen onComplete={(s) => setSession(s)} />;

  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        onNavigate={(page) => {
          setPage(page);
          // Clear badge when user navigates to notifications
          if (page === "notifications") setUnread(0);
        }}
        session={session}
        unreadCount={unreadCount}
      />
      <div className="app-content">
        {renderPage(activePage, session, setSession)}
      </div>
    </div>
  );
}
