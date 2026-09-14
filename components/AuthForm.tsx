"use client";
import { useState } from "react";
import Link from "next/link";
export default function AuthForm({
  mode,
  enabled,
}: {
  mode: "login" | "signup" | "reset" | "update";
  enabled: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const title = {
    login: "Welcome back",
    signup: "Create your workspace",
    reset: "Reset your password",
    update: "Choose a new password",
  }[mode];
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const r = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if (d.redirect) window.location.assign(d.redirect);
      else setMessage(d.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <Link href="/" className="brand">
        Lead<span>Nuvia</span>
      </Link>
      <form className="card auth-card" onSubmit={submit}>
        <span className="eyebrow">YOUR SALES WORKSPACE</span>
        <h1>{title}</h1>
        <p className="muted">
          Turn your website knowledge into helpful sales conversations.
        </p>
        {!enabled && (
          <p className="notice">
            Account setup is being completed. Please check back soon.
          </p>
        )}
        {mode !== "update" && (
          <label>
            Email address
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
            />
          </label>
        )}
        {mode !== "reset" && (
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              minLength={10}
              maxLength={128}
              required
            />
            <small>At least 10 characters.</small>
          </label>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="notice">
            {message}
          </p>
        )}
        <button className="button" disabled={busy || !enabled}>
          {busy
            ? "Please wait…"
            : {
                login: "Sign in",
                signup: "Create account",
                reset: "Send reset link",
                update: "Save password",
              }[mode]}
        </button>
        <div className="auth-links">
          {mode === "login" ? (
            <>
              <Link href="/signup">Create an account</Link>
              <Link href="/forgot-password">Forgot password?</Link>
            </>
          ) : (
            <Link href="/login">Back to sign in</Link>
          )}
        </div>
      </form>
    </main>
  );
}
