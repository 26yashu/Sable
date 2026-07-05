import { useState, useEffect, lazy, Suspense } from "react";
import { getAnonymousSession }  from "./auth/AnonymousSession";
import { getAuthSession }       from "./auth/authSession";
import { getUnreadCount }       from "./lib/notifications";
import { syncAll }              from "./lib/cloudSync";
import ErrorBoundary            from "./components/ErrorBoundary";

// ── Eagerly loaded (critical path) ───────────────────────────────
import OnboardingScreen from "./screens/OnboardingScreen";
import ChatArea         from "./components/ChatArea";
import Sidebar          from "./components/Sidebar";

// ── Auth & Profile (small, always potentially needed) ─────────────
import AuthScreen    from "./screens/AuthScreen";
import ProfileScreen from "./screens/ProfileScreen";

// ── Lazily loaded screens ─────────────────────────────────────────
const JournalScreen       = lazy(() => import("./screens/JournalScreen"));
const MoodScreen          = lazy(() => import("./screens/MoodScreen"));
const InsightsScreen      = lazy(() => import("./screens/InsightsScreen"));
const StoryScreen         = lazy(() => import("./screens/StoryScreen"));
const MemoryScreen        = lazy(() => import("./screens/MemoryScreen"));
const CompanionScreen     = lazy(() => import("./screens/CompanionScreen"));
const RitualsScreen       = lazy(() => import("./screens/RitualsScreen"));
const ComfortScreen       = lazy(() => import("./screens/ComfortScreen"));
const NotificationsScreen = lazy(() => import("./screens/NotificationsScreen"));
const SettingsScreen      = lazy(() => import("./screens/SettingsScreen"));

// ── Theme ─────────────────────────────────────────────────────────
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

// ── Suspense fallback ─────────────────────────────────────────────
function ScreenFallback() {
  return (
    <div className="screen-suspense-fallback" aria-label="Loading" role="status">
      <span className="screen__loading-spinner" aria-hidden="true" />
    </div>
  );
}

function renderPage(page, session, onSessionUpdate, onLogout) {
  switch (page) {
    case "chat":          return <ChatArea session={session} />;
    case "journal":       return <JournalScreen />;
    case "mood":          return <MoodScreen />;
    case "insights":      return <InsightsScreen />;
    case "story":         return <StoryScreen />;
    case "memory":        return <MemoryScreen />;
    case "companion":     return <CompanionScreen session={session} />;
    case "rituals":       return <RitualsScreen />;
    case "comfort":       return <ComfortScreen />;
    case "notifications": return <NotificationsScreen />;
    case "settings":      return <SettingsScreen session={session} onSessionUpdate={onSessionUpdate} />;
    case "profile":       return <ProfileScreen session={session} onLogout={onLogout} />;
    default:              return <ChatArea session={session} />;
  }
}

export default function App() {
  const [session,     setSession]   = useState(null);
  const [ready,       setReady]     = useState(false);
  const [activePage,  setPage]      = useState("chat");
  const [unreadCount, setUnread]    = useState(0);
  // authMode: "anon" | "auth" | null (null = not yet decided — show AuthScreen if no anon session)
  const [authMode,    setAuthMode]  = useState(null);

  useEffect(() => {
    const anonSession = getAnonymousSession();
    const authSession = getAuthSession();

    let savedTheme = "dark";
    try { savedTheme = localStorage.getItem("sable_theme") || "dark"; } catch {}
    applyTheme(savedTheme);
    try { setUnread(getUnreadCount()); } catch {}

    if (authSession) {
      // Authenticated user — build a session object compatible with the rest of the app
      const user = authSession.user || {};
      setSession({
        id:            authSession.user?.id || "",
        displayName:   user.name || localStorage.getItem("sable_display_name") || "",
        companionName: localStorage.getItem("sable_companion_name") || "Sable",
        authenticated: true,
        user,
      });
      setAuthMode("auth");
      // Background sync — non-blocking
      syncAll().catch(() => {});
    } else if (anonSession) {
      setSession({ ...anonSession, authenticated: false });
      setAuthMode("anon");
    } else {
      // No session at all — show auth choice
      setAuthMode("choice");
    }
    setReady(true);
  }, []);

  if (!ready) return null;

  // ── Auth choice (no existing session) ──────────────────────────
  if (authMode === "choice") {
    return (
      <ErrorBoundary>
        <AuthScreen
          onAuth={(user) => {
            // Authenticated via signup/login — sync then enter app
            const s = {
              id:            user.id || "",
              displayName:   user.name || "",
              companionName: localStorage.getItem("sable_companion_name") || "Sable",
              authenticated: true,
              user,
            };
            setSession(s);
            setAuthMode("auth");
            syncAll().catch(() => {});
          }}
          onContinueAnonymous={() => {
            // Route to the onboarding screen without disturbing existing anon flow
            setAuthMode("onboarding");
          }}
        />
      </ErrorBoundary>
    );
  }

  // ── Onboarding (user chose anonymous) ──────────────────────────
  if (authMode === "onboarding") {
    return (
      <ErrorBoundary>
        <OnboardingScreen
          onComplete={(s) => {
            setSession({ ...s, authenticated: false });
            setAuthMode("anon");
          }}
        />
      </ErrorBoundary>
    );
  }

  // ── Existing anonymous session already present ──────────────────
  if (!session) {
    return (
      <ErrorBoundary>
        <OnboardingScreen onComplete={(s) => {
          setSession({ ...s, authenticated: false });
          setAuthMode("anon");
        }} />
      </ErrorBoundary>
    );
  }

  function handleLogout() {
    setSession(null);
    setAuthMode("choice");
    setPage("chat");
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
              {renderPage(activePage, session, setSession, handleLogout)}
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </ErrorBoundary>
  );
}
