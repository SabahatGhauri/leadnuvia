import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import SignOut from "@/components/SignOut";
export const dynamic = "force-dynamic";
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireUser();
  return (
    <div className="workspace">
      <aside className="sidebar">
        <Link href="/" className="brand">
          Lead<span>Nuvia</span>
        </Link>
        <span className="eyebrow">WORKSPACE</span>
        <nav>
          <Link href="/dashboard">Overview</Link>
          <Link href="/dashboard/agents">AI agents</Link>
          <Link href="/dashboard/leads">Leads & conversations</Link>
        </nav>
        <div className="sidebar-bottom">
          <span className="muted">{user.email}</span>
          <SignOut />
        </div>
      </aside>
      <main className="workspace-main">{children}</main>
    </div>
  );
}
