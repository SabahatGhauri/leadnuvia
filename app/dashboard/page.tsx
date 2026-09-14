import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
export default async function Dashboard() {
  const { db } = await requireUser();
  const [{ data: agents, error: aerr }, { data: leads, error: lerr }] =
    await Promise.all([
      db.from("ln_agents").select("id,name,is_active"),
      db
        .from("ln_conversations")
        .select("id,email,intent_score,created_at")
        .order("created_at", { ascending: false })
        .limit(1000),
    ]);
  if (aerr || lerr) throw aerr || lerr;
  const rows = leads || [];
  return (
    <>
      <header className="page-heading">
        <div>
          <span className="eyebrow">MAKE EVERY CONVERSATION COUNT</span>
          <h1>Your sales workspace</h1>
          <p className="muted">
            Give visitors answers. Give your team a reason to follow up.
          </p>
        </div>
        <Link className="button" href="/dashboard/agents">
          Manage agents →
        </Link>
      </header>
      <div className="stats-grid">
        {[
          ["Active agents", agents.filter((a) => a.is_active).length],
          ["Conversations", rows.length],
          ["Captured emails", rows.filter((l) => l.email).length],
          [
            "High-intent conversations",
            rows.filter((l) => l.intent_score >= 60).length,
          ],
        ].map(([label, value]) => (
          <div className="card stat" key={label}>
            <span className="muted">{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <p className="muted small">
        Conversation metrics cover your latest 1,000 conversations. Intent is a
        rule-based signal, not a prediction.
      </p>
      <section className="card onboarding">
        <span className="eyebrow">FROM WEBSITE TO WORKSPACE</span>
        <h2>Three steps to your first conversation</h2>
        <div className="steps-grid">
          {[
            [
              "01",
              "Create your agent",
              "Choose your business name, greeting, and style.",
            ],
            [
              "02",
              "Add your knowledge",
              "Paste FAQs or import product and pricing pages.",
            ],
            [
              "03",
              "Install and activate",
              "Add your website address, enable the agent, and copy its embed code.",
            ],
          ].map(([n, title, description]) => (
            <div key={n}>
              <span className="step-number">{n}</span>
              <h3>{title}</h3>
              <p className="muted">{description}</p>
            </div>
          ))}
        </div>
        <Link className="button secondary" href="/dashboard/agents">
          {agents.length ? "Continue setup" : "Create your first agent"}
        </Link>
      </section>
    </>
  );
}
