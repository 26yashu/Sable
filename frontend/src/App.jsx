import { useState, useEffect, lazy, Suspense } from "react";
import { getAnonymousSession }  from "./auth/AnonymousSession";
import { getUnreadCount }       from "./lib/notifications";
import ErrorBoundary            from "./components/ErrorBoundary";

// ── Eagerly loaded (critical path — always needed immediately) ──
import OnboardingScreen from "./screens/OnboardingScreen";
import ChatArea         from "./components/ChatArea";
import Sidebar          from "./components/Sidebar";

// ── Lazily loaded (non-critical — only fetched when navigated to) ──
const JournalScreen       = lazy(() => import("./screens/JournalScreen"));
const MoodScreen          = lazy(() => import("./screens/MoodScreen"));
const InsightsScreen      = lazy(() => import("./screens/InsightsScreen"));
const StoryScreen         = lazy(() => import("./screens/StoryScreen"));
const MemoryScreen        = lazy(() => import("./screens/MemoryScreen"));
const RitualsScreen       = lazy(() => import("./screens/RitualsScreen"));
const ComfortScreen       = lazy(() => import("./screens/ComfortScreen"));
const NotificationsScreen = lazy(() => import("./screens/NotificationsScreen"));
const SettingsScreen      = lazy(() => import("./screens/SettingsScreen"));

// ── Apply theme tokens to :root (called on boot + settings save) ──
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

// ── Suspense fallback — uses existing skeleton CSS, no new classes ──
function ScreenFallback() {
  return (
    <div className="screen-suspense-fallback" aria-label="Loading" role="status">
      <span className="screen__loading-spinner" aria-hidden="true" />
    </div>
  );
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
  const [session,     setSession] = useState(null);
  const [ready,       setReady]   = useState(false);
  const [activePage,  setPage]    = useState("chat");
  const [unreadCount, setUnread]  = useState(0);

  useEffect(() => {
    const existing = getAnonymousSession();
    if (existing) setSession(existing);
    let savedTheme = "dark";
    try { savedTheme = localStorage.getItem("sable_theme") || "dark"; } catch {}
    applyTheme(savedTheme);
    try { setUnread(getUnreadCount()); } catch {}
    setReady(true);
  }, []);

  if (!ready) return null;
  if (!session) {
    return (
      <ErrorBoundary>
        <OnboardingScreen onComplete={(s) => setSession(s)} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="app-shell">
        <Sidebar
          activePage={activePage}
          onNavigate={(page) => {
            setPage(page);
            if (page === "notifications") setUnread(0);
          }}
          session={session}
          unreadCount={unreadCount}
        />
        <div className="app-content">
          <ErrorBoundary>
            <Suspense fallback={<ScreenFallback />}>
              {renderPage(activePage, session, setSession)}
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </ErrorBoundary>
  );
}
