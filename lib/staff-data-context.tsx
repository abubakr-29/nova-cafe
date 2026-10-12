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
import type { RestaurantTable, TablePosition, TableShape } from "@/types/table";

// STAFF-ONLY data layer — used by the authenticated /dashboard. Kept
// separate from the customer data layer (lib/customer-data-context.tsx)
// so neither side ships the other's code. Everything here is safe
// because RLS already scopes an authenticated staff member to their own
// restaurant (current_restaurant_id()) — broad reads, direct table
// writes, and Realtime subscriptions are all fine for staff.
//
// The dashboard's menu CMS (app/dashboard/menu) fetches and edits its
// own menu data directly, so menu items/categories deliberately aren't
// loaded here.

type SupabaseClient = ReturnType<typeof createClient>;

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

export type NewTableInput = {
  name: string;
  seats: number;
  shape: TableShape;
  position: TablePosition;
};

export type TablePatch = {
  name?: string;
  seats?: number;
  shape?: TableShape;
};

type WriteResult = { error?: string };

type StaffDataContextValue = {
  loading: boolean;
  restaurantId: string | null;
  restaurantName: string;
  restaurantSlug: string;
  taxRate: number;
  orders: Order[];
  sessions: TableSession[];
  tables: RestaurantTable[];

  requestBill: (sessionId: string) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  cancelOrder: (orderId: string) => Promise<void>;
  validateOrder: (orderId: string, code: string) => Promise<boolean>;
  markSessionPaid: (sessionId: string) => Promise<void>;
  closeTableSession: (tableId: string) => Promise<void>;
  updateSessionGuestCount: (
    sessionId: string,
    guestCount: number,
  ) => Promise<void>;

  // Table management. Unlike the writes above these report failures, since
  // they can legitimately fail (duplicate name, table has order history).
  addTables: (tables: NewTableInput[]) => Promise<WriteResult>;
  updateTable: (tableId: string, patch: TablePatch) => Promise<WriteResult>;
  deleteTable: (tableId: string) => Promise<WriteResult>;
};

const StaffDataContext = createContext<StaffDataContextValue | null>(null);

export function StaffDataProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => createClient());
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState("");
  const [restaurantSlug, setRestaurantSlug] = useState("");
  const [taxRate, setTaxRate] = useState(0);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [sessions, setSessions] = useState<TableSession[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);

  const loadData = useCallback(
    async (rid: string) => {
      const [tablesRes, sessionsRes, ordersRes] = await Promise.all([
        fetchTables(supabase, rid),
        fetchSessions(supabase, rid),
        fetchOrders(supabase, rid),
      ]);

      setTables(tablesRes);
      setSessions(sessionsRes);
      setOrders(ordersRes);
    },
    [supabase],
  );

  useEffect(() => {
    let ignore = false;

    async function init() {
      setLoading(true);

      // Resolve the signed-in staff member's own restaurant via the
      // auth-scoped current_restaurant_id() RPC — never a slug, so each
      // staff account only ever sees its own café's data.
      const { data: rid } = await supabase.rpc("current_restaurant_id");

      if (ignore) return;

      // No restaurant linked to this staff account yet. Still clear
      // `loading` so callers can tell "still loading" apart from
      // "there's no restaurant here", instead of spinning forever.
      if (!rid) {
        setRestaurantId(null);
        setLoading(false);
        return;
      }

      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("id, name, slug, tax_rate")
        .eq("id", rid)
        .single();

      if (ignore) return;

      if (!restaurant) {
        setRestaurantId(null);
        setLoading(false);
        return;
      }

      setRestaurantId(restaurant.id);
      setRestaurantName(restaurant.name);
      setRestaurantSlug(restaurant.slug);
      setTaxRate(restaurant.tax_rate);
      await loadData(restaurant.id);
      if (!ignore) setLoading(false);
    }

    init();

    return () => {
      ignore = true;
    };
  }, [supabase, loadData]);

  // Single refetch used by every write method below.
  const refetch = useCallback(async () => {
    if (restaurantId) await loadData(restaurantId);
  }, [restaurantId, loadData]);

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
          event: "UPDATE",
          schema: "public",
          table: "restaurants",
          filter: `id=eq.${restaurantId}`,
        },
        (payload) => {
          const updated = payload.new as { name: string; tax_rate: number };
          setRestaurantName(updated.name);
          setTaxRate(updated.tax_rate);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, restaurantId, refetch]);

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

  const addTables = useCallback(
    async (inputs: NewTableInput[]): Promise<WriteResult> => {
      if (!restaurantId) return { error: "No restaurant loaded." };
      if (inputs.length === 0) return {};

      const { error } = await supabase.from("restaurant_tables").insert(
        inputs.map((t) => ({
          restaurant_id: restaurantId,
          name: t.name,
          seats: t.seats,
          shape: t.shape,
          status: "available",
          position_x: t.position.x,
          position_y: t.position.y,
          position_width: t.position.width,
          position_height: t.position.height,
        })),
      );

      if (error) return { error: error.message };

      await refetch();
      return {};
    },
    [supabase, restaurantId, refetch],
  );

  const updateTable = useCallback(
    async (tableId: string, patch: TablePatch): Promise<WriteResult> => {
      if (!restaurantId) return { error: "No restaurant loaded." };

      const { data, error } = await supabase
        .from("restaurant_tables")
        .update(patch)
        .eq("id", tableId)
        .eq("restaurant_id", restaurantId)
        .select("id");

      if (error) return { error: error.message };
      if (!data || data.length === 0) return { error: "Table not found." };

      await refetch();
      return {};
    },
    [supabase, restaurantId, refetch],
  );

  const deleteTable = useCallback(
    async (tableId: string): Promise<WriteResult> => {
      if (!restaurantId) return { error: "No restaurant loaded." };

      const { data, error } = await supabase
        .from("restaurant_tables")
        .delete()
        .eq("id", tableId)
        .eq("restaurant_id", restaurantId)
        .select("id");

      if (error) {
        // 23503 = foreign key violation: orders / sessions still reference it.
        return {
          error:
            error.code === "23503"
              ? "This table has order history, so it can't be deleted. Rename it instead."
              : error.message,
        };
      }

      if (!data || data.length === 0) return { error: "Table not found." };

      // Realtime can't deliver DELETE events through a column filter, so
      // refresh explicitly rather than waiting for the subscription.
      await refetch();
      return {};
    },
    [supabase, restaurantId, refetch],
  );

  return (
    <StaffDataContext.Provider
      value={{
        loading,
        restaurantId,
        restaurantName,
        restaurantSlug,
        taxRate,
        orders,
        sessions,
        tables,
        requestBill,
        updateOrderStatus,
        cancelOrder,
        validateOrder,
        markSessionPaid,
        closeTableSession,
        updateSessionGuestCount,
        addTables,
        updateTable,
        deleteTable,
      }}
    >
      {children}
    </StaffDataContext.Provider>
  );
}

export function useStaffData() {
  const context = useContext(StaffDataContext);

  if (!context) {
    throw new Error("useStaffData must be used within a StaffDataProvider");
  }

  return context;
}
