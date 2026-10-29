"use client";

import { mapMenuItems, type MenuItemRow } from "@/lib/menu-mapping";
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
import type { PaymentMethod, PaymentOptions } from "@/types/payment";
import type { MenuCategory, MenuItem } from "@/types/menu";
import type { RestaurantTable } from "@/types/table";
import type { CartItem } from "@/types/cart";

// CUSTOMER-ONLY data layer — used by the public /menu/[slug]/[tableId]
// page. Deliberately kept separate from the staff dashboard's data layer
// (lib/staff-data-context.tsx): customers are anonymous, so everything
// here goes through narrow, parameterized SECURITY DEFINER functions
// (see the security-fix migrations) rather than broad table reads, and
// it never opens a Realtime subscription — it polls instead.

type SupabaseClient = ReturnType<typeof createClient>;

type PlaceOrderResult =
  | { ok: true; orderId: string; orderNumber: string; validationCode: string }
  | { ok: false; error: string };

// How often the page re-polls its own table's status. Customers don't get
// Realtime push updates: Realtime enforces the same RLS as direct reads,
// and anon has no broad read access anymore — polling the narrow view
// keeps things feeling live without it.
const CUSTOMER_POLL_INTERVAL_MS = 6000;

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
      "id, name, description, price, image_url, available, diet, category_id, sort_order, menu_item_sizes(id, name, price, sort_order), menu_item_addons(id, name, price, sort_order)",
    )
    .eq("restaurant_id", restaurantId)
    .order("sort_order");

  return {
    categories: (categoryRows ?? []).map((c) => ({ id: c.id, name: c.name })),
    items: mapMenuItems((items ?? []) as MenuItemRow[], categoryNameById),
  };
}

type CustomerTableView = {
  table: RestaurantTable | null;
  session: TableSession | null;
  orders: Order[];
};

// The one narrow, parameterized entry point for a customer's own table.
// Calls a SECURITY DEFINER Postgres function (get_customer_table_view)
// that returns ONLY this one table's own current session and its own
// orders — never any other table's, and never a closed/previous
// session's orders at the same table.
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
      on_hold?: boolean;
    } | null;
    session: {
      id: string;
      table_id: string;
      status: TableSession["status"];
      bill_requested: boolean;
      payment_status: TableSession["paymentStatus"];
      payment_method?: PaymentMethod | null;
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
        onHold: raw.table.on_hold ?? false,
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
        paymentMethod: raw.session.payment_method ?? null,
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

const DEFAULT_PAYMENT_OPTIONS: PaymentOptions = {
  upiId: null,
  payeeName: "",
  qrUrl: null,
  acceptsCash: true,
};

function toPaymentOptions(
  supabase: SupabaseClient,
  raw: unknown,
): PaymentOptions {
  if (!raw || typeof raw !== "object") return DEFAULT_PAYMENT_OPTIONS;

  const r = raw as {
    upi_id: string | null;
    payee_name: string | null;
    qr_path: string | null;
    accepts_cash: boolean;
  };

  return {
    upiId: r.upi_id,
    payeeName: r.payee_name ?? "",
    qrUrl: r.qr_path
      ? supabase.storage.from("payment-qr").getPublicUrl(r.qr_path).data
          .publicUrl
      : null,
    acceptsCash: r.accepts_cash !== false,
  };
}

type CustomerDataContextValue = {
  loading: boolean;
  /** False when the café's service is paused: it takes no new orders. */
  acceptingOrders: boolean;
  restaurantId: string | null;
  restaurantName: string;
  taxRate: number;
  paymentOptions: PaymentOptions;
  orders: Order[];
  sessions: TableSession[];
  menuItems: MenuItem[];
  menuCategories: MenuCategory[];
  tables: RestaurantTable[];

  // Customer-initiated writes — all go through SECURITY DEFINER RPCs,
  // never a direct table write, since anon has no write grants at all.
  placeOrder: (
    tableId: string,
    cart: CartItem[],
    guestCount: number,
  ) => Promise<PlaceOrderResult>;
  requestBillAsCustomer: (sessionId: string) => Promise<void>;
  cancelOrderAsCustomer: (orderId: string) => Promise<void>;
  /** The customer says they paid. Only staff can mark the bill paid. */
  claimPaymentAsCustomer: (
    sessionId: string,
    method: "upi" | "cash",
  ) => Promise<boolean>;
};

const CustomerDataContext = createContext<CustomerDataContextValue | null>(
  null,
);

export function CustomerDataProvider({
  restaurantSlug,
  tableId,
  children,
}: {
  restaurantSlug: string;
  tableId: string;
  children: ReactNode;
}) {
  const [supabase] = useState(() => createClient());
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState("");
  const [taxRate, setTaxRate] = useState(0);
  const [paymentOptions, setPaymentOptions] = useState<PaymentOptions>(
    DEFAULT_PAYMENT_OPTIONS,
  );
  const [loading, setLoading] = useState(true);
  const [acceptingOrders, setAcceptingOrders] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [sessions, setSessions] = useState<TableSession[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);

  // The full (public) menu plus ONLY this table's own narrow view.
  const loadData = useCallback(
    async (rid: string) => {
      const [menuRes, view] = await Promise.all([
        fetchMenu(supabase, rid),
        fetchCustomerView(supabase, rid, restaurantSlug, tableId),
      ]);

      setMenuItems(menuRes.items);
      setMenuCategories(menuRes.categories);
      setTables(view.table ? [view.table] : []);
      setSessions(view.session ? [view.session] : []);
      setOrders(view.orders);
    },
    [supabase, restaurantSlug, tableId],
  );

  useEffect(() => {
    let ignore = false;

    async function init() {
      setLoading(true);

      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("id, name, tax_rate")
        .eq("slug", restaurantSlug)
        .single();

      if (ignore) return;

      // No matching restaurant (bad/stale QR code, typo in the URL).
      // Still clear `loading` so the page can tell "still loading" apart
      // from "this restaurant doesn't exist" and show the right message,
      // instead of spinning forever.
      if (!restaurant) {
        setRestaurantId(null);
        setLoading(false);
        return;
      }

      // Paused cafés take no new orders (place_order enforces this too).
      // A failed check is treated as "open": the database still decides.
      const { data: isOpen } = await supabase.rpc("restaurant_is_open", {
        p_restaurant_slug: restaurantSlug,
      });

      if (ignore) return;

      const { data: pay } = await supabase.rpc("payment_options", {
        p_restaurant_slug: restaurantSlug,
      });

      if (ignore) return;

      setPaymentOptions(toPaymentOptions(supabase, pay));
      setAcceptingOrders(isOpen !== false);
      setRestaurantId(restaurant.id);
      setRestaurantName(restaurant.name);
      setTaxRate(restaurant.tax_rate);
      await loadData(restaurant.id);
      if (!ignore) setLoading(false);
    }

    init();

    return () => {
      ignore = true;
    };
  }, [supabase, loadData, restaurantSlug]);

  const refetch = useCallback(async () => {
    if (restaurantId) await loadData(restaurantId);
  }, [restaurantId, loadData]);

  // Polling in place of Realtime (see CUSTOMER_POLL_INTERVAL_MS above).
  // Paused while the tab is hidden: a backgrounded page otherwise keeps
  // hitting the database every few seconds for nobody. On return to the
  // tab we refetch immediately, then resume the normal cadence.
  useEffect(() => {
    if (!restaurantId) return;

    let interval: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (interval !== null) return;
      interval = setInterval(() => {
        refetch();
      }, CUSTOMER_POLL_INTERVAL_MS);
    };

    const stop = () => {
      if (interval === null) return;
      clearInterval(interval);
      interval = null;
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refetch();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [restaurantId, refetch]);

  const placeOrder = useCallback(
    async (
      orderTableId: string,
      cart: CartItem[],
      guestCount: number,
    ): Promise<PlaceOrderResult> => {
      if (!restaurantId) {
        console.error("place_order called before a restaurant was resolved");
        return {
          ok: false,
          error: "Something went wrong. Please refresh and try again.",
        };
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
        p_restaurant_slug: restaurantSlug,
        p_table_id: orderTableId,
        p_guest_count: guestCount,
        p_items: items,
      });

      if (error || !data || data.length === 0) {
        console.error("place_order failed", error);
        // Postgres RAISE EXCEPTION messages (like the checks in the
        // place_order function) arrive here as error.message — safe to
        // show directly, they're written to be customer-facing.
        return {
          ok: false,
          error:
            error?.message || "Could not place your order. Please try again.",
        };
      }

      await refetch();

      return {
        ok: true,
        orderId: data[0].order_id,
        orderNumber: data[0].order_number,
        validationCode: data[0].validation_code,
      };
    },
    [supabase, restaurantId, restaurantSlug, refetch],
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

  const claimPaymentAsCustomer = useCallback(
    async (sessionId: string, method: "upi" | "cash") => {
      const { error } = await supabase.rpc("claim_payment", {
        p_session_id: sessionId,
        p_method: method,
      });
      await refetch();
      return !error;
    },
    [supabase, refetch],
  );

  return (
    <CustomerDataContext.Provider
      value={{
        loading,
        acceptingOrders,
        restaurantId,
        restaurantName,
        taxRate,
        paymentOptions,
        orders,
        sessions,
        menuItems,
        menuCategories,
        tables,
        placeOrder,
        requestBillAsCustomer,
        cancelOrderAsCustomer,
        claimPaymentAsCustomer,
      }}
    >
      {children}
    </CustomerDataContext.Provider>
  );
}

export function useCustomerData() {
  const context = useContext(CustomerDataContext);

  if (!context) {
    throw new Error(
      "useCustomerData must be used within a CustomerDataProvider",
    );
  }

  return context;
}
