"use client";

import { Search, ShoppingBag, X } from "lucide-react";
import { useMemo, useState } from "react";

import MenuCard from "@/components/menu/menu-card";
import CartDrawer from "@/components/cart/cart-drawer";
import { menuItems } from "@/data/menu";
import type { MenuItem } from "@/types/menu";
import MenuItemSheet from "@/components/menu/menu-item-sheet";
import type { CartItem } from "@/types/cart";
import type { Order } from "@/types/order";
import { createOrder } from "@/lib/order";
import OrderConfirmation from "@/components/orders/order-confirmation";
import {
  areCartItemsEquivalent,
  getCartItemDetails,
  getCartItemUnitPrice,
  removeCartItem,
  updateCartItemQuantity,
} from "@/lib/cart";
import { useRestaurantData } from "@/lib/restaurant-data-context";
import BillView from "@/components/customer/bill-view";

const categories = [
  "All",
  "Coffee",
  "Sandwiches",
  "Sides",
  "Bakery",
  "Desserts",
];

export default function MenuPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [billViewOpen, setBillViewOpen] = useState(false);

  const { orders, sessions, addOrder, requestBill, markSessionPaid } =
    useRestaurantData();

  const currentSession =
    sessions.find((session) => session.tableId === "table-07") ?? null;

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCategory =
        activeCategory === "All" || item.category === activeCategory;

      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, search]);

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
          quantity: cartItem.quantity + item.quantity,
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

  function handlePlaceOrder() {
    if (cart.length === 0) {
      return;
    }

    const order = createOrder({
      cart,

      restaurantId: "nova-cafe",
      tableId: "table-07",
      tableName: "Table 07",
    });

    addOrder(order);
    setCurrentOrder(order);

    setCart([]);
    setCartDrawerOpen(false);
  }

  function handleRequestBill() {
    if (!currentSession) {
      return;
    }

    requestBill(currentSession.id);
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
            Table 07
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
        onClose={() => setSelectedItem(null)}
        onAdd={addToCart}
      />

      <CartDrawer
        items={cart}
        open={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
        onQuantityChange={changeCartItemQuantity}
        onRemove={removeFromCart}
        onPlaceOrder={handlePlaceOrder}
      />

      {currentOrder && (
        <OrderConfirmation
          order={currentOrder}
          billRequested={currentSession?.billRequested ?? false}
          onRequestBill={handleRequestBill}
          onDone={() => setCurrentOrder(null)}
        />
      )}

      {billViewOpen && currentSession && (
        <BillView
          session={currentSession}
          orders={orders}
          onClose={() => setBillViewOpen(false)}
          onPay={() => markSessionPaid(currentSession.id)}
        />
      )}
    </main>
  );
}
