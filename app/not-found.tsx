import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0b0b0d] px-6 text-center text-[#f5f2ea]">
      <p className="text-xs font-medium uppercase tracking-[0.28em] text-[#d99a76]">
        Error 404
      </p>
      <h1 className="mt-4 text-4xl font-medium tracking-[-0.04em]">
        This page is not here
      </h1>
      <p className="mt-3 max-w-xs text-sm leading-6 text-white/45">
        The link may be old or mistyped. If you were trying to order, scan the
        QR code on your table again.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-full bg-[#f5f2ea] px-6 py-3 text-sm font-medium text-[#0b0b0d] transition hover:scale-[1.02] active:scale-[0.98]"
      >
        Go to the home page
      </Link>
    </main>
  );
}
