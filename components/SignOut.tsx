"use client";
import { useState } from "react";
export default function SignOut() {
  const [error, setError] = useState("");
  return (
    <>
      <button
        className="button secondary"
        onClick={async () => {
          try {
            const r = await fetch("/api/auth", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ mode: "logout" }),
            });
            if (!r.ok) throw new Error();
            window.location.assign("/login");
          } catch {
            setError("Unable to sign out. Try again.");
          }
        }}
      >
        Sign out
      </button>
      {error && <small role="alert">{error}</small>}
    </>
  );
}
