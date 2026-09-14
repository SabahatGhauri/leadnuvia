import { NextResponse } from "next/server";
import { userClient } from "@/lib/supabase/server";
import { appUrl } from "@/lib/app-config";
import { safeNext } from "@/lib/validation";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    const db = await userClient();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(
        new URL(safeNext(url.searchParams.get("next")), appUrl()),
      );
  }
  return NextResponse.redirect(new URL("/login?error=confirmation", appUrl()));
}
