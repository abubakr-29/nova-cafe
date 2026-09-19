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
import type { MenuCategory, MenuItem } from "@/types/menu";
import type { RestaurantTable } from "@/types/table";
import type { CartItem } from "@/types/cart";

type SupabaseClient = ReturnType<typeof createClient>;

type PlaceOrderResult = {
  orderId: string;
  orderNumber: string;
  validationCode: string;
};

// How often the customer menu page re-polls its own table's status.
// Customers don't get Realtime push updates (see the note above the
// Realtime effect below for why) — this keeps things feeling live
// without it.
const CUSTOMER_POLL_INTERVAL_MS = 6000;

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
): Promise<{ items: MenuItem[]; categories: MenuCategory[] }> {
  // Ordered by sort_order to match the order staff set up in the CMS
  // (dashboard/menu) — the customer menu's category tabs should mirror
  // that, not an arbitrary/hardcoded list.
  const { data: categoryRows } = await supabase
    .from("menu_categories")
    .select("id, name")
    .eq("restaurant_id", restaurantId)
    .order("sort_order");

  const categoryNameById = new Map(
    (categoryRows ?? []).map((c) => [c.id, c.name]),
  );

  const { data: items } = await supabase
    .from("menu_items")
    .select(
      "id, name, description, price, image_url, available, category_id, sort_order, menu_item_sizes(id, name, price), menu_item_addons(id, name, price)",
    )
    .eq("restaurant_id", restaurantId)
    .order("sort_order");

  return {
    categories: (categoryRows ?? []).map((c) => ({ id: c.id, name: c.name })),
    items: (items ?? []).map((item) => ({
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
    })),
  };
}

// STAFF-ONLY: reads every session for the whole restaurant. Safe for
// staff because RLS scopes "staff manage own sessions" by
// current_restaurant_id() — never used for the customer flow, which
// uses fetchCustomerView below instead (see the security-fix migration
// for why: this table has no anon read policy at all anymore).
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

// STAFF-ONLY: reads every order for the whole restaurant. See the note
// on fetchSessions above — same reasoning applies here.
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

type CustomerTableView = {
  table: RestaurantTable | null;
  session: TableSession | null;
  orders: Order[];
};

// CUSTOMER-ONLY: the one narrow, parameterized entry point for the
// customer menu page. Calls a SECURITY DEFINER Postgres function
// (get_customer_table_view — see the security-fix migration) that
// returns ONLY this one table's own current session and its own
// orders — never any other table's, and never a closed/previous
// session's orders at the same table. This is the fix for the RLS
// hole where anon used to be able to read every restaurant's entire
// orders/sessions tables directly.
async function fetchCustomerView(
  supabase: SupabaseClient,
  restaurantId: string,
  restaurantSlug: string,
  tableId: string,
): Promise<CustomerTableView> {
  const { data, error } = await supabase.rpc("get_customer_table_view", {
    p_restaurant_slug: restaurantSlug,
    p_table_id: tableId,
  });

  if (error || !data) {
    return { table: null, session: null, orders: [] };
  }

  const raw = data as {
    table: {
      id: string;
      name: string;
      seats: number;
      shape: RestaurantTable["shape"];
      status: RestaurantTable["status"];
      position_x: number;
      position_y: number;
      position_width: number;
      position_height: number;
    } | null;
    session: {
      id: string;
      table_id: string;
      status: TableSession["status"];
      bill_requested: boolean;
      payment_status: TableSession["paymentStatus"];
      started_at: string;
      table_name: string;
      guests: { id: string; name: string; sort_order: number }[];
      orders: { id: string }[];
    } | null;
    orders: {
      id: string;
      order_number: string;
      validation_code: string;
      table_id: string;
      status: OrderStatus;
      subtotal: number;
      tax: number;
      total: number;
      created_at: string;
      table_name: string;
      order_items: {
        id: string;
        menu_item_id: string;
        name: string;
        image_url: string | null;
        base_price: number;
        size_name: string | null;
        size_price: number | null;
        note: string | null;
        quantity: number;
        unit_price: number;
        total_price: number;
        assigned_guest_id: string | null;
        order_item_addons: { name: string; price: number }[];
      }[];
    }[];
  };

  const table: RestaurantTable | null = raw.table
    ? {
        id: raw.table.id,
        name: raw.table.name,
        seats: raw.table.seats,
        shape: raw.table.shape,
        status: raw.table.status,
        position: {
          x: raw.table.position_x,
          y: raw.table.position_y,
          width: raw.table.position_width,
          height: raw.table.position_height,
        },
      }
    : null;

  const session: TableSession | null = raw.session
    ? {
        id: raw.session.id,
        restaurantId,
        tableId: raw.session.table_id,
        tableName: raw.session.table_name,
        guests: (raw.session.guests ?? [])
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((g) => ({ id: g.id, name: g.name })),
        orderIds: (raw.session.orders ?? []).map((o) => o.id),
        startedAt: raw.session.started_at,
        status: raw.session.status,
        billRequested: raw.session.bill_requested,
        paymentStatus: raw.session.payment_status,
      }
    : null;

  const orders: Order[] = (raw.orders ?? []).map((o) => ({
    id: o.id,
    orderNumber: o.order_number,
    validationCode: o.validation_code,
    restaurantId,
    tableId: o.table_id,
    tableName: o.table_name,
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

  return { table, session, orders };
}

type RestaurantDataContextValue = {
  loading: boolean;
  restaurantId: string | null;
  taxRate: number;
  orders: Order[];
  sessions: TableSession[];
  menuItems: MenuItem[];
  menuCategories: MenuCategory[];
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

export function RestaurantDataProvider({
  restaurantSlug,
  tableId,
  children,
}: {
  // Customer flow (reached via a table's QR code, no login): pass BOTH
  // restaurantSlug and tableId — this switches the provider into
  // customer mode, which reads only that one table's own data (see
  // fetchCustomerView above) and polls instead of using Realtime.
  // Staff flow (/dashboard, already behind auth): omit both — the
  // provider resolves the authenticated staff member's own restaurant
  // via the `current_restaurant_id()` RPC and reads/subscribes broadly,
  // which is safe because RLS already scopes staff to their own
  // restaurant.
  restaurantSlug?: string;
  tableId?: string;
  children: ReactNode;
}) {
  const isCustomerMode = Boolean(restaurantSlug && tableId);

  const [supabase] = useState(() => createClient());
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  // The resolved slug for the current restaurant, regardless of which
  // path found it — placeOrder's RPC takes a slug, and this keeps it
  // correct for the staff flow too (where there's no incoming slug prop
  // to read from).
  const [resolvedSlug, setResolvedSlug] = useState<string | null>(null);
  const [taxRate, setTaxRate] = useState(0);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [sessions, setSessions] = useState<TableSession[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);

  // STAFF-ONLY broad fetch — everything for the restaurant.
  const fetchAll = useCallback(
    async (rid: string) => {
      const [tablesRes, menuRes, sessionsRes, ordersRes] = await Promise.all([
        fetchTables(supabase, rid),
        fetchMenu(supabase, rid),
        fetchSessions(supabase, rid),
        fetchOrders(supabase, rid),
      ]);

      setTables(tablesRes);
      setMenuItems(menuRes.items);
      setMenuCategories(menuRes.categories);
      setSessions(sessionsRes);
      setOrders(ordersRes);
    },
    [supabase],
  );

  // Mode-aware load: staff gets the broad fetch above; a customer gets
  // the full (public) menu plus ONLY their own table's narrow view.
  const loadData = useCallback(
    async (rid: string) => {
      if (isCustomerMode && restaurantSlug && tableId) {
        const [menuRes, view] = await Promise.all([
          fetchMenu(supabase, rid),
          fetchCustomerView(supabase, rid, restaurantSlug, tableId),
        ]);

        setMenuItems(menuRes.items);
        setMenuCategories(menuRes.categories);
        setTables(view.table ? [view.table] : []);
        setSessions(view.session ? [view.session] : []);
        setOrders(view.orders);
      } else {
        await fetchAll(rid);
      }
    },
    [supabase, isCustomerMode, restaurantSlug, tableId, fetchAll],
  );

  useEffect(() => {
    let ignore = false;

    async function init() {
      setLoading(true);

      const restaurant = restaurantSlug
        ? await (async () => {
            const { data } = await supabase
              .from("restaurants")
              .select("id, slug, tax_rate")
              .eq("slug", restaurantSlug)
              .single();
            return data;
          })()
        : await (async () => {
            const { data: rid } = await supabase.rpc("current_restaurant_id");
            if (!rid) return null;

            const { data } = await supabase
              .from("restaurants")
              .select("id, slug, tax_rate")
              .eq("id", rid)
              .single();
            return data;
          })();

      if (ignore) return;

      // No matching restaurant — a bad/stale QR code for the customer
      // flow, or a staff account with no restaurant linked yet. Still
      // clear `loading` so callers can tell "still loading" apart from
      // "there's no restaurant here" and show the right message, instead
      // of spinning forever.
      if (!restaurant) {
        setRestaurantId(null);
        setResolvedSlug(null);
        setLoading(false);
        return;
      }

      setRestaurantId(restaurant.id);
      setResolvedSlug(restaurant.slug);
      setTaxRate(restaurant.tax_rate);
      await loadData(restaurant.id);
      if (!ignore) setLoading(false);
    }

    init();

    return () => {
      ignore = true;
    };
  }, [supabase, loadData, restaurantSlug]);

  // Single refetch used by every write method below — resolves to the
  // right (staff-broad or customer-narrow) reload automatically via
  // loadData, so a write method never has to know or care which mode
  // it's running in.
  const refetch = useCallback(async () => {
    if (restaurantId) await loadData(restaurantId);
  }, [restaurantId, loadData]);

  // STAFF-ONLY Realtime. Deliberately skipped entirely in customer mode:
  // Supabase Realtime enforces the same RLS policies as direct reads, so
  // now that anon has no read policy left on table_sessions/orders/etc.
  // (see the security-fix migration), a customer's subscription to those
  // tables wouldn't receive anything anyway. Rather than leave a dead
  // subscription around, the customer page polls its own narrow view
  // instead (see the effect below) — slightly less instant than a push
  // update, but the trade a public no-login visitor should get.
  useEffect(() => {
    if (!restaurantId || isCustomerMode) return;

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
        () => refetch(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        () => refetch(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_item_addons" },
        () => refetch(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "table_sessions",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => refetch(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "session_guests" },
        () => refetch(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "restaurant_tables",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => refetch(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "menu_items",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => refetch(),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "restaurants",
          filter: `id=eq.${restaurantId}`,
        },
        (payload) => {
          const updated = payload.new as { tax_rate: number };
          setTaxRate(updated.tax_rate);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, restaurantId, isCustomerMode, refetch]);

  // CUSTOMER-ONLY polling — the replacement for Realtime described above.
  useEffect(() => {
    if (!restaurantId || !isCustomerMode) return;

    const interval = setInterval(() => {
      refetch();
    }, CUSTOMER_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [restaurantId, isCustomerMode, refetch]);

  const placeOrder = useCallback(
    async (
      tableId: string,
      cart: CartItem[],
      guestCount: number,
    ): Promise<PlaceOrderResult | null> => {
      if (!resolvedSlug) {
        console.error("place_order called before a restaurant was resolved");
        return null;
      }

      const items = cart.map((item) => ({
        menu_item_id: item.menuItemId,
        quantity: item.quantity,
        size_id: item.size?.id ?? null,
        addon_ids: item.addons.map((a) => a.id),
        note: item.note ?? null,
        guest_index: item.guestIndex ?? null,
      }));

      const { data, error } = await supabase.rpc("place_order", {
        p_restaurant_slug: resolvedSlug,
        p_table_id: tableId,
        p_guest_count: guestCount,
        p_items: items,
      });

      if (error || !data || data.length === 0) {
        console.error("place_order failed", error);
        return null;
      }

      await refetch();

      return {
        orderId: data[0].order_id,
        orderNumber: data[0].order_number,
        validationCode: data[0].validation_code,
      };
    },
    [supabase, resolvedSlug, refetch],
  );

  const requestBillAsCustomer = useCallback(
    async (sessionId: string) => {
      await supabase.rpc("request_bill", { p_session_id: sessionId });
      await refetch();
    },
    [supabase, refetch],
  );

  const cancelOrderAsCustomer = useCallback(
    async (orderId: string) => {
      await supabase.rpc("cancel_order", { p_order_id: orderId });
      await refetch();
    },
    [supabase, refetch],
  );

  const confirmPaymentAsCustomer = useCallback(
    async (sessionId: string) => {
      await supabase.rpc("confirm_payment", { p_session_id: sessionId });
      await refetch();
    },
    [supabase, refetch],
  );

  const requestBill = useCallback(
    async (sessionId: string) => {
      await supabase
        .from("table_sessions")
        .update({ bill_requested: true })
        .eq("id", sessionId);
      await refetch();
    },
    [supabase, refetch],
  );

  const updateOrderStatus = useCallback(
    async (orderId: string, status: OrderStatus) => {
      await supabase.from("orders").update({ status }).eq("id", orderId);
      await refetch();
    },
    [supabase, refetch],
  );

  const cancelOrder = useCallback(
    async (orderId: string) => {
      await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", orderId);
      await refetch();
    },
    [supabase, refetch],
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
      await refetch();
      return true;
    },
    [supabase, refetch],
  );

  const markSessionPaid = useCallback(
    async (sessionId: string) => {
      await supabase
        .from("table_sessions")
        .update({ payment_status: "paid" })
        .eq("id", sessionId);
      await refetch();
    },
    [supabase, refetch],
  );

  const toggleItemAvailability = useCallback(
    async (itemId: string) => {
      const item = menuItems.find((i) => i.id === itemId);
      if (!item) return;

      await supabase
        .from("menu_items")
        .update({ available: !(item.available ?? true) })
        .eq("id", itemId);

      await refetch();
    },
    [supabase, menuItems, refetch],
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

      await refetch();
    },
    [supabase, sessions, refetch],
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

      await refetch();
    },
    [supabase, sessions, refetch],
  );

  return (
    <RestaurantDataContext.Provider
      value={{
        loading,
        restaurantId,
        taxRate,
        orders,
        sessions,
        menuItems,
        menuCategories,
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
