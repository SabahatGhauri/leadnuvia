"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function LeadStatus({
  id,
  agentId,
  status,
}: {
  id: string;
  agentId: string;
  status: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  return (
    <label>
      Status
      <select
        value={status}
        disabled={busy}
        onChange={async (e) => {
          setBusy(true);
          setError("");
          try {
            const r = await fetch("/api/app", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "lead-status",
                id,
                agent_id: agentId,
                status: e.target.value,
              }),
            });
            if (!r.ok) throw new Error();
            router.refresh();
          } catch {
            setError("Could not update status.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {["new", "qualified", "contacted", "won", "lost"].map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
      {error && <small role="alert">{error}</small>}
    </label>
  );
}
