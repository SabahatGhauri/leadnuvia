import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { validId } from "@/lib/validation";
import { appUrl } from "@/lib/app-config";
import AgentEditor from "@/components/AgentEditor";
import KnowledgeEditor from "@/components/KnowledgeEditor";
import InstallWidget from "@/components/InstallWidget";
export default async function AgentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!validId(id)) notFound();
  const { db } = await requireUser();
  const { data: agent } = await db
    .from("ln_agents")
    .select("*")
    .eq("id", id)
    .single();
  if (!agent) notFound();
  const { data: documents, error } = await db
    .from("ln_documents")
    .select("id,title,source_url,created_at")
    .eq("agent_id", id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (
    <>
      <Link className="back-link" href="/dashboard/agents">
        ← All agents
      </Link>
      <header className="page-heading">
        <div>
          <h1>{agent.name}</h1>
          <p className="muted">Teach, customize, and launch your assistant.</p>
        </div>
      </header>
      <div className="editor-grid">
        <div className="stack">
          <AgentEditor agent={agent} />
          <KnowledgeEditor agentId={id} documents={documents} />
        </div>
        <InstallWidget agentId={id} host={appUrl()} />
      </div>
    </>
  );
}
