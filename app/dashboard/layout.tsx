"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  LayoutGrid,
  Menu as MenuIcon,
  Settings,
  ShoppingBag,
  Utensils,
  X,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", icon: LayoutGrid, label: "Overview" },
  { href: "/dashboard", icon: Utensils, label: "Floor" },
  { href: "/dashboard", icon: ShoppingBag, label: "Orders" },
  { href: "/dashboard/menu", icon: MenuIcon, label: "Menu" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <main className="min-h-screen bg-[#0b0b0d] text-[#f5f2ea]">
      <div className="flex min-h-screen">
        {/* Sidebar — desktop */}
        <aside className="hidden w-60 shrink-0 border-r border-white/[0.07] bg-[#0d0d10] px-5 py-7 lg:flex lg:flex-col">
          <div className="px-3">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/35">
              NOVA
            </p>

            <p className="mt-1 text-lg font-medium">Café</p>
          </div>

          <nav className="mt-10 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.label}
                href={item.href}
                icon={<item.icon size={16} />}
                label={item.label}
                active={pathname === item.href}
              />
            ))}
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

        {/* Mobile top bar */}
        <div className="fixed inset-x-0 top-0 z-90 flex h-16 items-center justify-between border-b border-white/[0.07] bg-[#0d0d10]/95 px-5 backdrop-blur-md lg:hidden">
          <div>
            <p className="text-[9px] uppercase tracking-[0.3em] text-white/35">
              NOVA
            </p>
            <p className="text-sm font-medium">Café</p>
          </div>

          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/60 transition hover:bg-white/5"
          >
            <MenuIcon size={18} />
          </button>
        </div>

        {/* Mobile nav drawer */}
        {mobileNavOpen && (
          <div className="fixed inset-0 z-100 lg:hidden">
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setMobileNavOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />

            <aside className="absolute left-0 top-0 flex h-full w-72 max-w-[80vw] flex-col border-r border-white/8 bg-[#0d0d10] px-5 py-7 shadow-2xl">
              <div className="flex items-start justify-between px-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-white/35">
                    NOVA
                  </p>
                  <p className="mt-1 text-lg font-medium">Café</p>
                </div>

                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  aria-label="Close"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/40 transition hover:bg-white/5"
                >
                  <X size={15} />
                </button>
              </div>

              <nav className="mt-10 space-y-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.label}
                    href={item.href}
                    icon={<item.icon size={16} />}
                    label={item.label}
                    active={pathname === item.href}
                    onClick={() => setMobileNavOpen(false)}
                  />
                ))}
              </nav>

              <div className="mt-auto space-y-1">
                <NavLink
                  href="/dashboard"
                  icon={<Settings size={16} />}
                  label="Settings"
                  active={false}
                  onClick={() => setMobileNavOpen(false)}
                />
              </div>
            </aside>
          </div>
        )}

        {/* Main */}
        <div className="min-w-0 flex-1 pt-16 lg:pt-0">{children}</div>
      </div>
    </main>
  );
}

function NavLink({
  href,
  icon,
  label,
  active,
  onClick,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
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
