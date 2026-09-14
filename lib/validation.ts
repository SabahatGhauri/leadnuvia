export function cleanText(
  value: unknown,
  max: number,
  required = true,
): string {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (required && !value.trim())
  )
    throw new Error("Please check the text fields and their length.");
  return value.trim();
}
export function validId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}
export function websiteUrl(value: string): string {
  const u = new URL(value);
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    u.port ||
    !u.hostname.includes(".") ||
    /^([\d.]+|localhost|.*\.local|.*\.internal)$/.test(u.hostname) ||
    u.hostname.includes(":") ||
    u.hostname.endsWith(".")
  )
    throw new Error("Use a public HTTPS website address.");
  return u.href;
}
export function origins(value: string): string[] {
  const values = value
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (values.length > 10) throw new Error("Add at most 10 website addresses.");
  return [
    ...new Set(
      values.map(
        (s) =>
          new URL(websiteUrl(s.includes("://") ? s : `https://${s}`)).origin,
      ),
    ),
  ];
}
export function safeNext(value: string | null) {
  return value?.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\")
    ? value
    : "/dashboard";
}
export function intentScore(text: string) {
  return Math.min(
    100,
    (/(pricing|price|cost|budget)/i.test(text) ? 25 : 0) +
      (/(demo|meeting|book|schedule)/i.test(text) ? 35 : 0) +
      (/(buy|purchase|sign up|subscribe|ready to|start today)/i.test(text)
        ? 40
        : 0),
  );
}
