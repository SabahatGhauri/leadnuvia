"use client";
import { useState } from "react";
export default function InstallWidget({
  agentId,
  host,
}: {
  agentId: string;
  host: string;
}) {
  const [message, setMessage] = useState("");
  const code = `<script src="${host}/widget.js" data-agent-id="${agentId}" async></script>`;
  return (
    <section className="card stack">
      <h2>Install on your website</h2>
      <p className="muted">
        Add this script before your website&apos;s closing body tag. Activate
        the agent and list your website in its settings.
      </p>
      <pre className="code-block">{code}</pre>
      <div className="actions">
        <button
          className="button secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code);
              setMessage("Copied.");
            } catch {
              setMessage("Select the snippet above and copy it manually.");
            }
          }}
        >
          Copy snippet
        </button>
        <a
          className="button secondary"
          target="_blank"
          rel="noreferrer"
          href={`/embed/${agentId}`}
        >
          Preview assistant ↗
        </a>
      </div>
      <small role="status">{message}</small>
      <p className="muted">
        Early access includes 100 messages per agent each calendar month.
        Preview messages count toward this allowance.
      </p>
    </section>
  );
}
