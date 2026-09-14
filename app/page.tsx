import Link from "next/link";
export default function Home() {
  return (
    <main className="marketing">
      <nav className="marketing-nav">
        <Link className="brand" href="/">
          Lead<span>Nuvia</span>
        </Link>
        <div>
          <a href="#how-it-works">How it works</a>
          <Link href="/login">Sign in</Link>
          <Link className="button" href="/signup">
            Get started →
          </Link>
        </div>
      </nav>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">A WARM WELCOME. A SMARTER FOLLOW-UP.</span>
          <h1>
            Your website has visitors.
            <br />
            <em>Start a conversation.</em>
          </h1>
          <p>
            Meet the AI sales assistant that learns your business, answers the
            questions that matter, and brings your next customer a little
            closer.
          </p>
          <div className="actions">
            <Link className="button" href="/signup">
              Build your sales assistant →
            </Link>
            <a className="text-button" href="#how-it-works">
              See how it works ↓
            </a>
          </div>
          <small>
            Built around your knowledge. Ready when your visitors are.
          </small>
        </div>
        <div className="hero-demo">
          <div className="demo-top">
            <span className="agent-icon">✦</span>
            <div>
              <strong>Your sales assistant</strong>
              <small>Illustrative conversation</small>
            </div>
            <span className="online-dot" />
          </div>
          <div className="demo-body">
            <p className="demo-bubble">Hi there! What brings you in today?</p>
            <p className="demo-bubble visitor">
              Can your team help us choose the right plan?
            </p>
            <p className="demo-bubble">
              Absolutely. Tell me a little about your team and what you’re
              looking for.
            </p>
            <div className="demo-lead">
              <span>↗</span>
              <div>
                <strong>A conversation worth following up</strong>
                <small>
                  Answers, contact details, and context in one place.
                </small>
              </div>
            </div>
          </div>
          <div className="demo-input">
            Ask a question… <span>↑</span>
          </div>
        </div>
      </section>
      <section id="how-it-works" className="marketing-section">
        <span className="eyebrow">FROM YOUR KNOWLEDGE TO THEIR NEXT STEP</span>
        <h2>
          A small addition to your website.
          <br />A better way to meet your customers.
        </h2>
        <div className="feature-grid">
          {[
            [
              "01",
              "Teach it your business",
              "Add your FAQs, products, and pricing. Your assistant uses the information you provide to answer questions.",
            ],
            [
              "02",
              "Make it feel like you",
              "Set its name, greeting, style, and booking link. Install it with a short script on your website.",
            ],
            [
              "03",
              "Follow up with context",
              "Review conversations, capture emails with consent, and see which visitors asked about buying or booking.",
            ],
          ].map(([n, title, body]) => (
            <article key={n}>
              <span className="step-number">{n}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="marketing-cta">
        <span className="eyebrow">LESS GUESSWORK. MORE CONVERSATIONS.</span>
        <h2>
          Give your next customer
          <br />a place to start.
        </h2>
        <Link className="button" href="/signup">
          Create your workspace →
        </Link>
        <p>
          Early access: up to 3 agents and 100 messages per agent each month.
        </p>
      </section>
      <footer className="marketing-footer">
        <Link className="brand" href="/">
          Lead<span>Nuvia</span>
        </Link>
        <p>Turn conversations into customers.</p>
        <Link href="/login">Your workspace ↗</Link>
      </footer>
    </main>
  );
}
