import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { validId } from "@/lib/validation";
import LeadStatus from "@/components/LeadStatus";
export default async function LeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!validId(id)) notFound();
  const { db } = await requireUser();
  const { data: lead } = await db
    .from("ln_conversations")
    .select("*")
    .eq("id", id)
    .single();
  if (!lead) notFound();
  const { data: messages, error } = await db
    .from("ln_messages")
    .select("*")
    .eq("conversation_id", id)
    .order("created_at");
  if (error) throw error;
  return (
    <>
      <Link href="/dashboard/leads" className="back-link">
        ← All conversations
      </Link>
      <header className="page-heading">
        <div>
          <h1>{lead.name || lead.email || "Anonymous visitor"}</h1>
          <p className="muted">
            {lead.email || "No email captured"} · Intent {lead.intent_score}/100
            (rule-based)
          </p>
        </div>
        <LeadStatus id={id} agentId={lead.agent_id} status={lead.status} />
      </header>
      <section className="card transcript">
        {messages.length ? (
          messages.map((m) => (
            <article className={`transcript-message ${m.role}`} key={m.id}>
              <small>
                {m.role === "user" ? "Visitor" : "Assistant"} ·{" "}
                {new Date(m.created_at).toLocaleString()}
              </small>
              <p>{m.content}</p>
            </article>
          ))
        ) : (
          <p className="muted">No messages yet.</p>
        )}
      </section>
    </>
  );
}
