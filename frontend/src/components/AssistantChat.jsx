import { useEffect, useRef, useState } from "react";

import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../services/api.js";

const QUICK_PROMPTS = [
  "Navigate to the nearest fuel station",
  "Find a nearby hospital",
  "Where am I?",
  "Move the robot forward",
  "Help, I'm lost",
];

export default function AssistantChat({ location, onResult }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef(null);
  const locationRef = useRef(location);
  const onResultRef = useRef(onResult);

  useEffect(() => {
    locationRef.current = location;
    onResultRef.current = onResult;
  }, [location, onResult]);

  useEffect(() => {
    let cancelled = false;
    api.ai
      .history()
      .then(({ messages: history }) => {
        if (cancelled || !history?.length) return;
        const converted = history
          .slice()
          .reverse()
          .map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.content }));
        setMessages((current) => (current.length ? current : converted));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, busy]);

  async function send(text) {
    const trimmed = (text ?? input).trim();
    if (!trimmed || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: trimmed }]);
    setBusy(true);
    try {
      const loc = locationRef.current;
      const result = await api.ai.assist({
        message: trimmed,
        context: {
          lat: loc?.lat,
          lng: loc?.lng,
          user_id: user?.id,
          user_name: user?.full_name,
        },
      });
      setMessages((m) => [...m, { role: "assistant", content: result.text }]);
      onResultRef.current?.(result);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Sorry — ${err.message}. Try again in a moment.` },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="assistant">
      <div className="assistant-header">
        <span className="assistant-avatar">🤖</span>
        <div>
          <strong>JoshRob Assistant</strong>
          <span className="assistant-status">● online</span>
        </div>
      </div>
      <div className="assistant-messages" ref={listRef}>
        {messages.length === 0 && (
          <p className="assistant-empty">
            Hi {user?.full_name?.split(" ")[0] || "there"}! I can guide you, find nearby places,
            control your robot or raise an SOS. Try one of the suggestions below.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble chat-${m.role}`}>
            {m.content}
          </div>
        ))}
        {busy && <div className="chat-bubble chat-assistant">Thinking…</div>}
      </div>
      <div className="assistant-quick">
        {QUICK_PROMPTS.map((p) => (
          <button key={p} type="button" className="chip" onClick={() => send(p)} disabled={busy}>
            {p}
          </button>
        ))}
      </div>
      <form
        className="assistant-input"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message, e.g. “take me to the mall”…"
          disabled={busy}
        />
        <button type="submit" className="btn btn-primary" disabled={busy || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
