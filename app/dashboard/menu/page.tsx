"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  Bell,
  LayoutGrid,
  Menu,
  Settings,
  ShoppingBag,
  Utensils,
} from "lucide-react";

import { useRestaurantData } from "@/lib/restaurant-data-context";

export default function DashboardMenuPage() {
  const { menuItems, toggleItemAvailability } = useRestaurantData();
  const pathname = usePathname();

  return (
    <main className="min-h-screen bg-[#0b0b0d] text-[#f5f2ea]">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-60 shrink-0 border-r border-white/[0.07] bg-[#0d0d10] px-5 py-7 lg:flex lg:flex-col">
          <div className="px-3">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/35">
              NOVA
            </p>
            <p className="mt-1 text-lg font-medium">Café</p>
            <Link href="/menu" className="text-blue-400 hover:text-blue-300">
              Back to menu
            </Link>
          </div>

          <nav className="mt-10 space-y-1">
            <NavLink
              href="/dashboard"
              icon={<LayoutGrid size={16} />}
              label="Overview"
              active={pathname === "/dashboard"}
            />
            <NavLink
              href="/dashboard"
              icon={<Utensils size={16} />}
              label="Floor"
              active={false}
            />
            <NavLink
              href="/dashboard"
              icon={<ShoppingBag size={16} />}
              label="Orders"
              active={false}
            />
            <NavLink
              href="/dashboard/menu"
              icon={<Menu size={16} />}
              label="Menu"
              active={pathname === "/dashboard/menu"}
            />
          </nav>

          <div className="mt-auto space-y-1">
            <NavLink
              href="/dashboard"
              icon={<Settings size={16} />}
              label="Settings"
              active={false}
            />
          </div>
        </aside>

        {/* Main */}
        <div className="min-w-0 flex-1">
          <header className="flex h-20 items-center justify-between border-b border-white/[0.07] px-6 md:px-10">
            <div>
              <p className="text-xs text-white/25">NOVA Café</p>
              <p className="mt-1 text-sm text-white/60">Menu management</p>
            </div>

            <button
              type="button"
              aria-label="Notifications"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/40 transition hover:bg-white/5 hover:text-white"
            >
              <Bell size={16} />
            </button>
          </header>

          <div className="mx-auto max-w-375 px-6 py-8 md:px-10">
            <p className="text-xs uppercase tracking-[0.25em] text-[#d7a45a]">
              Menu
            </p>

            <h1 className="mt-3 text-3xl font-medium tracking-[-0.03em] md:text-4xl">
              Item availability
            </h1>

            <p className="mt-2 text-sm text-white/30">
              Toggle items off when you run out. Changes reflect on the customer
              menu instantly.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {menuItems.map((item) => {
                const available = item.available !== false;

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.07] bg-white/2.5 p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white/80">
                        {item.name}
                      </p>
                      <p className="mt-1 text-xs text-white/30">
                        {item.category} · ₹{item.price}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleItemAvailability(item.id)}
                      aria-label={`${available ? "Mark sold out" : "Mark available"}: ${item.name}`}
                      className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                        available ? "bg-[#d7a45a]" : "bg-white/10"
                      }`}
                    >
                      <span
                        className={`absolute top-1 h-5 w-5 rounded-full bg-[#0b0b0d] transition-transform ${
                          available ? "translate-x-0" : "-translate-x-5"
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function NavLink({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
        active
          ? "bg-white/6 text-white"
          : "text-white/35 hover:bg-white/4 hover:text-white/70"
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
