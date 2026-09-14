"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="card">
      <h1>Workspace unavailable</h1>
      <p>
        We could not load your workspace. Please try again. If this is a new
        installation, finish the database setup first.
      </p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
