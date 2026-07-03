import { useState, useEffect, useCallback, useMemo } from "react";
import {
  buildNotifications,
  markNotificationRead,
  markAllRead,
} from "../lib/notifications";
import {
  getReminders,
  toggleReminder,
  updateReminderTime,
  formatReminderTime,
} from "../lib/reminders";

// ── Notification card ─────────────────────────────────────────────
function NotificationItem({ notification, onRead }) {
  function handleClick() {
    if (!notification.read) onRead(notification.id);
  }

  return (
    <div
      className={`notif-item${notification.read ? " notif-item--read" : ""}`}
      role="article"
      onClick={handleClick}
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      aria-label={`${notification.title}: ${notification.body}${notification.read ? ", read" : ", unread"}`}
    >
      <div className="notif-item__icon-wrap">
        <span className="notif-item__icon" aria-hidden="true">{notification.icon}</span>
        {!notification.read && <span className="notif-item__dot" aria-hidden="true" />}
      </div>
      <div className="notif-item__body">
        <div className="notif-item__type">{notification.type}</div>
        <p className="notif-item__title">{notification.title}</p>
        <p className="notif-item__text">{notification.body}</p>
      </div>
    </div>
  );
}

// ── Reminder row ──────────────────────────────────────────────────
function ReminderRow({ reminder, onToggle, onTimeChange }) {
  const [editingTime, setEditingTime] = useState(false);
  const [timeValue, setTimeValue]     = useState(reminder.time);

  function handleTimeBlur() {
    setEditingTime(false);
    if (timeValue !== reminder.time) onTimeChange(reminder.id, timeValue);
  }

  return (
    <div className={`reminder-row${reminder.enabled ? "" : " reminder-row--disabled"}`}>
      <div className="reminder-row__info">
        <p className="reminder-row__title">{reminder.title}</p>
        <p className="reminder-row__desc">{reminder.description}</p>
        <div className="reminder-row__time-wrap">
          {editingTime ? (
            <input
              type="time"
              className="reminder-row__time-input"
              value={timeValue}
              onChange={(e) => setTimeValue(e.target.value)}
              onBlur={handleTimeBlur}
              onKeyDown={(e) => e.key === "Enter" && handleTimeBlur()}
              autoFocus
              aria-label={`Set time for ${reminder.title}`}
            />
          ) : (
            <button
              className="reminder-row__time-btn"
              onClick={() => setEditingTime(true)}
              aria-label={`Change time for ${reminder.title}, currently ${formatReminderTime(reminder.time)}`}
            >
              🕐 {formatReminderTime(reminder.time)}
            </button>
          )}
        </div>
      </div>
      <button
        className={`reminder-toggle${reminder.enabled ? " reminder-toggle--on" : ""}`}
        onClick={() => onToggle(reminder.id)}
        role="switch"
        aria-checked={reminder.enabled}
        aria-label={`${reminder.enabled ? "Disable" : "Enable"} ${reminder.title}`}
      >
        <span className="reminder-toggle__thumb" />
      </button>
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────
export default function NotificationsScreen() {
  const [loading,       setLoading]       = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [reminders,     setReminders]     = useState(() => getReminders());
  const [tab,           setTab]           = useState("notifications"); // "notifications" | "reminders"

  useEffect(() => {
    const t = setTimeout(() => {
      setNotifications(buildNotifications());
      setLoading(false);
    }, 360);
    return () => clearTimeout(t);
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const handleRead = useCallback((id) => {
    markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  const handleMarkAllRead = useCallback(() => {
    markAllRead(notifications);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [notifications]);

  const handleToggleReminder = useCallback((id) => {
    setReminders(toggleReminder(id));
  }, []);

  const handleTimeChange = useCallback((id, time) => {
    setReminders(updateReminderTime(id, time));
  }, []);

  return (
    <div className="screen notif-screen">
      <header className="screen__header">
        <div className="screen__header-inner">
          <div className="screen__eyebrow">Notification Centre</div>
          <div className="notif-header-row">
            <h1 className="screen__title">
              Updates & reminders
              {unreadCount > 0 && (
                <span className="notif-badge notif-badge--header" aria-label={`${unreadCount} unread`}>
                  {unreadCount}
                </span>
              )}
            </h1>
            {unreadCount > 0 && !loading && (
              <button className="notif-mark-all" onClick={handleMarkAllRead}>
                Mark all read
              </button>
            )}
          </div>
          <p className="screen__sub">
            Your companion's messages and gentle check-in reminders.
          </p>
        </div>
      </header>

      {/* ── Tabs ── */}
      <div className="notif-tabs" role="tablist">
        <button
          className={`notif-tab${tab === "notifications" ? " notif-tab--active" : ""}`}
          role="tab"
          aria-selected={tab === "notifications"}
          onClick={() => setTab("notifications")}
        >
          Messages
          {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
        </button>
        <button
          className={`notif-tab${tab === "reminders" ? " notif-tab--active" : ""}`}
          role="tab"
          aria-selected={tab === "reminders"}
          onClick={() => setTab("reminders")}
        >
          Reminders
        </button>
      </div>

      <div className="screen__body">
        {loading ? (
          <div className="screen__loading">
            <span className="screen__loading-spinner" />
            Building your notifications…
          </div>
        ) : tab === "notifications" ? (
          notifications.length === 0 ? (
            <div className="screen__empty-state" role="status">
              <span className="screen__empty-icon" aria-hidden="true">🌙</span>
              <p className="screen__empty-heading">All quiet here.</p>
              <p className="screen__empty-sub">
                Your companion's messages and streak milestones will appear here.
              </p>
            </div>
          ) : (
            <div className="notif-list" role="list" aria-label="Notifications">
              {notifications.map((n) => (
                <NotificationItem key={n.id} notification={n} onRead={handleRead} />
              ))}
            </div>
          )
        ) : (
          /* ── Reminders tab ── */
          <div className="reminders-list" role="list" aria-label="Reminders">
            {reminders.map((r) => (
              <ReminderRow
                key={r.id}
                reminder={r}
                onToggle={handleToggleReminder}
                onTimeChange={handleTimeChange}
              />
            ))}
            <p className="reminders-list__note">
              These reminders appear in this screen when the app is open near the scheduled time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
