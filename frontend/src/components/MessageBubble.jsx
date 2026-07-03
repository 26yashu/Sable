import { memo } from "react";

const MessageBubble = memo(function MessageBubble({ message }) {
  const isUser = message.role === "user";

  return (
    <div
      className={`bubble-row bubble-row--${isUser ? "user" : "companion"}`}
      role="article"
      aria-label={isUser ? "Your message" : "Companion message"}
    >
      {!isUser && (
        <div className="bubble-avatar" aria-hidden="true">✦</div>
      )}
      <div className={`bubble bubble--${isUser ? "user" : "companion"}`}>
        <p className="bubble__text">{message.text}</p>
        <time
          className="bubble__time"
          dateTime={message.ts}
          aria-label={new Date(message.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        >
          {new Date(message.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </time>
      </div>
    </div>
  );
});

export default MessageBubble;
