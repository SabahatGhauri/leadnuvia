"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
type Doc = {
  id: string;
  title: string;
  source_url: string;
  created_at: string;
};
export default function KnowledgeEditor({
  agentId,
  documents,
}: {
  agentId: string;
  documents: Doc[];
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("text");
  const router = useRouter();
  async function action(data: object) {
    const r = await fetch("/api/app", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, agent_id: agentId }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    router.refresh();
  }
  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = event.currentTarget;
    try {
      await action({
        ...Object.fromEntries(new FormData(form)),
        action: "add-knowledge",
      });
      form.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to add source.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card stack">
      <div>
        <h2>Knowledge library</h2>
        <p className="muted">
          {documents.length}/20 sources · Add product details, pricing, FAQs,
          and policies.
        </p>
      </div>
      <div className="source-list">
        {documents.length === 0 ? (
          <p className="empty-inline">
            Add a source so your assistant can answer business questions.
          </p>
        ) : (
          documents.map((doc) => (
            <div className="source-row" key={doc.id}>
              <div>
                <strong>{doc.title}</strong>
                <small>{doc.source_url || "Pasted text"}</small>
              </div>
              <button
                className="text-button"
                disabled={busy}
                onClick={async () => {
                  if (
                    !window.confirm(`Remove knowledge source “${doc.title}”?`)
                  )
                    return;
                  setBusy(true);
                  setError("");
                  try {
                    await action({ action: "delete-knowledge", id: doc.id });
                  } catch (e) {
                    setError(
                      e instanceof Error ? e.message : "Could not delete.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
      <form onSubmit={add} className="stack">
        <label>
          Source type
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="text">Paste business information</option>
            <option value="url">Import a website page</option>
          </select>
        </label>
        <label>
          Source title
          <input
            name="title"
            required
            maxLength={150}
            placeholder="Pricing and plans"
          />
        </label>
        {mode === "text" ? (
          <label>
            Content
            <textarea
              name="content"
              required
              maxLength={40000}
              rows={8}
              placeholder="Paste the information your assistant should use…"
            />
          </label>
        ) : (
          <label>
            Page URL
            <input
              name="url"
              type="url"
              required
              placeholder="https://yourbusiness.com/pricing"
            />
            <small>
              Imports this page only. Website import requires Firecrawl to be
              configured.
            </small>
          </label>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button
          className="button secondary"
          disabled={busy || documents.length >= 20}
        >
          {busy ? "Working…" : "Add knowledge source"}
        </button>
      </form>
    </section>
  );
}
