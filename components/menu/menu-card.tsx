import { Plus, Leaf } from "lucide-react";
import Image from "next/image";
import type { MenuItem } from "@/types/menu";

type MenuCardProps = {
  item: MenuItem;
  onSelect: (item: MenuItem) => void;
};

export default function MenuCard({ item, onSelect }: MenuCardProps) {
  const soldOut = item.available === false;

  return (
    <article
      onClick={() => {
        if (!soldOut) onSelect(item);
      }}
      onKeyDown={(event) => {
        if (!soldOut && (event.key === "Enter" || event.key === " ")) {
          onSelect(item);
        }
      }}
      role="button"
      tabIndex={soldOut ? -1 : 0}
      aria-disabled={soldOut}
      className={`group overflow-hidden rounded-[28px] border border-white/8 bg-white/[0.035] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/20 ${
        soldOut
          ? "cursor-default opacity-45"
          : "cursor-pointer hover:-translate-y-1 hover:border-white/[0.14] hover:bg-white/5.5"
      }`}
    >
      {/* Image */}
      <div className="relative aspect-4/3 overflow-hidden bg-white/4">
        <Image
          src={item.image}
          alt={item.name}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className={`h-full w-full object-cover transition duration-700 ${
            soldOut ? "grayscale" : "group-hover:scale-105"
          }`}
        />

        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0b0b0d]/60">
            <span className="rounded-full border border-white/20 bg-[#0b0b0d]/80 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-white/70">
              Sold out
            </span>
          </div>
        )}

        {item.popular && !soldOut && (
          <div className="absolute left-4 top-4 rounded-full bg-[#f5f2ea] px-3 py-1.5 text-xs font-medium text-[#0b0b0d]">
            Popular
          </div>
        )}

        {item.vegetarian && (
          <div className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#0b0b0d]/70 text-green-400 backdrop-blur-md">
            <Leaf size={14} strokeWidth={2.5} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-medium tracking-tight text-white">
              {item.name}
            </h3>

            <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/40">
              {item.description}
            </p>
          </div>

          <p className="shrink-0 text-sm font-medium text-white/80">
            ₹{item.price}
          </p>
        </div>

        <button
          onClick={(event) => {
            event.stopPropagation();
            if (!soldOut) onSelect(item);
          }}
          disabled={soldOut}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full border border-white/10 py-3 text-sm font-medium text-white/80 transition-all hover:border-white/20 hover:bg-white hover:text-[#0b0b0d] active:scale-[0.98] disabled:cursor-default disabled:opacity-50 disabled:hover:border-white/10 disabled:hover:bg-transparent disabled:hover:text-white/80"
        >
          <Plus size={16} />
          {soldOut ? "Sold out" : "Customize"}
        </button>
      </div>
    </article>
  );
}
