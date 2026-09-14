import { readJson } from "@/lib/request-body";
import { adminClient } from "@/lib/supabase/server";
import { readSession } from "@/lib/widget-token";
import { cleanText } from "@/lib/validation";
export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const session = readSession(cleanText(body.token, 2000));
    const email = cleanText(body.email, 254);
    const name = cleanText(body.name || "", 100, false);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || body.consent !== true)
      return Response.json(
        { error: "Enter your email and agree to be contacted." },
        { status: 400 },
      );
    const db = adminClient();
    const { data: ok } = await db.rpc("ln_take_limit", {
      bucket: `contact:${session.conversation}`,
      max_count: 5,
      seconds: 86400,
    });
    if (!ok)
      return Response.json(
        { error: "Please try again later." },
        { status: 429 },
      );
    const { data, error } = await db
      .from("ln_conversations")
      .update({ email, name, updated_at: new Date().toISOString() })
      .eq("id", session.conversation)
      .eq("agent_id", session.agent)
      .select("id")
      .single();
    if (error || !data) throw new Error();
    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: "Could not save contact details. Please reopen the chat." },
      { status: 400 },
    );
  }
}
