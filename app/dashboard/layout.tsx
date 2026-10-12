"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutGrid,
  LogOut,
  Menu as MenuIcon,
  Settings,
  User,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { StaffDataProvider, useStaffData } from "@/lib/staff-data-context";

const baseNavItems = [
  { href: "/dashboard", icon: LayoutGrid, label: "Floor & orders" },
  { href: "/dashboard/menu", icon: MenuIcon, label: "Menu" },
];

const staffNavItem = { href: "/dashboard/staff", icon: User, label: "Staff" };

// The provider has to sit ABOVE anything that calls useStaffData(), so the
// layout is just the provider and the real shell is a child of it.
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <StaffDataProvider>
      <DashboardShell>{children}</DashboardShell>
    </StaffDataProvider>
  );
}

function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { loading, restaurantId, restaurantName } = useStaffData();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  useEffect(() => {
    let ignore = false;
    const supabase = createClient();

    async function checkRole() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || ignore) return;

      const { data: profile } = await supabase
        .from("staff_profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!ignore) setIsOwner(profile?.role === "owner");
    }

    checkRole();

    return () => {
      ignore = true;
    };
  }, []);

  const navItems = isOwner ? [...baseNavItems, staffNavItem] : baseNavItems;

  // "/dashboard" only matches itself; every other item also matches its
  // sub-paths, so e.g. /dashboard/menu/anything still highlights Menu.
  function isActive(href: string) {
    return href === "/dashboard"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);
  }

  // Loading has finished and this account isn't linked to any restaurant
  // (or the restaurant couldn't be loaded).
  if (!loading && !restaurantId) {
    return <NotSetUpScreen onSignOut={handleSignOut} />;
  }

  return (
    <main className="h-screen overflow-hidden bg-[#0b0b0d] text-[#f5f2ea]">
      <div className="flex h-screen">
        {/* Sidebar — desktop */}
        <aside className="hidden w-60 shrink-0 flex-col overflow-y-auto border-r border-white/[0.07] bg-[#0d0d10] px-5 py-7 lg:flex lg:h-screen">
          <div className="px-3">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/35">
              Dashboard
            </p>

            <p className="mt-1 line-clamp-2 wrap-break-word text-lg font-medium">
              {restaurantName}
            </p>
          </div>

          <nav className="mt-10 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                icon={<item.icon size={16} />}
                label={item.label}
                active={isActive(item.href)}
              />
            ))}
          </nav>

          <div className="mt-auto space-y-1">
            <NavLink
              href="/dashboard/settings"
              icon={<Settings size={16} />}
              label="Settings"
              active={isActive("/dashboard/settings")}
            />
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/35 transition hover:bg-white/4 hover:text-white/70"
            >
              <LogOut size={16} />
              <span>Sign out</span>
            </button>
          </div>
        </aside>

        {/* Mobile top bar */}
        <div className="fixed inset-x-0 top-0 z-90 flex h-16 items-center justify-between border-b border-white/[0.07] bg-[#0d0d10]/95 px-5 backdrop-blur-md lg:hidden">
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-[0.3em] text-white/35">
              Dashboard
            </p>
            <p className="truncate text-sm font-medium">{restaurantName}</p>
          </div>

          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
            className="ml-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/60 transition hover:bg-white/5"
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
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-white/35">
                    Dashboard
                  </p>
                  <p className="mt-1 line-clamp-2 wrap-break-word text-lg font-medium">
                    {restaurantName}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  aria-label="Close"
                  className="ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/40 transition hover:bg-white/5"
                >
                  <X size={15} />
                </button>
              </div>

              <nav className="mt-10 space-y-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    icon={<item.icon size={16} />}
                    label={item.label}
                    active={isActive(item.href)}
                    onClick={() => setMobileNavOpen(false)}
                  />
                ))}
              </nav>

              <div className="mt-auto space-y-1">
                <NavLink
                  href="/dashboard/settings"
                  icon={<Settings size={16} />}
                  label="Settings"
                  active={isActive("/dashboard/settings")}
                  onClick={() => setMobileNavOpen(false)}
                />
                <button
                  type="button"
                  onClick={() => {
                    setMobileNavOpen(false);
                    handleSignOut();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/35 transition hover:bg-white/4 hover:text-white/70"
                >
                  <LogOut size={16} />
                  <span>Sign out</span>
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Main */}
        <div className="min-w-0 flex-1 overflow-y-auto pt-16 lg:pt-0">
          {children}
        </div>
      </div>
    </main>
  );
}

function NotSetUpScreen({ onSignOut }: { onSignOut: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0b0d] px-6 text-[#f5f2ea]">
      <div className="w-full max-w-md text-center">
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/35">
          Account not ready
        </p>

        <h1 className="mt-4 text-2xl font-medium">
          Your restaurant isn&apos;t set up yet
        </h1>

        <p className="mt-4 text-sm leading-relaxed text-white/50">
          You&apos;re signed in, but we couldn&apos;t find a restaurant linked
          to this account. Ask whoever created your account to finish the setup,
          then reload this page.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full bg-white/10 px-5 py-2.5 text-sm transition hover:bg-white/15 cursor-pointer"
          >
            Reload
          </button>

          <button
            type="button"
            onClick={onSignOut}
            className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-white/50 transition hover:bg-white/5 hover:text-white/70 cursor-pointer"
          >
            Sign out
          </button>
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
