import { readJson } from "@/lib/request-body";
import { userClient } from "@/lib/supabase/server";
import { appUrl } from "@/lib/app-config";
export async function POST(request: Request) {
  try {
    const { mode, email, password } = await readJson(request);
    if (!["login", "signup", "reset", "update", "logout"].includes(mode))
      return Response.json({ error: "Invalid action." }, { status: 400 });
    const db = await userClient();
    if (mode === "logout") {
      await db.auth.signOut();
      return Response.json({ ok: true });
    }
    if (mode === "update") {
      const {
        data: { user },
      } = await db.auth.getUser();
      if (!user)
        return Response.json(
          { error: "Sign in again to reset your password." },
          { status: 401 },
        );
    }
    if (
      mode !== "update" &&
      (typeof email !== "string" ||
        email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    )
      return Response.json(
        { error: "Enter a valid email address." },
        { status: 400 },
      );
    if (
      mode !== "reset" &&
      (typeof password !== "string" ||
        password.length < 10 ||
        password.length > 128)
    )
      return Response.json(
        { error: "Use a password between 10 and 128 characters." },
        { status: 400 },
      );
    if (mode === "signup") {
      const { data, error } = await db.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${appUrl()}/auth/callback` },
      });
      if (error)
        return Response.json(
          {
            error:
              "Unable to create account. Try signing in or try again later.",
          },
          { status: 400 },
        );
      return Response.json({
        redirect: data.session ? "/dashboard" : null,
        message: "Check your email to confirm your account, then sign in.",
      });
    }
    if (mode === "reset") {
      await db.auth.resetPasswordForEmail(email, {
        redirectTo: `${appUrl()}/auth/callback?next=/reset-password`,
      });
      return Response.json({
        message:
          "If that email has an account, a password reset link is on its way.",
      });
    }
    if (mode === "update") {
      const { error } = await db.auth.updateUser({ password });
      if (error)
        return Response.json(
          { error: "Unable to update password. Request a fresh reset link." },
          { status: 400 },
        );
      return Response.json({ redirect: "/dashboard" });
    }
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error)
      return Response.json(
        {
          error:
            "Could not sign in. Check your credentials and email confirmation.",
        },
        { status: 400 },
      );
    return Response.json({ redirect: "/dashboard" });
  } catch {
    return Response.json(
      { error: "Account service is unavailable. Please try again later." },
      { status: 503 },
    );
  }
}
