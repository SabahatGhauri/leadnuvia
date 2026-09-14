import AuthForm from "@/components/AuthForm";
import { requireUser } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export default async function Reset() {
  await requireUser();
  return <AuthForm mode="update" enabled />;
}
