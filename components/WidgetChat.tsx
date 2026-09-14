"use client";
import { useState, useEffect, useRef } from "react";
type Agent = {
  name: string;
  welcome_message: string;
  primary_color: string;
  booking_url: string;
};
type Message = { role: "user" | "assistant"; text: string; sources?: string[] };
export default function WidgetChat({ agentId }: { agentId: string }) {
  const [agent, setAgent] = useState<Agent>();
  const [token, setToken] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [contact, setContact] = useState(false);
  const [saved, setSaved] = useState(false);
  const [qualified, setQualified] = useState(false);
  const [contactBusy, setContactBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let started = false;
    let cancelled = false;
    async function start(origin: string) {
      if (started) return;
      started = true;
      try {
        const r = await fetch("/api/widget/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId, origin }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        if (!cancelled) {
          setToken(d.token);
          setAgent(d.agent);
          setMessages([{ role: "assistant", text: d.agent.welcome_message }]);
        }
      } catch (e) {
        if (!cancelled)
          setError(
            e instanceof Error ? e.message : "Could not load assistant.",
          );
      }
    }
    const receive = (event: MessageEvent) => {
      if (
        event.source === window.parent &&
        event.data?.type === "leadnuvia-init"
      )
        void start(event.origin);
    };
    window.addEventListener("message", receive);
    if (window === window.parent) void start(window.location.origin);
    else window.parent.postMessage({ type: "leadnuvia-ready" }, "*");
    return () => {
      cancelled = true;
      window.removeEventListener("message", receive);
    };
  }, [agentId]);
  useEffect(
    () => bottom.current?.scrollIntoView({ behavior: "smooth" }),
    [messages],
  );
  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim() || busy || !token) return;
    const input = text.trim();
    setText("");
    setBusy(true);
    setError("");
    setMessages((prev) => [
      ...prev,
      { role: "user", text: input },
      { role: "assistant", text: "" },
    ]);
    try {
      const response = await fetch("/api/widget/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, message: input }),
      });
      if (!response.ok) {
        const d = await response.json();
        throw new Error(d.error);
      }
      if (!response.body) throw new Error("Streaming is unavailable.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let completed = false;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let split: number;
        while ((split = buffer.indexOf("\n\n")) !== -1) {
          const frame = buffer.slice(0, split);
          buffer = buffer.slice(split + 2);
          if (!frame.startsWith("data: ")) continue;
          const data = JSON.parse(frame.slice(6));
          if (data.error) throw new Error(data.error);
          if (data.text)
            setMessages((prev) =>
              prev.map((m, i) =>
                i === prev.length - 1 ? { ...m, text: m.text + data.text } : m,
              ),
            );
          if (data.done) {
            completed = true;
            setQualified(data.qualified);
            setMessages((prev) =>
              prev.map((m, i) =>
                i === prev.length - 1 ? { ...m, sources: data.sources } : m,
              ),
            );
          }
        }
      }
      if (!completed)
        throw new Error("Connection interrupted. Please try again.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send message.");
    } finally {
      setBusy(false);
    }
  }
  async function saveContact(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setContactBusy(true);
    setError("");
    const f = new FormData(event.currentTarget);
    try {
      const r = await fetch("/api/widget/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          email: f.get("email"),
          name: f.get("name"),
          consent: f.get("consent") === "on",
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setContactBusy(false);
    }
  }
  return (
    <main
      className="widget"
      style={
        {
          "--widget-color": agent?.primary_color || "#0f766e",
        } as React.CSSProperties
      }
    >
      <header className="widget-header">
        <strong>{agent?.name || "Sales assistant"}</strong>
        <small>AI assistant · Answers may be imperfect</small>
      </header>
      <section className="widget-messages" aria-live="polite">
        {!agent && !error && (
          <p className="muted">Connecting to your assistant…</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            <p>{m.text || (busy ? "Thinking…" : "Reply unavailable.")}</p>
            {m.sources?.map((url) => (
              <a href={url} key={url} target="_blank" rel="noopener noreferrer">
                Source ↗
              </a>
            ))}
          </div>
        ))}
        <div ref={bottom} />
      </section>
      {error && (
        <p role="alert" className="widget-error">
          {error}
        </p>
      )}
      {qualified && agent?.booking_url && (
        <a
          className="booking-link"
          href={agent.booking_url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Choose a time to meet ↗
        </a>
      )}
      {token && (
        <>
          <div className="widget-contact">
            <button
              className="text-button"
              onClick={() => setContact(!contact)}
            >
              {contact ? "Hide contact form" : "Ask the team to follow up"}
            </button>
            {contact &&
              (saved ? (
                <p role="status">
                  Your contact details have been shared with the team.
                </p>
              ) : (
                <form className="stack" onSubmit={saveContact}>
                  <label>
                    Your name
                    <input name="name" maxLength={100} />
                  </label>
                  <label>
                    Email
                    <input type="email" name="email" required maxLength={254} />
                  </label>
                  <label className="check">
                    <input type="checkbox" name="consent" required /> I agree to
                    share my email and this conversation with the business for
                    follow-up.
                  </label>
                  <button className="button" disabled={contactBusy}>
                    {contactBusy ? "Saving…" : "Request follow-up"}
                  </button>
                </form>
              ))}
          </div>
          <form onSubmit={send} className="widget-input">
            <input
              aria-label="Message"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ask a question…"
              maxLength={2000}
              disabled={busy}
            />
            <button disabled={busy || !text.trim()} aria-label="Send message">
              ↑
            </button>
          </form>
          <small className="widget-footer">
            Conversations are stored for this business. Powered by LeadNuvia.
          </small>
        </>
      )}
    </main>
  );
}
