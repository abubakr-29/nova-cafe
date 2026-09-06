import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0b0b0d] text-[#f5f2ea]">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 md:px-10">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">
              NOVA
            </p>

            <h1 className="mt-1 text-xl font-medium tracking-tight">Café</h1>
          </div>

          <button className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:bg-white/5">
            Table 07
          </button>
        </header>

        {/* Hero */}
        <section className="flex flex-1 flex-col justify-center py-20">
          <p className="mb-5 text-sm uppercase tracking-[0.25em] text-[#d7a45a]">
            Coffee · Food · Connection
          </p>

          <h2 className="max-w-4xl text-5xl font-medium leading-[1.05] tracking-[-0.04em] md:text-7xl">
            Something good
            <br />
            is waiting for you.
          </h2>

          <p className="mt-6 max-w-xl text-base leading-7 text-white/50 md:text-lg">
            Thoughtfully made coffee, comforting food, and a space to slow down.
          </p>

          <div className="mt-10 flex gap-3">
            <Link
              href="/menu"
              className="rounded-full bg-[#f5f2ea] px-6 py-3 text-sm font-medium text-[#0b0b0d] transition hover:scale-[1.02]"
            >
              Explore menu
            </Link>

            <Link
              href="/menu"
              className="rounded-full border border-white/10 px-6 py-3 text-sm text-white/70 transition hover:bg-white/5"
            >
              View table
            </Link>
          </div>
        </section>

        {/* Footer information */}
        <footer className="flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-white/40 md:flex-row md:items-center md:justify-between">
          <p>Table 07 · Indoor</p>

          <p>Open today · 8:00 AM — 11:00 PM</p>
        </footer>
      </section>
    </main>
  );
}
