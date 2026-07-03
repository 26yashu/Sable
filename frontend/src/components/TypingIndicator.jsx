export default function TypingIndicator({ companionName }) {
  return (
    <div
      className="typing-wrapper bubble-row bubble-row--companion"
      role="status"
      aria-label={`${companionName} is thinking`}
    >
      <div className="typing-avatar bubble-avatar" aria-hidden="true">✦</div>
      <div className="typing-pill">
        <span className="typing-label">{companionName} is thinking…</span>
        <div className="typing-dots" aria-hidden="true">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
      </div>
    </div>
  );
}
