"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { createClient } from "@/lib/supabase/client";
import type { Order, OrderStatus } from "@/types/order";
import type { TableSession } from "@/types/session";
import type { MenuItem } from "@/types/menu";
import type { RestaurantTable } from "@/types/table";
import type { CartItem } from "@/types/cart";

// Single restaurant for now — becomes a real per-tenant lookup
// (from the URL) once Phase 5 (QR routing) happens.
const RESTAURANT_SLUG = "white-cave";

type SupabaseClient = ReturnType<typeof createClient>;

type PlaceOrderResult = {
  orderId: string;
  orderNumber: string;
  validationCode: string;
};

async function fetchTables(
  supabase: SupabaseClient,
  restaurantId: string,
): Promise<RestaurantTable[]> {
  const { data } = await supabase
    .from("restaurant_tables")
    .select(
      "id, name, seats, shape, status, position_x, position_y, position_width, position_height",
    )
    .eq("restaurant_id", restaurantId);

  return (data ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    seats: t.seats,
    shape: t.shape,
    status: t.status,
    position: {
      x: t.position_x,
      y: t.position_y,
      width: t.position_width,
      height: t.position_height,
    },
  }));
}

async function fetchMenu(
  supabase: SupabaseClient,
  restaurantId: string,
): Promise<MenuItem[]> {
  const { data: categories } = await supabase
    .from("menu_categories")
    .select("id, name")
    .eq("restaurant_id", restaurantId);

  const categoryNameById = new Map(
    (categories ?? []).map((c) => [c.id, c.name]),
  );

  const { data: items } = await supabase
    .from("menu_items")
    .select(
      "id, name, description, price, image_url, available, category_id, sort_order, menu_item_sizes(id, name, price), menu_item_addons(id, name, price)",
    )
    .eq("restaurant_id", restaurantId)
    .order("sort_order");

  return (items ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description ?? "",
    price: item.price,
    image: item.image_url ?? "",
    category: categoryNameById.get(item.category_id) ?? "",
    available: item.available,
    sizes: item.menu_item_sizes?.length
      ? item.menu_item_sizes.map((s) => ({
          id: s.id,
          name: s.name,
          price: s.price,
        }))
      : undefined,
    addons: item.menu_item_addons?.length
      ? item.menu_item_addons.map((a) => ({
          id: a.id,
          name: a.name,
          price: a.price,
        }))
      : undefined,
  }));
}

async function fetchSessions(
  supabase: SupabaseClient,
  restaurantId: string,
): Promise<TableSession[]> {
  const { data } = await supabase
    .from("table_sessions")
    .select(
      "id, table_id, status, bill_requested, payment_status, started_at, restaurant_tables(name), session_guests(id, name, sort_order), orders(id)",
    )
    .eq("restaurant_id", restaurantId)
    .neq("status", "closed");

  return (data ?? []).map((s) => ({
    id: s.id,
    restaurantId,
    tableId: s.table_id,
    tableName:
      (s.restaurant_tables as unknown as { name: string } | null)?.name ?? "",
    guests: (s.session_guests ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((g) => ({ id: g.id, name: g.name })),
    orderIds: (s.orders ?? []).map((o) => o.id),
    startedAt: s.started_at,
    status: s.status,
    billRequested: s.bill_requested,
    paymentStatus: s.payment_status,
  }));
}

async function fetchOrders(
  supabase: SupabaseClient,
  restaurantId: string,
): Promise<Order[]> {
  const { data } = await supabase
    .from("orders")
    .select(
      `id, order_number, validation_code, table_id, status, subtotal, tax, total, created_at,
       restaurant_tables(name),
       order_items(
         id, menu_item_id, name, image_url, base_price, size_name, size_price,
         note, quantity, unit_price, total_price, assigned_guest_id,
         order_item_addons(name, price)
       )`,
    )
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: true });

  return (data ?? []).map((o) => ({
    id: o.id,
    orderNumber: o.order_number,
    validationCode: o.validation_code,
    restaurantId,
    tableId: o.table_id,
    tableName:
      (o.restaurant_tables as unknown as { name: string } | null)?.name ?? "",
    status: o.status,
    subtotal: o.subtotal,
    tax: o.tax,
    total: o.total,
    createdAt: o.created_at,
    items: (o.order_items ?? []).map((oi) => ({
      orderItemId: oi.id,
      menuItemId: oi.menu_item_id,
      name: oi.name,
      image: oi.image_url ?? "",
      basePrice: oi.base_price,
      quantity: oi.quantity,
      size: oi.size_name
        ? { id: `${oi.id}-size`, name: oi.size_name, price: oi.size_price ?? 0 }
        : undefined,
      addons: (oi.order_item_addons ?? []).map((a, index) => ({
        id: `${oi.id}-addon-${index}`,
        name: a.name,
        price: a.price,
      })),
      note: oi.note ?? undefined,
      unitPrice: oi.unit_price,
      totalPrice: oi.total_price,
      assignedGuestId: oi.assigned_guest_id ?? undefined,
    })),
  }));
}

type RestaurantDataContextValue = {
  loading: boolean;
  orders: Order[];
  sessions: TableSession[];
  menuItems: MenuItem[];
  tables: RestaurantTable[];

  // Customer-initiated writes — go through SECURITY DEFINER RPCs,
  // never a direct table write, since anon has no write grants at all.
  placeOrder: (
    tableId: string,
    cart: CartItem[],
    guestCount: number,
  ) => Promise<PlaceOrderResult | null>;
  requestBillAsCustomer: (sessionId: string) => Promise<void>;
  cancelOrderAsCustomer: (orderId: string) => Promise<void>;
  confirmPaymentAsCustomer: (sessionId: string) => Promise<void>;

  // Staff-initiated writes — direct table writes, safe because RLS
  // already scopes an authenticated staff member to their own restaurant.
  requestBill: (sessionId: string) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  cancelOrder: (orderId: string) => Promise<void>;
  validateOrder: (orderId: string, code: string) => Promise<boolean>;
  markSessionPaid: (sessionId: string) => Promise<void>;
  toggleItemAvailability: (itemId: string) => Promise<void>;
  closeTableSession: (tableId: string) => Promise<void>;
  updateSessionGuestCount: (
    sessionId: string,
    guestCount: number,
  ) => Promise<void>;
};

const RestaurantDataContext = createContext<RestaurantDataContextValue | null>(
  null,
);

export function RestaurantDataProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => createClient());
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [sessions, setSessions] = useState<TableSession[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);

  const fetchAll = useCallback(
    async (rid: string) => {
      const [tablesRes, menuRes, sessionsRes, ordersRes] = await Promise.all([
        fetchTables(supabase, rid),
        fetchMenu(supabase, rid),
        fetchSessions(supabase, rid),
        fetchOrders(supabase, rid),
      ]);

      setTables(tablesRes);
      setMenuItems(menuRes);
      setSessions(sessionsRes);
      setOrders(ordersRes);
    },
    [supabase],
  );

  useEffect(() => {
    let ignore = false;

    async function init() {
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("id")
        .eq("slug", RESTAURANT_SLUG)
        .single();

      if (!restaurant || ignore) return;

      setRestaurantId(restaurant.id);
      await fetchAll(restaurant.id);
      if (!ignore) setLoading(false);
    }

    init();

    return () => {
      ignore = true;
    };
  }, [supabase, fetchAll]);

  useEffect(() => {
    if (!restaurantId) return;

    // Simple, deliberately coarse Realtime strategy: any relevant
    // change just re-fetches everything, instead of hand-patching
    // local state from each payload. Slightly more network traffic,
    // far less surface for subtle sync bugs — a good trade at this scale.
    const channel = supabase
      .channel(`restaurant-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => fetchAll(restaurantId),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        () => fetchAll(restaurantId),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_item_addons" },
        () => fetchAll(restaurantId),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "table_sessions",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => fetchAll(restaurantId),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "session_guests" },
        () => fetchAll(restaurantId),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "restaurant_tables",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => fetchAll(restaurantId),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "menu_items",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => fetchAll(restaurantId),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, restaurantId, fetchAll]);

  const placeOrder = useCallback(
    async (
      tableId: string,
      cart: CartItem[],
      guestCount: number,
    ): Promise<PlaceOrderResult | null> => {
      const items = cart.map((item) => ({
        menu_item_id: item.menuItemId,
        quantity: item.quantity,
        size_id: item.size?.id ?? null,
        addon_ids: item.addons.map((a) => a.id),
        note: item.note ?? null,
        guest_index: item.guestIndex ?? null,
      }));

      const { data, error } = await supabase.rpc("place_order", {
        p_restaurant_slug: RESTAURANT_SLUG,
        p_table_id: tableId,
        p_guest_count: guestCount,
        p_items: items,
      });

      if (error || !data || data.length === 0) {
        console.error("place_order failed", error);
        return null;
      }

      if (restaurantId) await fetchAll(restaurantId);

      return {
        orderId: data[0].order_id,
        orderNumber: data[0].order_number,
        validationCode: data[0].validation_code,
      };
    },
    [supabase, restaurantId, fetchAll],
  );

  const requestBillAsCustomer = useCallback(
    async (sessionId: string) => {
      await supabase.rpc("request_bill", { p_session_id: sessionId });
      if (restaurantId) await fetchAll(restaurantId);
    },
    [supabase, restaurantId, fetchAll],
  );

  const cancelOrderAsCustomer = useCallback(
    async (orderId: string) => {
      await supabase.rpc("cancel_order", { p_order_id: orderId });
      if (restaurantId) await fetchAll(restaurantId);
    },
    [supabase, restaurantId, fetchAll],
  );

  const confirmPaymentAsCustomer = useCallback(
    async (sessionId: string) => {
      await supabase.rpc("confirm_payment", { p_session_id: sessionId });
      if (restaurantId) await fetchAll(restaurantId);
    },
    [supabase, restaurantId, fetchAll],
  );

  const requestBill = useCallback(
    async (sessionId: string) => {
      await supabase
        .from("table_sessions")
        .update({ bill_requested: true })
        .eq("id", sessionId);
      if (restaurantId) await fetchAll(restaurantId);
    },
    [supabase, restaurantId, fetchAll],
  );

  const updateOrderStatus = useCallback(
    async (orderId: string, status: OrderStatus) => {
      await supabase.from("orders").update({ status }).eq("id", orderId);
      if (restaurantId) await fetchAll(restaurantId);
    },
    [supabase, restaurantId, fetchAll],
  );

  const cancelOrder = useCallback(
    async (orderId: string) => {
      await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", orderId);
      if (restaurantId) await fetchAll(restaurantId);
    },
    [supabase, restaurantId, fetchAll],
  );

  const validateOrder = useCallback(
    async (orderId: string, code: string) => {
      const { data: order } = await supabase
        .from("orders")
        .select("validation_code")
        .eq("id", orderId)
        .single();

      if (!order || order.validation_code !== code) {
        return false;
      }

      await supabase
        .from("orders")
        .update({ status: "pending" })
        .eq("id", orderId);
      if (restaurantId) await fetchAll(restaurantId);
      return true;
    },
    [supabase, restaurantId, fetchAll],
  );

  const markSessionPaid = useCallback(
    async (sessionId: string) => {
      await supabase
        .from("table_sessions")
        .update({ payment_status: "paid" })
        .eq("id", sessionId);
      if (restaurantId) await fetchAll(restaurantId);
    },
    [supabase, restaurantId, fetchAll],
  );

  const toggleItemAvailability = useCallback(
    async (itemId: string) => {
      const item = menuItems.find((i) => i.id === itemId);
      if (!item) return;

      await supabase
        .from("menu_items")
        .update({ available: !(item.available ?? true) })
        .eq("id", itemId);

      if (restaurantId) await fetchAll(restaurantId);
    },
    [supabase, menuItems, restaurantId, fetchAll],
  );

  const closeTableSession = useCallback(
    async (tableId: string) => {
      const session = sessions.find(
        (s) => s.tableId === tableId && s.status !== "closed",
      );

      if (session) {
        await supabase
          .from("table_sessions")
          .update({ status: "closed", closed_at: new Date().toISOString() })
          .eq("id", session.id);
      }

      await supabase
        .from("restaurant_tables")
        .update({ status: "available" })
        .eq("id", tableId);

      if (restaurantId) await fetchAll(restaurantId);
    },
    [supabase, sessions, restaurantId, fetchAll],
  );

  const updateSessionGuestCount = useCallback(
    async (sessionId: string, guestCount: number) => {
      const session = sessions.find((s) => s.id === sessionId);
      if (!session) return;

      const safeCount = Math.max(1, guestCount);
      const current = session.guests.length;

      if (safeCount < current) {
        const idsToRemove = session.guests.slice(safeCount).map((g) => g.id);
        await supabase.from("session_guests").delete().in("id", idsToRemove);
      } else if (safeCount > current) {
        const newGuests = Array.from(
          { length: safeCount - current },
          (_, i) => ({
            session_id: sessionId,
            name: `Guest ${current + i + 1}`,
            sort_order: current + i + 1,
          }),
        );
        await supabase.from("session_guests").insert(newGuests);
      }

      if (restaurantId) await fetchAll(restaurantId);
    },
    [supabase, sessions, restaurantId, fetchAll],
  );

  return (
    <RestaurantDataContext.Provider
      value={{
        loading,
        orders,
        sessions,
        menuItems,
        tables,
        placeOrder,
        requestBillAsCustomer,
        cancelOrderAsCustomer,
        confirmPaymentAsCustomer,
        requestBill,
        updateOrderStatus,
        cancelOrder,
        validateOrder,
        markSessionPaid,
        toggleItemAvailability,
        closeTableSession,
        updateSessionGuestCount,
      }}
    >
      {children}
    </RestaurantDataContext.Provider>
  );
}

export function useRestaurantData() {
  const context = useContext(RestaurantDataContext);

  if (!context) {
    throw new Error(
      "useRestaurantData must be used within a RestaurantDataProvider",
    );
  }

  return context;
}
