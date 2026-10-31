import "@fontsource/gloock/latin-400.css";
import "@fontsource-variable/manrope";

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check } from "lucide-react";

import { SITE } from "@/lib/seo";

export const metadata: Metadata = {
  title: { absolute: `${SITE.name}: ${SITE.tagline}` },
  description: SITE.description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: "en_IN",
    url: "/",
    title: `${SITE.name}: ${SITE.tagline}`,
    description: SITE.description,
  },
};

const facts = [
  ["No app", "Guests scan and order in their phone's browser."],
  ["UPI and cash", "The exact amount, paid straight to your account."],
  ["Live orders", "Your team sees every order the moment it is placed."],
];

const steps = [
  {
    title: "Scan",
    text: "Every table has its own QR code. The menu opens in the browser. Nothing to download, nothing to sign up for.",
  },
  {
    title: "Order",
    text: "Photos, sizes, add-ons and notes. Friends at one table can split the bill by who ordered what.",
  },
  {
    title: "Serve",
    text: "The order lands on the staff screen at once. Guests pay by UPI or cash, and your team confirms it.",
  },
];

const features = [
  [
    "Live orders board",
    "Every table and order in one place, updating by itself as guests order and the kitchen works.",
  ],
  [
    "A menu guests enjoy",
    "Photos, sizes and add-ons, with the price updating as they choose. Edit it any time.",
  ],
  [
    "Split the bill",
    "Share equally, or give each guest their own items. No arguments over the extra coffee.",
  ],
  [
    "UPI and cash",
    "A UPI link or QR with the exact amount filled in. Your staff confirm every payment.",
  ],
  [
    "Reports you can use",
    "Sales by day, hour, item and payment method, with GST. Download clean CSV files.",
  ],
  [
    "Your data stays yours",
    "Each café's orders, menu and staff are kept apart from every other café, with owner and staff roles.",
  ],
];

const faqs = [
  {
    q: "Do guests need to install an app?",
    a: "No. They scan the QR code on the table and the menu opens in the phone's browser. It works on any modern phone.",
  },
  {
    q: "How do payments work?",
    a: "Guests pay you directly, by UPI or in cash. For UPI, the app fills in your UPI ID and the exact amount. The money goes to your own account and is never held by the system. Staff confirm each payment before the bill is closed.",
  },
  {
    q: "Can my staff use it on a tablet or phone?",
    a: "Yes. The staff screen runs in the browser on a tablet, phone or computer, and updates live. The owner can see reports. Staff cannot.",
  },
  {
    q: "Is my café's data separate from other cafés?",
    a: "Yes. Every café has its own menu, tables, orders and staff accounts, and none of them can see another café's data.",
  },
  {
    q: "How do I get started?",
    a: `Talk to ${SITE.company}. They set up your café, your menu and your table QR codes with you.`,
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: SITE.name,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: SITE.description,
      publisher: {
        "@type": "Organization",
        name: SITE.company,
        url: SITE.companyUrl,
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

const gold = "#e8c382";

// Small corner marks that make a block look like a drawn frame.
function Ticks() {
  const tick = "absolute h-3 w-3 border-[#e8c382]/60";

  return (
    <>
      <span className={`${tick} -top-px -left-px border-t border-l`} />
      <span className={`${tick} -top-px -right-px border-t border-r`} />
      <span className={`${tick} -bottom-px -left-px border-b border-l`} />
      <span className={`${tick} -right-px -bottom-px border-r border-b`} />
    </>
  );
}

function Label({ n, children }: { n: string; children: string }) {
  return (
    <p className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.24em] text-[#e8c382]">
      <span className="text-white/30">{n}</span>
      <span className="h-px w-8 bg-[#e8c382]/40" />
      {children}
    </p>
  );
}

export default function Home() {
  return (
    <div className="font-body relative overflow-hidden bg-[#070707] text-[#f8f6f0]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <div className="pointer-events-none absolute -top-56 left-1/2 h-136 w-136 -translate-x-1/2 rounded-full bg-[#e8c382]/10 blur-3xl" />

      {/* Top bar */}
      <header className="relative z-10 border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="font-display flex items-center gap-2.5 text-2xl tracking-tight"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: gold }}
            />
            {SITE.name}
          </Link>

          <nav className="flex items-center gap-2 text-sm">
            <a
              href="#how"
              className="hidden px-4 py-2 text-white/50 transition hover:text-white sm:block"
            >
              How it works
            </a>
            <a
              href="#faq"
              className="hidden px-4 py-2 text-white/50 transition hover:text-white sm:block"
            >
              Questions
            </a>
            <Link
              href="/login"
              className="rounded-full border border-white/15 px-4 py-2 text-white/75 transition hover:border-[#e8c382]/60 hover:text-white"
            >
              Staff sign in
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative mx-auto grid max-w-6xl items-center gap-16 px-6 pt-16 pb-24 lg:grid-cols-[1.1fr_0.9fr] lg:pt-24 lg:pb-32">
          <div>
            <Label n="01">{SITE.tagline}</Label>

            <h1 className="font-display mt-8 text-[3.1rem] leading-[0.98] tracking-[-0.03em] sm:text-7xl lg:text-[5.4rem]">
              Guests order.
              <br />
              <span style={{ color: gold }}>You serve.</span>
            </h1>

            <p className="mt-8 max-w-md text-base leading-7 text-white/55 sm:text-lg">
              A QR code on every table. Guests order and pay from their own
              phone, your team sees it live, and you get clear sales reports
              every day.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <a
                href={SITE.companyUrl}
                className="group inline-flex h-13 items-center gap-2 rounded-full bg-[#f8f6f0] px-7 text-sm font-semibold text-[#070707] transition hover:scale-[1.02] active:scale-[0.98]"
              >
                Talk to {SITE.company}
                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </a>
              <a
                href="#how"
                className="inline-flex h-13 items-center rounded-full border border-white/15 px-7 text-sm font-semibold text-white/75 transition hover:border-white/30 hover:bg-white/5"
              >
                See how it works
              </a>
            </div>
          </div>

          {/* Phone in a frame */}
          <div aria-hidden="true" className="relative mx-auto w-full max-w-sm">
            <div className="relative border border-white/10 bg-white/2 px-6 py-10">
              <Ticks />
              <p className="absolute top-3 left-4 font-mono text-[10px] uppercase tracking-[0.22em] text-white/25">
                Table 5
              </p>
              <p className="absolute top-3 right-4 font-mono text-[10px] uppercase tracking-[0.22em] text-[#e8c382]/70">
                Live
              </p>

              <div className="mx-auto w-66 rounded-[2.4rem] border border-white/12 bg-[#0e0e0e] p-2.5 shadow-[0_30px_80px_rgba(0,0,0,0.7)]">
                <div className="rounded-[1.95rem] bg-[#070707] px-5 pt-5 pb-6">
                  <div className="mx-auto h-1.5 w-14 rounded-full bg-white/10" />

                  <div className="mt-5 flex items-end justify-between">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">
                        Your bill
                      </p>
                      <p className="font-display mt-1 text-xl">Your Café</p>
                    </div>
                    <span className="rounded-full border border-[#e8c382]/30 px-2.5 py-1 font-mono text-[10px] text-[#e8c382]">
                      T5
                    </span>
                  </div>

                  <ul className="mt-5 space-y-3 text-sm">
                    {[
                      ["Cappuccino", "× 2", "₹360"],
                      ["Paneer wrap", "× 1", "₹240"],
                    ].map(([name, qty, price]) => (
                      <li key={name} className="flex items-center gap-3">
                        <span className="font-display flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8c382]/10 text-lg text-[#e8c382]">
                          {name.charAt(0)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{name}</span>
                          <span className="text-xs text-white/35">{qty}</span>
                        </span>
                        <span className="tabular-nums text-white/80">
                          {price}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-5 space-y-1.5 border-t border-white/10 pt-4 text-xs text-white/40">
                    <p className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="tabular-nums">₹600</span>
                    </p>
                    <p className="flex justify-between">
                      <span>Tax · 5%</span>
                      <span className="tabular-nums">₹30</span>
                    </p>
                    <p className="flex justify-between pt-1.5 text-sm font-semibold text-white">
                      <span>Total</span>
                      <span className="tabular-nums">₹630</span>
                    </p>
                  </div>

                  <div className="mt-5 flex h-11 items-center justify-center rounded-full bg-[#f8f6f0] text-[13px] font-semibold text-[#070707]">
                    Pay ₹630 with UPI
                  </div>
                  <p className="mt-3 text-center text-[11px] text-white/30">
                    Staff confirm your payment
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 border border-white/10 bg-white/2 px-4 py-3 text-xs text-white/55">
              <Check size={14} className="text-[#e8c382]" />
              Payment received · ₹630 · UPI
            </div>
          </div>
        </section>

        {/* Three facts */}
        <section className="border-y border-white/10">
          <div className="mx-auto grid max-w-6xl divide-white/10 md:grid-cols-3 md:divide-x">
            {facts.map(([title, text]) => (
              <div
                key={title}
                className="border-b border-white/10 px-6 py-9 last:border-b-0 md:border-b-0"
              >
                <p className="font-display text-2xl">{title}</p>
                <p className="mt-2 max-w-xs text-sm leading-6 text-white/45">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works (the light band) */}
        <section id="how" className="scroll-mt-4 bg-[#e1e0cc] text-[#212121]">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <p className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.24em] text-[#212121]/60">
              <span>02</span>
              <span className="h-px w-8 bg-[#212121]/30" />
              How it works
            </p>
            <h2 className="font-display mt-6 max-w-2xl text-4xl leading-[1.05] tracking-[-0.02em] sm:text-5xl">
              From the table to the kitchen in three steps
            </h2>

            <ol className="mt-16 grid gap-10 md:grid-cols-3 md:gap-0 md:divide-x md:divide-[#212121]/15">
              {steps.map((s, i) => (
                <li
                  key={s.title}
                  className="border-t border-[#212121]/20 pt-7 md:border-t-0 md:px-8 md:pt-0 md:first:pl-0 md:last:pr-0"
                >
                  <span className="font-display text-6xl text-[#212121]/25">
                    0{i + 1}
                  </span>
                  <h3 className="font-display mt-6 text-3xl">{s.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#212121]/65">
                    {s.text}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Features */}
        <section className="relative mx-auto max-w-6xl px-6 py-24">
          <Label n="03">What you get</Label>
          <h2 className="font-display mt-6 max-w-2xl text-4xl leading-[1.05] tracking-[-0.02em] sm:text-5xl">
            Everything a busy café floor needs
          </h2>

          <div className="relative mt-14 grid border border-white/10 sm:grid-cols-2 lg:grid-cols-3">
            <Ticks />
            {features.map(([title, text], i) => (
              <div
                key={title}
                className="border-b border-white/10 p-8 sm:border-r lg:nth-of-type-[3n]:border-r-0 lg:[&:nth-last-of-type(-n+3)]:border-b-0 sm:nth-of-type-[2n]:border-r-0 lg:nth-of-type-[2n]:border-r"
              >
                <p className="font-mono text-[11px] text-[#e8c382]/70">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="font-display mt-6 text-2xl">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/45">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section
          id="faq"
          className="relative mx-auto max-w-3xl scroll-mt-4 px-6 pb-24"
        >
          <Label n="04">Questions</Label>
          <h2 className="font-display mt-6 text-4xl leading-[1.05] tracking-[-0.02em] sm:text-5xl">
            Good to know
          </h2>

          <div className="mt-10 divide-y divide-white/10 border-y border-white/10">
            {faqs.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="text-xl leading-none text-[#e8c382] transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/50">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Final call */}
        <section className="relative border-t border-white/10">
          <div className="mx-auto max-w-6xl px-6 py-28 text-center">
            <h2 className="font-display mx-auto max-w-3xl text-4xl leading-[1.05] tracking-[-0.02em] sm:text-6xl">
              Ready when your <span style={{ color: gold }}>first table</span>{" "}
              is.
            </h2>
            <p className="mx-auto mt-6 max-w-md text-sm leading-6 text-white/50">
              {SITE.company} sets up your café, your menu and your table QR
              codes with you.
            </p>
            <a
              href={SITE.companyUrl}
              className="group mt-10 inline-flex h-13 items-center gap-2 rounded-full bg-[#f8f6f0] px-7 text-sm font-semibold text-[#070707] transition hover:scale-[1.02] active:scale-[0.98]"
            >
              Talk to {SITE.company}
              <ArrowUpRight
                size={16}
                className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs text-white/35 sm:flex-row">
          <p>
            <span className="font-display text-base text-white/70">
              {SITE.name}
            </span>
            <span className="mx-2">·</span>
            Powered by{" "}
            <a
              href={SITE.companyUrl}
              className="text-white/60 underline-offset-4 hover:underline"
            >
              {SITE.company}
            </a>
          </p>
          <Link href="/login" className="transition hover:text-white/70">
            Staff sign in
          </Link>
        </div>
      </footer>
    </div>
  );
}
