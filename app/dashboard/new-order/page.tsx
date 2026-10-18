"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";

import CartDrawer from "@/components/cart/cart-drawer";
import MenuBrowser from "@/components/menu/menu-browser";
import MenuItemSheet from "@/components/menu/menu-item-sheet";
import {
  MAX_ITEM_QUANTITY,
  areCartItemsEquivalent,
  getCartItemUnitPrice,
  removeCartItem,
  updateCartItemQuantity,
} from "@/lib/cart";
import { mapMenuItems, type MenuItemRow } from "@/lib/menu-mapping";
import { toOrderLines } from "@/lib/order-payload";
import {
  applyBookingHold,
  formatBookingTime,
  useNow,
} from "@/lib/reservations";
import { useStaffData } from "@/lib/staff-data-context";
import { createClient } from "@/lib/supabase/client";
import { compareTableNames } from "@/lib/table-layout";
import type { CartItem } from "@/types/cart";
import type { MenuCategory, MenuItem } from "@/types/menu";
import type { TableGuest } from "@/types/session";

export default function NewOrderPage() {
  // useSearchParams needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <NewOrderScreen />
    </Suspense>
  );
}

type Menu = { categories: MenuCategory[]; items: MenuItem[] };
type Sent = { orderNumber: string; tableName: string };

function NewOrderScreen() {
  const { restaurantId, restaurantName, tables, sessions } = useStaffData();
  const searchParams = useSearchParams();
  const now = useNow();
  const [supabase] = useState(() => createClient());

  // undefined = follow the ?table= link, null = the person asked to pick again.
  const [override, setOverride] = useState<string | null | undefined>(
    undefined,
  );
  const requested = searchParams.get("table");
  const tableId =
    override !== undefined
      ? override
      : requested && tables.some((t) => t.id === requested)
        ? requested
        : null;

  const [menu, setMenu] = useState<Menu | null>(null);
  const [menuFailed, setMenuFailed] = useState(false);

  const [guestCount, setGuestCount] = useState(1);
  const [orderingFor, setOrderingFor] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<Sent | null>(null);

  // The menu is the same one customers see.
  useEffect(() => {
    if (!restaurantId) return;

    let ignore = false;

    async function load() {
      const [categoriesResult, itemsResult] = await Promise.all([
        supabase
          .from("menu_categories")
          .select("id, name")
          .eq("restaurant_id", restaurantId)
          .order("sort_order"),
        supabase
          .from("menu_items")
          .select(
            "id, name, description, price, image_url, available, diet, category_id, sort_order, menu_item_sizes(id, name, price, sort_order), menu_item_addons(id, name, price, sort_order)",
          )
          .eq("restaurant_id", restaurantId)
          .order("sort_order"),
      ]);

      if (ignore) return;

      if (categoriesResult.error || itemsResult.error) {
        setMenuFailed(true);
        return;
      }

      const categories = (categoriesResult.data ?? []) as MenuCategory[];
      const nameById = new Map(categories.map((c) => [c.id, c.name]));

      setMenu({
        categories,
        items: mapMenuItems(
          (itemsResult.data ?? []) as MenuItemRow[],
          nameById,
        ),
      });
    }

    load();

    return () => {
      ignore = true;
    };
  }, [supabase, restaurantId]);

  const sortedTables = [...tables].sort((a, b) =>
    compareTableNames(a.name, b.name),
  );

  const rawTable = tables.find((t) => t.id === tableId) ?? null;
  const table = rawTable ? applyBookingHold(rawTable, now) : null;
  const session = table
    ? (sessions.find((s) => s.tableId === table.id && s.status !== "closed") ??
      null)
    : null;

  const paid = session?.paymentStatus === "paid";

  // Guests: the real ones when someone is already seated, otherwise "Guest 1..N".
  const guests: TableGuest[] =
    session?.guests ??
    Array.from({ length: guestCount }, (_, i) => ({
      id: `new-${i + 1}`,
      name: `Guest ${i + 1}`,
    }));

  const activeGuestIndex =
    guests.length > 0 ? Math.min(orderingFor, guests.length) : undefined;

  // ---- cart (same rules as the customer page) ----
  function addToCart(item: CartItem) {
    setCart((current) => {
      const existingIndex = current.findIndex((line) =>
        areCartItemsEquivalent(line, item),
      );

      if (existingIndex === -1) return [...current, item];

      return current.map((line, index) =>
        index === existingIndex
          ? {
              ...line,
              quantity: Math.min(
                MAX_ITEM_QUANTITY,
                line.quantity + item.quantity,
              ),
            }
          : line,
      );
    });
  }

  function changeQuantity(cartItemId: string, quantity: number) {
    setCart((current) => updateCartItemQuantity(current, cartItemId, quantity));
  }

  function removeLine(cartItemId: string) {
    setCart((current) => removeCartItem(current, cartItemId));
  }

  function plainCartItem(item: MenuItem): CartItem {
    return {
      cartItemId: "",
      menuItemId: item.id,
      name: item.name,
      basePrice: item.price,
      quantity: 1,
      addons: [],
      image: item.image,
      guestIndex: activeGuestIndex,
    };
  }

  function findPlainLine(item: MenuItem) {
    const probe = plainCartItem(item);
    return cart.find((line) => areCartItemsEquivalent(line, probe));
  }

  function quickAdd(item: MenuItem) {
    if ((item.sizes?.length ?? 0) > 0 || (item.addons?.length ?? 0) > 0) {
      setSelectedItem(item);
      return;
    }

    addToCart({ ...plainCartItem(item), cartItemId: crypto.randomUUID() });
  }

  function quickRemove(item: MenuItem) {
    const line = findPlainLine(item);
    if (line) changeQuantity(line.cartItemId, line.quantity - 1);
  }

  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const cartTotal = cart.reduce(
    (sum, line) => sum + getCartItemUnitPrice(line) * line.quantity,
    0,
  );

  function pickTable(id: string | null) {
    setOverride(id);
    setCart([]);
    setError(null);
    setSent(null);
    setOrderingFor(1);
  }

  async function handleSend() {
    if (!table || cart.length === 0 || submitting) return;

    setSubmitting(true);
    setError(null);

    const { data, error: rpcError } = await supabase.rpc("staff_place_order", {
      p_table_id: table.id,
      p_guest_count: session ? session.guests.length : guestCount,
      p_items: toOrderLines(cart),
    });

    setSubmitting(false);

    if (rpcError || !data || data.length === 0) {
      // The database's messages are written to be read by staff.
      setError(
        rpcError?.message || "Couldn't send the order. Please try again.",
      );
      return;
    }

    setCart([]);
    setCartOpen(false);
    setSent({ orderNumber: data[0].order_number, tableName: table.name });
  }

  const guestPicker =
    guests.length > 1 ? (
      <div
        role="group"
        aria-label="Ordering for"
        className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden"
      >
        <span className="shrink-0 text-[11px] text-white/35">Ordering for</span>

        {guests.map((guest, index) => {
          const selected = activeGuestIndex === index + 1;

          return (
            <button
              key={guest.id}
              type="button"
              aria-pressed={selected}
              onClick={() => setOrderingFor(index + 1)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs transition cursor-pointer ${
                selected
                  ? "border-[#d7a45a]/60 bg-[#d7a45a]/10 text-[#d7a45a]"
                  : "border-white/10 text-white/55 hover:bg-white/5"
              }`}
            >
              {guest.name}
            </button>
          );
        })}
      </div>
    ) : null;

  return (
    <>
      <header className="flex h-20 items-center justify-between border-b border-white/[0.07] px-6 md:px-10">
        <div>
          <p className="text-xs text-white/25">{restaurantName}</p>
          <p className="mt-1 text-sm text-white/60">Take an order</p>
        </div>

        {table && !sent && (
          <button
            type="button"
            onClick={() => pickTable(null)}
            className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/60 transition hover:bg-white/5 hover:text-white cursor-pointer"
          >
            Change table
          </button>
        )}
      </header>

      {/* ---- 1. choose a table ---- */}
      {!table && (
        <div className="mx-auto max-w-4xl px-6 py-8 md:px-10">
          <h1 className="text-sm font-medium">Which table is this for?</h1>

          {sortedTables.length === 0 ? (
            <p className="mt-6 text-sm text-white/40">
              There are no tables yet. Add them under Tables first.
            </p>
          ) : (
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {sortedTables.map((t) => {
                const shown = applyBookingHold(t, now);
                const open = sessions.find(
                  (s) => s.tableId === t.id && s.status !== "closed",
                );
                const isPaid = open?.paymentStatus === "paid";

                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      disabled={isPaid}
                      onClick={() => pickTable(t.id)}
                      className="flex w-full flex-col items-start rounded-2xl border border-white/8 bg-white/2 p-4 text-left transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                    >
                      <span className="text-sm font-medium">{t.name}</span>
                      <span className="mt-1 text-[11px] text-white/40">
                        {isPaid
                          ? "Paid · free it first"
                          : open
                            ? `Occupied · ${open.guests.length} ${open.guests.length === 1 ? "guest" : "guests"}`
                            : shown.status === "reserved"
                              ? "Reserved"
                              : "Available"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* ---- 3. order sent ---- */}
      {table && sent && (
        <div className="mx-auto max-w-md px-6 py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-300">
            <Check size={24} />
          </div>

          <h1 className="mt-5 text-lg font-medium">
            Order sent to the kitchen
          </h1>

          <p className="mt-2 text-sm text-white/50">
            {sent.tableName} · order #{sent.orderNumber}
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setSent(null)}
              className="h-12 rounded-full bg-[#f5f2ea] text-sm font-medium text-[#0b0b0d]"
            >
              Add another order for {sent.tableName}
            </button>

            <button
              type="button"
              onClick={() => pickTable(null)}
              className="h-12 rounded-full border border-white/10 text-sm text-white/60 transition hover:bg-white/5"
            >
              Take an order for another table
            </button>

            <Link
              href="/dashboard"
              className="py-2 text-xs text-white/35 transition hover:text-white/60"
            >
              Back to the floor
            </Link>
          </div>
        </div>
      )}

      {/* ---- 2. take the order ---- */}
      {table && !sent && (
        <>
          <div className="mx-auto max-w-2xl px-4 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-medium">{table.name}</p>
                <p className="mt-0.5 text-xs text-white/40">
                  {session
                    ? `Adding to the open session · ${session.guests.length} ${session.guests.length === 1 ? "guest" : "guests"}`
                    : "New session"}
                </p>
              </div>

              {!session && (
                <div
                  role="group"
                  aria-label="Number of guests"
                  className="flex items-center gap-1 rounded-full border border-white/10 p-1"
                >
                  <button
                    type="button"
                    aria-label="Fewer guests"
                    disabled={guestCount <= 1}
                    onClick={() => setGuestCount((n) => Math.max(1, n - 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition hover:bg-white/8 disabled:opacity-30"
                  >
                    <Minus size={14} />
                  </button>

                  <span className="min-w-20 text-center text-xs text-white/70">
                    {guestCount} {guestCount === 1 ? "guest" : "guests"}
                  </span>

                  <button
                    type="button"
                    aria-label="More guests"
                    disabled={guestCount >= 30}
                    onClick={() => setGuestCount((n) => Math.min(30, n + 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition hover:bg-white/8 disabled:opacity-30"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              )}
            </div>

            {table.status === "reserved" && !session && (
              <p className="mt-4 rounded-2xl border border-blue-300/20 bg-blue-300/6 px-4 py-3 text-xs leading-5 text-blue-100/80">
                This table is reserved
                {table.reservedFor
                  ? ` for ${formatBookingTime(table.reservedFor, now)}`
                  : ""}
                {table.reservationNote ? ` (${table.reservationNote})` : ""}.
                Sending an order seats those guests and ends the booking.
              </p>
            )}
          </div>

          {paid ? (
            <p className="mx-auto mt-8 max-w-md px-6 text-center text-sm text-white/50">
              This table has already paid. Free the table on the floor before
              taking a new order.
            </p>
          ) : menuFailed ? (
            <p className="mx-auto mt-8 max-w-md px-6 text-center text-sm text-red-300/80">
              Couldn&apos;t load the menu. Please refresh the page.
            </p>
          ) : !menu ? (
            <p className="mt-8 text-center text-sm text-white/30">
              Loading the menu…
            </p>
          ) : (
            <div className="mt-3">
              <MenuBrowser
                categories={menu.categories}
                items={menu.items}
                quickQuantity={(item) => findPlainLine(item)?.quantity ?? 0}
                totalQuantity={(item) =>
                  cart.reduce(
                    (sum, line) =>
                      line.menuItemId === item.id ? sum + line.quantity : sum,
                    0,
                  )
                }
                onQuickAdd={quickAdd}
                onQuickRemove={quickRemove}
                onOpenItem={setSelectedItem}
                stickyExtra={guestPicker}
                stickyClassName="top-16 lg:top-0"
              />
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="fixed left-1/2 top-24 z-120 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-red-300/20 bg-[#1a1114] px-5 py-4 text-sm text-red-200 shadow-2xl"
            >
              {error}
            </div>
          )}

          {cartCount > 0 && (
            <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#0b0b0d]/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl lg:left-60">
              <button
                type="button"
                onClick={() => {
                  setSelectedItem(null);
                  setError(null);
                  setCartOpen(true);
                }}
                className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between rounded-full bg-[#f5f2ea] px-6 text-sm font-medium text-[#0b0b0d] transition hover:scale-[1.01] active:scale-[0.99]"
              >
                <span className="flex items-center gap-2">
                  <ShoppingBag size={16} />
                  {cartCount} {cartCount === 1 ? "item" : "items"}
                </span>

                <span>Review order · ₹{cartTotal}</span>
              </button>
            </div>
          )}

          <MenuItemSheet
            key={selectedItem?.id ?? "closed"}
            item={selectedItem}
            guests={guests}
            defaultGuestIndex={activeGuestIndex}
            onClose={() => setSelectedItem(null)}
            onAdd={(line) => {
              addToCart(line);
              setSelectedItem(null);
            }}
          />

          <CartDrawer
            items={cart}
            guests={guests}
            open={cartOpen}
            onClose={() => setCartOpen(false)}
            onQuantityChange={changeQuantity}
            onRemove={removeLine}
            onPlaceOrder={handleSend}
            submitting={submitting}
            tableName={table.name}
          />
        </>
      )}
    </>
  );
}
