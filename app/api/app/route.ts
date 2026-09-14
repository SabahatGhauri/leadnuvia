import { readJson } from "@/lib/request-body";
import { userClient, adminClient } from "@/lib/supabase/server";
import { cleanText, origins, validId, websiteUrl } from "@/lib/validation";
import Firecrawl from "@mendable/firecrawl-js";
export async function POST(request: Request) {
  try {
    const db = await userClient();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user)
      return Response.json({ error: "Please sign in." }, { status: 401 });
    const body = await readJson(request);
    const action = body.action;
    if (action === "save-agent") {
      const color = cleanText(body.primary_color, 7);
      if (!/^#[a-f\d]{6}$/i.test(color))
        throw new Error("Choose a valid color.");
      const data = {
        name: cleanText(body.name, 80),
        company_name: cleanText(body.company_name, 120),
        welcome_message: cleanText(body.welcome_message, 400),
        instructions: cleanText(body.instructions, 3000, false),
        primary_color: color,
        allowed_origins: origins(cleanText(body.allowed_origins, 2000, false)),
        booking_url: body.booking_url
          ? websiteUrl(cleanText(body.booking_url, 500))
          : "",
        is_active: body.is_active === true,
      };
      if (data.is_active && !data.allowed_origins.length)
        throw new Error(
          "Add your website address before activating the agent.",
        );
      if (body.id && !validId(body.id)) throw new Error("Invalid agent.");
      const query = body.id
        ? db
            .from("ln_agents")
            .update(data)
            .eq("id", body.id)
            .eq("owner_id", user.id)
        : db.from("ln_agents").insert({ ...data, owner_id: user.id });
      const { data: agent, error } = await query.select("id").single();
      if (error)
        throw new Error(
          "Could not save agent. Check your fields and the three-agent limit.",
        );
      return Response.json({ id: agent.id });
    }
    if (!validId(body.agent_id)) throw new Error("Invalid agent.");
    const { data: agent } = await db
      .from("ln_agents")
      .select("id")
      .eq("id", body.agent_id)
      .eq("owner_id", user.id)
      .single();
    if (!agent)
      return Response.json({ error: "Agent not found." }, { status: 404 });
    if (action === "add-knowledge") {
      let content = cleanText(body.content || "", 40000, false);
      let source_url = "";
      if (body.url) {
        source_url = websiteUrl(cleanText(body.url, 500));
        if (!process.env.FIRECRAWL_API_KEY)
          throw new Error(
            "Website import is not enabled yet. Paste the page text instead.",
          );
        const { data: allowed, error: limitError } = await adminClient().rpc(
          "ln_take_limit",
          { bucket: `import:${user.id}`, max_count: 10, seconds: 86400 },
        );
        if (limitError || !allowed)
          throw new Error("Website import limit reached. Try again tomorrow.");
        const result = await new Firecrawl({
          apiKey: process.env.FIRECRAWL_API_KEY,
        }).scrape(source_url, { formats: ["markdown"], onlyMainContent: true });
        content = (result.markdown || "").slice(0, 40000);
      }
      if (!content.trim())
        throw new Error("No readable content found. Paste the text manually.");
      const { error } = await db
        .from("ln_documents")
        .insert({
          agent_id: agent.id,
          title: cleanText(body.title, 150),
          content,
          source_url,
        });
      if (error)
        throw new Error(
          "Could not add knowledge. Each agent can have up to 20 sources.",
        );
      return Response.json({ ok: true });
    }
    if (action === "delete-knowledge") {
      if (!validId(body.id)) throw new Error("Invalid source.");
      const { error } = await db
        .from("ln_documents")
        .delete()
        .eq("id", body.id)
        .eq("agent_id", agent.id);
      if (error) throw new Error("Could not remove source.");
      return Response.json({ ok: true });
    }
    if (action === "lead-status") {
      if (
        !validId(body.id) ||
        !["new", "qualified", "contacted", "won", "lost"].includes(body.status)
      )
        throw new Error("Invalid lead status.");
      const { error } = await db
        .from("ln_conversations")
        .update({ status: body.status })
        .eq("id", body.id)
        .eq("agent_id", agent.id);
      if (error) throw new Error("Could not update lead.");
      return Response.json({ ok: true });
    }
    return Response.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to complete request.",
      },
      { status: 400 },
    );
  }
}
