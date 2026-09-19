"use client";

import { Search, ShoppingBag, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import MenuCard from "@/components/menu/menu-card";
import CartDrawer from "@/components/cart/cart-drawer";
import type { MenuItem } from "@/types/menu";
import MenuItemSheet from "@/components/menu/menu-item-sheet";
import type { CartItem } from "@/types/cart";
import OrderConfirmation from "@/components/orders/order-confirmation";
import {
  areCartItemsEquivalent,
  getCartItemDetails,
  getCartItemUnitPrice,
  MAX_ITEM_QUANTITY,
  removeCartItem,
  updateCartItemQuantity,
} from "@/lib/cart";
import {
  RestaurantDataProvider,
  useRestaurantData,
} from "@/lib/restaurant-data-context";
import BillView from "@/components/customer/bill-view";
import GuestGate from "@/components/customer/guest-gate";
import type { TableGuest } from "@/types/session";

type MenuPageClientProps = {
  restaurantSlug: string;
  tableId: string;
};

// Thin wrapper: this is where the per-URL restaurant gets resolved for the
// customer flow (Phase 5) — everything below reads it back out of context
// via useRestaurantData(), same as before.
export default function MenuPageClient({
  restaurantSlug,
  tableId,
}: MenuPageClientProps) {
  return (
    <RestaurantDataProvider restaurantSlug={restaurantSlug} tableId={tableId}>
      <MenuPage tableId={tableId} />
    </RestaurantDataProvider>
  );
}

function MenuPage({ tableId }: { tableId: string }) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [billViewOpen, setBillViewOpen] = useState(false);
  const [pendingGuestCount, setPendingGuestCount] = useState<number | null>(
    null,
  );
  const [orderError, setOrderError] = useState<string | null>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // Auto-dismiss the order error banner after a few seconds rather than
  // leaving it stuck on screen.
  useEffect(() => {
    if (!orderError) return;
    const timer = setTimeout(() => setOrderError(null), 5000);
    return () => clearTimeout(timer);
  }, [orderError]);

  const {
    loading,
    restaurantId,
    orders,
    sessions,
    menuItems,
    menuCategories,
    tables,
    placeOrder,
    cancelOrderAsCustomer,
    requestBillAsCustomer,
    confirmPaymentAsCustomer,
  } = useRestaurantData();

  const categories = useMemo(
    () => ["All", ...menuCategories.map((category) => category.name)],
    [menuCategories],
  );

  const currentTable = tables.find((table) => table.id === tableId) ?? null;

  const currentSession = currentTable
    ? (sessions.find(
        (session) =>
          session.tableId === currentTable.id && session.status !== "closed",
      ) ?? null)
    : null;

  const needsGuestGate =
    !!currentTable && !currentSession && pendingGuestCount === null;

  const displayGuests: TableGuest[] = currentSession
    ? currentSession.guests
    : Array.from({ length: pendingGuestCount ?? 1 }, (_, index) => ({
        id: `pending-guest-${index + 1}`,
        name: `Guest ${index + 1}`,
      }));

  const liveCurrentOrder = currentOrderId
    ? (orders.find((order) => order.id === currentOrderId) ?? null)
    : null;

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCategory =
        activeCategory === "All" || item.category === activeCategory;

      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, search, menuItems]);

  function addToCart(item: CartItem) {
    setCart((current) => {
      const existingIndex = current.findIndex((cartItem) =>
        areCartItemsEquivalent(cartItem, item),
      );

      if (existingIndex === -1) {
        return [...current, item];
      }

      return current.map((cartItem, index) => {
        if (index !== existingIndex) {
          return cartItem;
        }

        return {
          ...cartItem,
          quantity: Math.min(
            MAX_ITEM_QUANTITY,
            cartItem.quantity + item.quantity,
          ),
        };
      });
    });
  }

  function removeFromCart(cartItemId: string) {
    setCart((current) => removeCartItem(current, cartItemId));
  }

  function changeCartItemQuantity(cartItemId: string, quantity: number) {
    setCart((current) => updateCartItemQuantity(current, cartItemId, quantity));
  }

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  const cartTotal = cart.reduce(
    (total, item) => total + getCartItemUnitPrice(item) * item.quantity,
    0,
  );

  async function handlePlaceOrder() {
    if (cart.length === 0 || !currentTable || isPlacingOrder) {
      return;
    }

    setOrderError(null);
    setIsPlacingOrder(true);

    const result = await placeOrder(
      currentTable.id,
      cart,
      currentSession?.guests.length ?? pendingGuestCount ?? 1,
    );

    setIsPlacingOrder(false);

    if (!result.ok) {
      setOrderError(result.error);
      return;
    }

    setCurrentOrderId(result.orderId);
    setPendingGuestCount(null);

    setCart([]);
    setCartDrawerOpen(false);
  }

  function handleRequestBill() {
    if (!currentSession) {
      return;
    }

    requestBillAsCustomer(currentSession.id);
  }

  function handleCancelCurrentOrder() {
    if (!liveCurrentOrder) {
      return;
    }

    cancelOrderAsCustomer(liveCurrentOrder.id);
    setCurrentOrderId(null);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0b0b0d] text-white/40">
        Loading menu...
      </main>
    );
  }

  if (!restaurantId) {
    return (
      <NotFoundScreen
        title="We couldn't find this café."
        message="Please check the QR code on your table and try scanning it again."
      />
    );
  }

  if (!currentTable) {
    return (
      <NotFoundScreen
        title="We couldn't find this table."
        message="Please check the QR code on your table and try scanning it again."
      />
    );
  }

  if (needsGuestGate) {
    return (
      <GuestGate
        tableName={currentTable.name}
        onConfirm={setPendingGuestCount}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#0b0b0d] text-[#f5f2ea]">
      <div className="mx-auto max-w-7xl px-6 py-8 md:px-10">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">
              NOVA
            </p>

            <h1 className="mt-1 text-xl font-medium">Café</h1>
          </div>

          <button className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/60 transition hover:bg-white/5">
            {currentTable.name}
          </button>
        </header>

        {currentSession?.billRequested &&
          currentSession.paymentStatus === "unpaid" && (
            <button
              type="button"
              onClick={() => setBillViewOpen(true)}
              className="mt-6 flex w-full items-center justify-between rounded-2xl border border-[#d7a45a]/25 bg-[#d7a45a]/8 px-5 py-4 text-left transition hover:bg-[#d7a45a]/12"
            >
              <span className="text-xs text-[#d7a45a]">Your bill is ready</span>
              <span className="text-xs font-medium text-[#d7a45a]">
                View bill →
              </span>
            </button>
          )}

        {/* Hero */}
        <section className="mt-20">
          <p className="text-sm uppercase tracking-[0.25em] text-[#d7a45a]">
            Our menu
          </p>

          <div className="mt-4 flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <h2 className="max-w-3xl text-5xl font-medium tracking-[-0.04em] md:text-6xl">
              What are you
              <br />
              craving?
            </h2>

            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search the menu..."
                className="w-full rounded-full border border-white/10 bg-white/[0.035] py-3.5 pl-11 pr-5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/20"
              />
            </div>
          </div>
        </section>

        {/* Categories */}
        <div className="mt-12 flex gap-2 overflow-x-auto pb-2">
          {categories.map((category) => {
            const active = category === activeCategory;

            return (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`shrink-0 rounded-full px-5 py-2.5 text-sm transition ${
                  active
                    ? "bg-[#f5f2ea] text-[#0b0b0d]"
                    : "border border-white/10 text-white/45 hover:border-white/20 hover:text-white"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        {/* Menu */}
        <section className="mt-8">
          {filteredItems.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map((item) => (
                <MenuCard
                  key={item.id}
                  item={item}
                  onSelect={setSelectedItem}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[28px] border border-white/10 py-20 text-center">
              <p className="text-lg text-white/70">Nothing found.</p>

              <p className="mt-2 text-sm text-white/30">
                Try another search or category.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Order error banner */}
      {orderError && (
        <div className="fixed top-6 left-1/2 z-50 w-[calc(100%-32px)] max-w-xl -translate-x-1/2">
          <div className="rounded-2xl border border-red-400/20 bg-red-950/80 px-5 py-3 text-center text-sm text-red-200 shadow-2xl backdrop-blur-xl">
            {orderError}
          </div>
        </div>
      )}

      {/* Floating Cart */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 w-[calc(100%-32px)] max-w-xl -translate-x-1/2">
          <div className="rounded-3xl border border-white/10 bg-[#17171b]/95 p-3 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f5f2ea] text-[#0b0b0d]">
                  <ShoppingBag size={18} />
                </div>

                <div>
                  <p className="text-sm font-medium text-white">
                    {cartCount} {cartCount === 1 ? "item" : "items"}
                  </p>

                  <p className="text-xs text-white/40">₹{cartTotal}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedItem(null);
                  setCartDrawerOpen(true);
                }}
                className="rounded-full bg-[#f5f2ea] px-5 py-3 text-sm font-medium text-[#0b0b0d] transition hover:scale-[1.02]"
              >
                View order
              </button>
            </div>

            {/* Cart preview */}
            <div className="nova-scrollbar mt-3 max-h-40 overflow-y-auto border-t border-white/10 pt-3">
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.cartItemId}
                    className="flex items-center justify-between gap-4 px-1"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-white/70">
                        {item.name}
                      </p>

                      {getCartItemDetails(item) && (
                        <p className="mt-1 truncate text-[11px] text-white/30">
                          {getCartItemDetails(item)}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-xs text-white/50">
                        × {item.quantity}
                      </span>

                      <span className="text-xs text-white/60">
                        ₹{getCartItemUnitPrice(item) * item.quantity}
                      </span>

                      <button
                        onClick={() => removeFromCart(item.cartItemId)}
                        className="text-white/25 transition hover:text-white"
                        aria-label={`Remove ${item.name}`}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <MenuItemSheet
        key={selectedItem?.id ?? "closed"}
        item={selectedItem}
        guests={displayGuests}
        onClose={() => setSelectedItem(null)}
        onAdd={addToCart}
      />

      <CartDrawer
        items={cart}
        guests={displayGuests}
        open={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
        onQuantityChange={changeCartItemQuantity}
        onRemove={removeFromCart}
        onPlaceOrder={handlePlaceOrder}
        submitting={isPlacingOrder}
      />

      {liveCurrentOrder && (
        <OrderConfirmation
          order={liveCurrentOrder}
          billRequested={currentSession?.billRequested ?? false}
          onRequestBill={handleRequestBill}
          onCancel={handleCancelCurrentOrder}
          onDone={() => setCurrentOrderId(null)}
        />
      )}

      {billViewOpen && currentSession && (
        <BillView
          session={currentSession}
          orders={orders}
          onClose={() => setBillViewOpen(false)}
          onPay={() => confirmPaymentAsCustomer(currentSession.id)}
        />
      )}
    </main>
  );
}

function NotFoundScreen({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0b0b0d] px-6 text-center text-[#f5f2ea]">
      <p className="text-xs uppercase tracking-[0.3em] text-white/40">NOVA</p>
      <h1 className="mt-4 text-2xl font-medium">{title}</h1>
      <p className="mt-3 max-w-sm text-sm leading-6 text-white/40">{message}</p>
    </main>
  );
}
