"use client";

import { ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";

import CartDrawer from "@/components/cart/cart-drawer";
import MenuBrowser from "@/components/menu/menu-browser";
import type { MenuItem } from "@/types/menu";
import MenuItemSheet from "@/components/menu/menu-item-sheet";
import type { CartItem } from "@/types/cart";
import OrderConfirmation from "@/components/orders/order-confirmation";
import {
  areCartItemsEquivalent,
  getCartItemUnitPrice,
  MAX_ITEM_QUANTITY,
  removeCartItem,
  updateCartItemQuantity,
} from "@/lib/cart";
import {
  CustomerDataProvider,
  useCustomerData,
} from "@/lib/customer-data-context";
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
    <CustomerDataProvider restaurantSlug={restaurantSlug} tableId={tableId}>
      <MenuPage tableId={tableId} />
    </CustomerDataProvider>
  );
}

function MenuPage({ tableId }: { tableId: string }) {
  const [orderingFor, setOrderingFor] = useState(1);
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
    acceptingOrders,
    restaurantId,
    restaurantName,
    orders,
    sessions,
    menuItems,
    menuCategories,
    tables,
    placeOrder,
    cancelOrderAsCustomer,
    requestBillAsCustomer,
    claimPaymentAsCustomer,
  } = useCustomerData();

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

  // Quick-add orders for whoever is picked under "Ordering for" (always guest 1
  // when the table has a single guest), exactly like the item sheet does.
  const activeGuestIndex =
    displayGuests.length > 0
      ? Math.min(orderingFor, displayGuests.length)
      : undefined;

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

  // A "plain" line: no size, no extras, no note, for the guest being ordered for.
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

  function quickQuantity(item: MenuItem) {
    return findPlainLine(item)?.quantity ?? 0;
  }

  function totalQuantity(item: MenuItem) {
    return cart.reduce(
      (sum, line) => (line.menuItemId === item.id ? sum + line.quantity : sum),
      0,
    );
  }

  function quickAdd(item: MenuItem) {
    // Items with sizes or extras need a choice first.
    if ((item.sizes?.length ?? 0) > 0 || (item.addons?.length ?? 0) > 0) {
      setSelectedItem(item);
      return;
    }

    addToCart({ ...plainCartItem(item), cartItemId: crypto.randomUUID() });
  }

  function quickRemove(item: MenuItem) {
    const line = findPlainLine(item);

    if (line) changeCartItemQuantity(line.cartItemId, line.quantity - 1);
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

  // A booking's hold is active and nobody is seated here yet: walk-ins can't
  // order. (place_order enforces this too; this just explains it up front.)
  if (currentTable.onHold && !currentSession) {
    return (
      <NotFoundScreen
        title="This table is reserved."
        message="Please ask a member of staff to seat you."
      />
    );
  }

  // The café's service is paused and nobody is seated here: nothing to order.
  // (Guests already seated carry on, so they can still see and pay their bill;
  // place_order refuses new orders.)
  if (!acceptingOrders && !currentSession) {
    return (
      <NotFoundScreen
        title="This café isn't taking orders right now."
        message="Please ask a member of staff for help."
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

  const guestPicker =
    displayGuests.length > 1 ? (
      <div
        role="group"
        aria-label="Ordering for"
        className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden"
      >
        <span className="shrink-0 text-[11px] text-white/35">Ordering for</span>

        {displayGuests.map((guest, index) => {
          const selected = activeGuestIndex === index + 1;

          return (
            <button
              key={guest.id}
              type="button"
              aria-pressed={selected}
              onClick={() => setOrderingFor(index + 1)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs transition ${
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
    <main className="min-h-screen bg-[#0b0b0d] text-[#f5f2ea]">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <header className="flex items-center justify-between px-5 pb-4 pt-6">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">
              Welcome to
            </p>

            <h1 className="mt-1 truncate text-xl font-medium">
              {restaurantName}
            </h1>
          </div>

          <span className="ml-3 shrink-0 rounded-full border border-white/10 px-4 py-2 text-sm text-white/60">
            {currentTable.name}
          </span>
        </header>

        {currentSession?.billRequested &&
          currentSession.paymentStatus !== "paid" && (
            <button
              type="button"
              onClick={() => setBillViewOpen(true)}
              className="mx-5 mb-4 flex w-[calc(100%-40px)] items-center justify-between rounded-2xl border border-[#d7a45a]/25 bg-[#d7a45a]/8 px-5 py-4 text-left transition hover:bg-[#d7a45a]/12"
            >
              <span className="text-xs text-[#d7a45a]">
                {currentSession.paymentStatus === "claimed"
                  ? "Waiting for the café to confirm"
                  : "Your bill is ready"}
              </span>
              <span className="text-xs font-medium text-[#d7a45a]">
                View bill →
              </span>
            </button>
          )}

        <MenuBrowser
          categories={menuCategories}
          items={menuItems}
          quickQuantity={quickQuantity}
          totalQuantity={totalQuantity}
          onQuickAdd={quickAdd}
          onQuickRemove={quickRemove}
          onOpenItem={setSelectedItem}
          stickyExtra={guestPicker}
        />
      </div>

      {/* Order error banner */}
      {orderError && (
        <div className="fixed top-6 left-1/2 z-50 w-[calc(100%-32px)] max-w-xl -translate-x-1/2">
          <div className="rounded-2xl border border-red-400/20 bg-red-950/80 px-5 py-3 text-center text-sm text-red-200 shadow-2xl backdrop-blur-xl">
            {orderError}
          </div>
        </div>
      )}

      {/* Cart bar */}
      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#0b0b0d]/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => {
              setSelectedItem(null);
              setCartDrawerOpen(true);
            }}
            className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between rounded-full bg-[#f5f2ea] px-6 text-sm font-medium text-[#0b0b0d] transition hover:scale-[1.01] active:scale-[0.99]"
          >
            <span className="flex items-center gap-2">
              <ShoppingBag size={16} />
              {cartCount} {cartCount === 1 ? "item" : "items"}
            </span>

            <span>View order · ₹{cartTotal}</span>
          </button>
        </div>
      )}

      <MenuItemSheet
        key={selectedItem?.id ?? "closed"}
        item={selectedItem}
        guests={displayGuests}
        defaultGuestIndex={activeGuestIndex}
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
        tableName={currentTable.name}
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
          onClaim={(method) =>
            claimPaymentAsCustomer(currentSession.id, method)
          }
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
      <h1 className="text-2xl font-medium">{title}</h1>
      <p className="mt-3 max-w-sm text-sm leading-6 text-white/40">{message}</p>
    </main>
  );
}
