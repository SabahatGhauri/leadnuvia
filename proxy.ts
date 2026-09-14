import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { configured, appUrl } from "@/lib/app-config";
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (
    !["GET", "HEAD", "OPTIONS"].includes(request.method) &&
    request.headers.get("origin") !== new URL(appUrl()).origin
  ) {
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  }
  let response = NextResponse.next({ request });
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  if (!path.startsWith("/embed/"))
    response.headers.set("X-Frame-Options", "DENY");
  if (
    path.startsWith("/dashboard") ||
    path.startsWith("/api") ||
    path.startsWith("/auth")
  )
    response.headers.set("Cache-Control", "private, no-store");
  if (
    !configured() ||
    !(
      path.startsWith("/dashboard") ||
      path.startsWith("/auth") ||
      path.startsWith("/api/app")
    )
  )
    return response;
  const db = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(values) {
          values.forEach(({ name, value }) => request.cookies.set(name, value));
          const refreshed = NextResponse.next({ request });
          response.headers.forEach((value, key) =>
            refreshed.headers.set(key, value),
          );
          values.forEach(({ name, value, options }) =>
            refreshed.cookies.set(name, value, options),
          );
          response = refreshed;
        },
      },
    },
  );
  await db.auth.getUser();
  return response;
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
