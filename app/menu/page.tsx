export default function MenuFallbackPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0b0b0d] px-6 text-center text-[#f5f2ea]">
      <p className="text-xs uppercase tracking-[0.3em] text-white/40">NOVA</p>

      <h1 className="mt-4 text-2xl font-medium">
        Scan your table&apos;s QR code
      </h1>

      <p className="mt-3 max-w-sm text-sm leading-6 text-white/40">
        Each table has its own code that opens the menu for that table
        specifically. Look for it on your table, or ask a member of staff.
      </p>
    </main>
  );
}
