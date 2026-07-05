import { memo } from "react";
import s from "./Sidebar.module.css";

const NAV_ITEMS = [
  {
    id: "chat",
    label: "Chat",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M3 5a2 2 0 012-2h10a2 2 0 012 2v7a2 2 0 01-2 2H7l-4 3V5z"
          stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "journal",
    label: "Journal",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="4" y="2" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 7h6M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "mood",
    label: "Mood",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7.5 11.5c.5 1 1.5 1.5 2.5 1.5s2-.5 2.5-1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="7.5" cy="8.5" r="0.85" fill="currentColor" />
        <circle cx="12.5" cy="8.5" r="0.85" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "insights",
    label: "Insights",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M3 14h2.5v-4H3v4zM8.75 14h2.5V6h-2.5v8zM14.5 14H17V9h-2.5v5z"
          stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "story",
    label: "Story",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 2.5c1.5 2 4 2 4 5.5s-2.5 3.5-4 9.5c-1.5-6-4-6-4-9.5s2.5-3.5 4-5.5z"
          stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "memory",
    label: "Memory",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 17s-6-3.8-6-8.2C4 6 5.8 4 8 4c1 0 2 .5 2 1.5C10 4.5 11 4 12 4c2.2 0 4 2 4 4.8 0 4.4-6 8.2-6 8.2z"
          stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <circle cx="10" cy="9.5" r="1.2" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "companion",
    label: "Bond",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" strokeDasharray="2 2" />
        <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.2" strokeDasharray="1.5 3" />
      </svg>
    ),
  },
  {
    id: "rituals",
    label: "Ritual",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.4" />
        <path d="M10 6v4l2.5 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "comfort",
    label: "Comfort",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 3a6 6 0 100 12 6 6 0 01-6-6 6 6 0 016-6z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "notifications",
    label: "Updates",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 2a6 6 0 00-6 6c0 3.5-1.5 5-1.5 5h15s-1.5-1.5-1.5-5a6 6 0 00-6-6z"
          stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M11.73 16a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "settings",
    label: "Settings",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 3v1.5M10 15.5V17M3 10h1.5M15.5 10H17M4.93 4.93l1.06 1.06M14.01 14.01l1.06 1.06M15.07 4.93l-1.06 1.06M5.99 14.01l-1.06 1.06"
          stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
];

const NavButton = memo(function NavButton({ item, isActive, onClick, badge }) {
  return (
    <button
      className={`${s.navItem}${isActive ? ` ${s.active}` : ""}`}
      onClick={() => onClick(item.id)}
      aria-label={badge ? `${item.label}, ${badge} unread` : item.label}
      aria-current={isActive ? "page" : undefined}
      title={item.label}
    >
      <span className={s.navIcon}>
        {item.icon}
        {badge > 0 && (
          <span className={s.navBadge} aria-hidden="true">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </span>
      <span className={s.navLabel}>{item.label}</span>
    </button>
  );
});

const Sidebar = memo(function Sidebar({ activePage, onNavigate, session, unreadCount = 0 }) {
  const isAuth   = session?.authenticated;
  const initials = (session?.displayName || session?.companionName || "?")
    .trim().charAt(0).toUpperCase();

  return (
    <aside className={s.sidebar} aria-label="Main navigation">
      <div className={s.logo} aria-hidden="true">✦</div>

      <nav className={s.nav} aria-label="Pages">
        {NAV_ITEMS.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            isActive={activePage === item.id}
            onClick={onNavigate}
            badge={item.id === "notifications" ? unreadCount : 0}
          />
        ))}
      </nav>

      <div className={s.bottom}>
        <button
          className={`${s.userDot}${isAuth ? ` ${s.userDotAuth}` : ""}`}
          title={isAuth ? `${session?.user?.name || "Account"} — signed in` : "Anonymous"}
          onClick={() => onNavigate("profile")}
          aria-label="Open profile"
          aria-current={activePage === "profile" ? "page" : undefined}
        >
          {initials}
          {isAuth && <span className={s.authDot} aria-hidden="true" />}
        </button>
      </div>
    </aside>
  );
});

export default Sidebar;
