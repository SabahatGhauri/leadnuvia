"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Agent } from "@/lib/types";
export default function AgentEditor({ agent }: { agent?: Agent }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const f = new FormData(event.currentTarget);
    try {
      const r = await fetch("/api/app", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...Object.fromEntries(f),
          action: "save-agent",
          id: agent?.id,
          is_active: f.get("is_active") === "on",
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if (!agent) router.push(`/dashboard/agents/${d.id}`);
      else {
        setMessage("Settings saved.");
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="card stack" onSubmit={save}>
      <div>
        <h2>
          {agent ? "Agent settings" : "Create your first sales assistant"}
        </h2>
        <p className="muted">
          Give your assistant a voice, then add the knowledge it needs.
        </p>
      </div>
      <div className="form-grid">
        <label>
          Agent name
          <input
            name="name"
            defaultValue={agent?.name || ""}
            placeholder="Website sales assistant"
            maxLength={80}
            required
          />
        </label>
        <label>
          Business name
          <input
            name="company_name"
            defaultValue={agent?.company_name || ""}
            placeholder="Your business"
            maxLength={120}
            required
          />
        </label>
      </div>
      <label>
        Welcome message
        <input
          name="welcome_message"
          defaultValue={
            agent?.welcome_message || "Hi! How can I help you today?"
          }
          maxLength={400}
          required
        />
      </label>
      <label>
        Style and business instructions
        <textarea
          name="instructions"
          defaultValue={agent?.instructions || ""}
          placeholder="Be friendly and concise. Offer a demo when someone asks about our service."
          maxLength={3000}
          rows={4}
        />
        <small>Answers stay grounded in your saved knowledge sources.</small>
      </label>
      <div className="form-grid">
        <label>
          Brand color
          <input
            type="color"
            name="primary_color"
            defaultValue={agent?.primary_color || "#0f766e"}
          />
        </label>
        <label>
          Booking link (optional)
          <input
            name="booking_url"
            type="url"
            defaultValue={agent?.booking_url || ""}
            placeholder="https://cal.com/your-team/demo"
            maxLength={500}
          />
        </label>
      </div>
      <label>
        Allowed website addresses
        <textarea
          name="allowed_origins"
          defaultValue={agent?.allowed_origins.join("\n") || ""}
          placeholder={"https://yourbusiness.com\nhttps://www.yourbusiness.com"}
          rows={3}
        />
        <small>
          One HTTPS address per line. Add www separately if you use it.
        </small>
      </label>
      <label className="check">
        <input
          name="is_active"
          type="checkbox"
          defaultChecked={agent?.is_active || false}
        />{" "}
        Enable this assistant on the listed websites
      </label>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      <button className="button" disabled={busy}>
        {busy ? "Saving…" : agent ? "Save settings" : "Create agent"}
      </button>
    </form>
  );
}
