"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

type TableDetailSheetProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

// Wraps the table details: a bottom sheet on phones, a side drawer on larger screens.
export default function TableDetailSheet({
  open,
  onClose,
  children,
}: TableDetailSheetProps) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-80">
      <button
        type="button"
        aria-label="Close table details"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Table details"
        className="animate-sheet absolute inset-x-0 bottom-0 flex max-h-[90vh] flex-col overflow-hidden rounded-t-[28px] border border-white/8 bg-[#111114] md:animate-drawer md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-105 md:rounded-l-[28px] md:rounded-tr-none"
      >
        <div className="flex items-center justify-between px-5 pt-4">
          <span className="h-1 w-10 rounded-full bg-white/15 md:hidden" />

          <span className="hidden md:block" />

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-3 text-sm text-white/55 transition hover:bg-white/6 hover:text-white"
          >
            <X size={15} />
            Close
          </button>
        </div>

        <div className="nova-scrollbar min-h-0 flex-1 overflow-y-auto [&>aside]:min-h-0 [&>aside]:rounded-none [&>aside]:border-0 [&>aside]:bg-transparent">
          {children}
        </div>
      </div>
    </div>
  );
}
