import { createHmac, timingSafeEqual } from "node:crypto";
type Session = {
  conversation: string;
  agent: string;
  origin: string;
  expires: number;
};
function secret() {
  const key = process.env.WIDGET_SIGNING_SECRET;
  if (!key || key.length < 32)
    throw new Error("Widget signing is not configured.");
  return key;
}
export function signSession(session: Session) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${createHmac("sha256", secret()).update(payload).digest("base64url")}`;
}
export function readSession(token: string): Session {
  if (token.length > 2000) throw new Error("Invalid session.");
  const [payload, signature, ...extra] = token.split(".");
  if (!payload || !signature || extra.length)
    throw new Error("Invalid session.");
  const expected = createHmac("sha256", secret()).update(payload).digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    throw new Error("Invalid session.");
  const session = JSON.parse(
    Buffer.from(payload, "base64url").toString(),
  ) as Session;
  if (
    !session.conversation ||
    !session.agent ||
    typeof session.origin !== "string" ||
    !Number.isFinite(session.expires) ||
    session.expires < Date.now()
  )
    throw new Error("Session expired. Please reopen the chat.");
  return session;
}
