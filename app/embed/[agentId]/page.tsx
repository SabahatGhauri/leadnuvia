import { notFound } from "next/navigation";
import { validId } from "@/lib/validation";
import WidgetChat from "@/components/WidgetChat";
export default async function Embed({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;
  if (!validId(agentId)) notFound();
  return <WidgetChat agentId={agentId} />;
}
