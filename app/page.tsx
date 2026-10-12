import Link from "next/link";
import { ArrowUpRight, ScanLine } from "lucide-react";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0b0b0d] px-6 py-10 text-[#f5f2ea]">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-[#d97745]/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -left-32 h-72 w-72 rounded-full bg-[#8e573e]/10 blur-3xl" />

      <div className="relative flex w-full max-w-md flex-col items-center text-center">
        <div className="mb-14 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.32em] text-[#d99a76]">
          <span className="h-px w-8 bg-[#d99a76]/50" />
          Table Ordering
          <span className="h-px w-8 bg-[#d99a76]/50" />
        </div>

        <div className="relative mb-8 flex h-24 w-24 items-center justify-center rounded-4xl border border-[#d99a76]/25 bg-[#d99a76]/10 shadow-[0_0_60px_rgba(217,154,118,0.12)]">
          <div className="absolute inset-2 rounded-3xl border border-dashed border-[#d99a76]/35" />
          <ScanLine size={36} strokeWidth={1.25} className="text-[#e2aa86]" />
        </div>

        <p className="text-xs font-medium uppercase tracking-[0.28em] text-white/35">
          Your table, your menu
        </p>
        <h1 className="mt-4 max-w-sm text-4xl font-medium leading-[1.08] tracking-[-0.045em] sm:text-5xl">
          A better way to order.
        </h1>

        <p className="mt-5 max-w-xs text-sm leading-6 text-white/45">
          Scan the QR code on your table to explore today&apos;s menu and order
          from the comfort of your seat.
        </p>

        <div className="mt-10 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/25">
          <span className="h-1.5 w-1.5 rounded-full bg-[#d99a76]" />
          Point your camera at the code
        </div>

        <Link
          href="/login"
          className="group mt-16 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/4 px-4 py-2.5 text-xs font-medium text-white/45 transition hover:border-white/20 hover:bg-white/8 hover:text-white/80"
        >
          Staff sign in
          <ArrowUpRight
            size={14}
            className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </Link>
      </div>
    </main>
  );
}
