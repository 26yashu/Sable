import { useState, useRef, useEffect } from "react";

export default function ChatInput({ onSend, onTyping, disabled }) {
  const [value, setValue] = useState("");
  const textareaRef = useRef(null);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }, [value]);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    onTyping?.(false);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  function handleChange(e) {
    setValue(e.target.value);
    onTyping?.(e.target.value.trim().length > 0);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="chat-input">
      <textarea
        ref={textareaRef}
        className="chat-input__textarea"
        placeholder="Share what's on your mind…"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        rows={1}
        aria-label="Message"
      />
      <button
        className="chat-input__send"
        onClick={submit}
        disabled={!value.trim() || disabled}
        aria-label="Send message"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M2 9h14M9 2l7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
}
