export default function MenuNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0b0b0d] px-6 text-center text-[#f5f2ea]">
      <h1 className="text-2xl font-medium">We couldn&apos;t find that menu</h1>

      <p className="mt-3 max-w-sm text-sm leading-6 text-white/40">
        The link may be mistyped or out of date. If you&apos;re at a restaurant,
        scan the QR code on your table instead.
      </p>
    </main>
  );
}
