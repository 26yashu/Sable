import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import MessageBubble        from "./MessageBubble";
import ChatInput            from "./ChatInput";
import TypingIndicator      from "./TypingIndicator";
import CompanionStatus      from "./CompanionStatus";
import DailyReflectionCard  from "./DailyReflectionCard";
import WelcomeMoments       from "./WelcomeMoments";
import { getCompanionReply } from "./companionReplies";
import { sendMessage }       from "../lib/api";
import { loadCompanionProfile } from "../lib/chatPayload";
import { extractAndStoreMemories } from "../lib/memory";
import { getCurrentStreaks } from "../lib/streaks";
import { recomputeEvolution, checkAndUnlockMilestones } from "../lib/companionEvolution";

const STORAGE_KEY = "sable_messages";
const IDLE_DELAY  = 8000;

function loadMessages() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}

function saveMessages(msgs) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs)); } catch {}
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5)  return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

export default function ChatArea({ session }) {
  const [messages,  setMessages]  = useState(() => loadMessages());
  const [isTyping,  setIsTyping]  = useState(false);
  const [activity,  setActivity]  = useState("idle");
  const [syncError, setSyncError] = useState(null);

  const messageEnd = useRef(null);
  const idleTimer  = useRef(null);

  const greeting      = useMemo(() => getGreeting(), []);
  const displayName   = session.displayName || "friend";
  const companionName = session.companionName;

  // Auto-scroll
  useEffect(() => {
    messageEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isTyping]);

  // ── Mount-time activity initialisation ──────────────────────────
  // Precedence: "happy" (active streak + first visit today) wins
  // briefly, then settles into "present" (has history) or "idle".
  // Read-only with respect to streak/message data — never writes.
  useEffect(() => {
    const sentToday = messages.some(
      (m) => m.role === "user" && new Date(m.ts).toDateString() === new Date().toDateString()
    );

    const streaks = getCurrentStreaks();
    const hasActiveStreak = streaks.journal >= 2 || streaks.checkIn >= 2 || streaks.conversation >= 2;

    if (!sentToday && hasActiveStreak) {
      setActivity("happy");
      const t = setTimeout(() => {
        setActivity(messages.length > 0 ? "present" : "idle");
      }, 3200);
      return () => clearTimeout(t);
    }

    if (messages.length > 0) setActivity("present");
    return () => clearTimeout(idleTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setActivityFor = useCallback((state, hasMessages) => {
    setActivity(state);
    clearTimeout(idleTimer.current);
    if (state !== "idle") {
      idleTimer.current = setTimeout(() => {
        setActivity(hasMessages ? "present" : "idle");
      }, IDLE_DELAY);
    }
  }, []);

  function handleUserTyping(hasText) {
    setSyncError(null);
    if (hasText) setActivityFor("typing",  messages.length > 0);
    else         setActivity(messages.length > 0 ? "present" : "idle");
  }

  async function handleSend(text) {
    // ── 1. Optimistic user bubble ──────────────────────────────
    const userMsg = {
      id:   crypto.randomUUID(),
      role: "user",
      text,
      ts:   new Date().toISOString(),
    };
    const withUser = [...messages, userMsg];
    setMessages(withUser);
    saveMessages(withUser);
    setIsTyping(true);
    setActivityFor("thinking", true);
    setSyncError(null);

    // ── 1b. Automatic memory extraction (local only, before sending) ──
    // Scans the user's own message for safe, short patterns like
    // "I like...", "I want...", "I'm worried about...", "My goal is...".
    // Stores at most 10 memories total, deduplicated, never sensitive content.
    extractAndStoreMemories(text);

    // ── 2. Load companion profile (personality + communicationStyle) ──
    // loadCompanionProfile() reads sable_companion_profile from localStorage.
    // It also triggers buildMoodContext() inside buildChatPayload() in api.js,
    // which reads sable_moods + sable_journal_entries and returns labels only.
    const profile = loadCompanionProfile();

    const result = await sendMessage({
      companionName,
      personality:        profile.personality        || "gentle",
      communicationStyle: profile.communicationStyle || "warm and calm",
      text,
      messageHistory: withUser,   // privacy-filtered inside chatPayload.js
    });

    // ── 3. Use AI reply or fall back to local personality engine ──
    const replyText = result.source === "backend" && result.reply
      ? result.reply
      : getCompanionReply(text);

    if (result.source === "local" && result.error) {
      setSyncError("Offline — using local replies");
    }

    // ── 4. Render companion reply ──────────────────────────────
    const companionMsg = {
      id:   crypto.randomUUID(),
      role: "companion",
      text: replyText,
      ts:   new Date().toISOString(),
    };
    const withReply = [...withUser, companionMsg];
    setMessages(withReply);
    saveMessages(withReply);
    setIsTyping(false);
    setActivityFor("listening", true);

    // ── 5. Recompute evolution levels and check milestones (read-only side-effect) ──
    // Runs after every message exchange. Lightweight — all deterministic
    // localStorage reads + bounded writes. Never blocks UI.
    try {
      recomputeEvolution();
      checkAndUnlockMilestones();
    } catch {
      // Evolution is non-critical — never surface errors to the user
    }
  }

  const isActive = activity === "listening" || activity === "thinking";
  const isEmpty  = messages.length === 0;

  return (
    <div className="chat" role="main">
      {/* ── Header ── */}
      <header className="chat__header">
        <div className="chat__header-inner">
          {/* Companion avatar with orbital pulse ring */}
          <div className={`chat__avatar-wrap${isActive ? " active" : ""}`}>
            <div className="chat__avatar" aria-hidden="true">✦</div>
            <div className="chat__avatar-ring" aria-hidden="true" />
            <div className="chat__avatar-ping"  aria-hidden="true" />
          </div>
          <div className="chat__header-text">
            <p className="chat__greeting">
              {greeting}, <span className="chat__username">{displayName}</span> 🌿
            </p>
            <p className="chat__presence">
              <span className="chat__companion-name">{companionName}</span> is here for you.
              {syncError && (
                <span className="chat__sync-badge" aria-live="polite" role="status" title={syncError}>
                  ↻ local
                </span>
              )}
            </p>
          </div>
          <CompanionStatus activity={activity} companionName={companionName} />
        </div>
      </header>

      {/* ── Messages ── */}
      <div
        className="chat__messages"
        role="log"
        aria-live="polite"
        aria-label="Conversation"
        aria-relevant="additions"
      >
        {isEmpty ? (
          <div className="chat__empty-panel">
            <WelcomeMoments />
            <DailyReflectionCard />
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}

        {isTyping && <TypingIndicator companionName={companionName} />}
        <div ref={messageEnd} aria-hidden="true" style={{ height: 1, flexShrink: 0 }} />
      </div>

      {/* ── Input ── */}
      <footer className="chat__footer" role="contentinfo">
        <ChatInput
          onSend={handleSend}
          onTyping={handleUserTyping}
          disabled={isTyping}
        />
      </footer>
    </div>
  );
}
