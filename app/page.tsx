export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col px-6 sm:px-12">
      <header className="py-8 text-xl font-semibold tracking-tight">Lead<span className="text-teal-300">Nuvia</span></header>
      <section className="flex flex-1 flex-col justify-center max-w-4xl py-20">
        <p className="text-teal-300 text-sm tracking-widest uppercase mb-6">Coming soon</p>
        <h1 className="text-5xl sm:text-7xl font-semibold tracking-tight leading-tight">Turn conversations<br />into customers.</h1>
        <p className="mt-8 max-w-xl text-lg text-slate-300 leading-relaxed">Meet LeadNuvia. Your AI sales assistant for answering website visitors, discovering qualified leads, and making the next conversation count.</p>
      </section>
      <footer className="py-8 text-sm text-slate-400">LeadNuvia · AI-powered sales conversations</footer>
    </main>
  );
}
