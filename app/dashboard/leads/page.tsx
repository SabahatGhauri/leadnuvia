import { requireUser } from "@/lib/supabase/server";
import LeadsTable from "@/components/LeadsTable";
export default async function Leads() {
  const { db } = await requireUser();
  const { data, error } = await db
    .from("ln_conversations")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1000);
  if (error) throw error;
  return (
    <>
      <header className="page-heading">
        <div>
          <span className="eyebrow">YOUR NEXT CUSTOMER</span>
          <h1>Leads & conversations</h1>
          <p className="muted">
            Read conversations and follow up with interested visitors. Showing
            the latest 1,000.
          </p>
        </div>
      </header>
      <LeadsTable leads={data} />
    </>
  );
}
