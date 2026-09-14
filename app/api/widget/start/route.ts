import { readJson } from "@/lib/request-body";
import { createHash } from "node:crypto";
import { adminClient, userClient } from "@/lib/supabase/server";
import { appUrl } from "@/lib/app-config";
import { validId } from "@/lib/validation";
import { signSession } from "@/lib/widget-token";
export async function POST(request: Request) {
  try {
    const { agentId, origin } = await readJson(request);
    if (!validId(agentId) || typeof origin !== "string" || origin.length > 300)
      return Response.json(
        { error: "Invalid widget request." },
        { status: 400 },
      );
    const db = adminClient();
    const { data: agent } = await db
      .from("ln_agents")
      .select("*")
      .eq("id", agentId)
      .single();
    if (!agent)
      return Response.json({ error: "Assistant not found." }, { status: 404 });
    const preview = origin === new URL(appUrl()).origin;
    if (preview) {
      const auth = await userClient();
      const {
        data: { user },
      } = await auth.auth.getUser();
      if (user?.id !== agent.owner_id)
        return Response.json(
          { error: "Sign in as the agent owner to preview." },
          { status: 403 },
        );
    } else if (!agent.is_active || !agent.allowed_origins.includes(origin))
      return Response.json(
        { error: "This assistant is not enabled on this website." },
        { status: 403 },
      );
    const ip =
      request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ||
      "unknown";
    const key = createHash("sha256").update(ip).digest("hex").slice(0, 32);
    for (const [bucket, max_count, seconds] of [
      [`session-ip:${agent.id}:${key}`, 15, 3600],
      [`sessions:${agent.id}`, 200, 86400],
    ] as const) {
      const { data: ok, error } = await db.rpc("ln_take_limit", {
        bucket,
        max_count,
        seconds,
      });
      if (error || !ok)
        return Response.json(
          { error: "This assistant is busy. Please try later." },
          { status: 429 },
        );
    }
    const { data: conversation, error } = await db
      .from("ln_conversations")
      .insert({ agent_id: agent.id, origin })
      .select("id")
      .single();
    if (error) throw error;
    const token = signSession({
      agent: agent.id,
      conversation: conversation.id,
      origin,
      expires: Date.now() + 86400000,
    });
    return Response.json(
      {
        token,
        agent: {
          name: agent.name,
          welcome_message: agent.welcome_message,
          primary_color: agent.primary_color,
          booking_url: agent.booking_url,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "The assistant is temporarily unavailable." },
      { status: 503 },
    );
  }
}
