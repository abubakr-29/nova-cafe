"use client";

import { Minus, Plus, Users } from "lucide-react";
import { useState } from "react";

type GuestGateProps = {
  tableName: string;
  onConfirm: (guestCount: number) => void;
};

const MAX_GUESTS = 12;

export default function GuestGate({ tableName, onConfirm }: GuestGateProps) {
  const [guestCount, setGuestCount] = useState(1);

  return (
    <div className="fixed inset-0 z-130 flex items-center justify-center bg-[#0b0b0d] px-5">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#d7a45a]/30 bg-[#d7a45a]/10 text-[#d7a45a]">
          <Users size={26} strokeWidth={1.8} />
        </div>

        <p className="mt-6 text-xs uppercase tracking-[0.3em] text-[#d7a45a]">
          {tableName}
        </p>

        <h1 className="mt-3 text-3xl font-medium tracking-[-0.03em] text-white">
          How many are dining?
        </h1>

        <p className="mt-3 text-sm leading-6 text-white/40">
          This helps us split the bill and keep track of your table.
        </p>

        <div className="mt-8 flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={() => setGuestCount((current) => Math.max(1, current - 1))}
            disabled={guestCount <= 1}
            aria-label="Decrease guest count"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 text-white/60 transition hover:bg-white/5 hover:text-white disabled:cursor-default disabled:text-white/15 disabled:hover:bg-transparent"
          >
            <Minus size={18} />
          </button>

          <span className="w-16 text-4xl font-medium text-white">
            {guestCount}
          </span>

          <button
            type="button"
            onClick={() =>
              setGuestCount((current) => Math.min(MAX_GUESTS, current + 1))
            }
            disabled={guestCount >= MAX_GUESTS}
            aria-label="Increase guest count"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 text-white/60 transition hover:bg-white/5 hover:text-white disabled:cursor-default disabled:text-white/15 disabled:hover:bg-transparent"
          >
            <Plus size={18} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => onConfirm(guestCount)}
          className="mt-10 h-14 w-full rounded-full bg-[#f5f2ea] text-sm font-medium text-[#0b0b0d] transition hover:scale-[1.01] active:scale-[0.99]"
        >
          Start ordering
        </button>
      </div>
    </div>
  );
}
