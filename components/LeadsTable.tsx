"use client";
import { useState } from "react";
import Link from "next/link";
import type { Lead } from "@/lib/types";
export default function LeadsTable({ leads }: { leads: Lead[] }) {
  const [q, setQ] = useState("");
  const rows = leads.filter((l) =>
    `${l.email || ""} ${l.name || ""} ${l.summary}`
      .toLowerCase()
      .includes(q.toLowerCase()),
  );
  return (
    <section className="card">
      <div className="table-toolbar">
        <input
          aria-label="Search leads"
          placeholder="Search name, email, or conversation…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          className="button secondary"
          onClick={() => {
            const cell = (v: unknown) =>
              `"${String(v ?? "")
                .replace(/^[=+@\-\t\r]/, "'$&")
                .replaceAll('"', '""')}"`;
            const csv = [
              ["Name", "Email", "Status", "Intent score", "Last active"],
              ...rows.map((l) => [
                l.name,
                l.email,
                l.status,
                l.intent_score,
                l.updated_at,
              ]),
            ]
              .map((r) => r.map(cell).join(","))
              .join("\r\n");
            const u = URL.createObjectURL(
              new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }),
            );
            const a = document.createElement("a");
            a.href = u;
            a.download = "leadnuvia-leads.csv";
            a.click();
            URL.revokeObjectURL(u);
          }}
        >
          Export CSV
        </button>
      </div>
      {!rows.length ? (
        <div className="empty-state">
          <h2>No conversations yet</h2>
          <p className="muted">
            Preview an agent or install the widget. Your visitors&apos;
            conversations will appear here.
          </p>
          <Link className="button secondary" href="/dashboard/agents">
            Go to agents
          </Link>
        </div>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Visitor</th>
                <th>Latest question</th>
                <th>Intent</th>
                <th>Status</th>
                <th>Last active</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id}>
                  <td>
                    <Link href={`/dashboard/leads/${l.id}`}>
                      <strong>
                        {l.name || l.email || "Anonymous visitor"}
                      </strong>
                      <small>{l.name ? l.email : "View conversation →"}</small>
                    </Link>
                  </td>
                  <td className="summary-cell">
                    {l.summary || "Conversation started"}
                  </td>
                  <td>
                    <span
                      className={`badge ${l.intent_score >= 60 ? "active" : ""}`}
                    >
                      {l.intent_score}/100
                    </span>
                  </td>
                  <td>{l.status}</td>
                  <td>{new Date(l.updated_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
