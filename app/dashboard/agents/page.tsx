import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import AgentEditor from "@/components/AgentEditor";
export default async function Agents() {
  const { db } = await requireUser();
  const { data, error } = await db
    .from("ln_agents")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (
    <>
      <header className="page-heading">
        <div>
          <span className="eyebrow">YOUR TEAM, ALWAYS AVAILABLE</span>
          <h1>AI agents</h1>
          <p className="muted">
            Build an assistant around what your business knows.
          </p>
        </div>
        <span className="badge">{data.length}/3 agents</span>
      </header>
      <div className="agent-grid">
        {data.map((agent) => (
          <Link
            className="card agent-card"
            href={`/dashboard/agents/${agent.id}`}
            key={agent.id}
          >
            <div
              className="agent-icon"
              style={{ background: agent.primary_color }}
            >
              ✦
            </div>
            <h2>{agent.name}</h2>
            <p className="muted">{agent.company_name}</p>
            <span className={`badge ${agent.is_active ? "active" : ""}`}>
              {agent.is_active ? "Active" : "Draft"}
            </span>
            <span className="arrow">Manage agent →</span>
          </Link>
        ))}
      </div>
      {data.length < 3 && <AgentEditor />}
    </>
  );
}
