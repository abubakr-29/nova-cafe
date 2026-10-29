"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { createClient } from "@/lib/supabase/client";
import { BusinessDay } from "@/lib/business-day";
import type { Order, OrderStatus } from "@/types/order";
import type { TableSession } from "@/types/session";
import type { PaymentMethod } from "@/types/payment";
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
      "id, name, seats, shape, status, reservation_note, reserved_for, position_x, position_y, position_width, position_height",
    )
    .eq("restaurant_id", restaurantId);

  return (data ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    seats: t.seats,
    shape: t.shape,
    status: t.status,
    reservationNote: t.reservation_note ?? undefined,
    reservedFor: t.reserved_for ?? undefined,
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
      "id, table_id, status, bill_requested, payment_status, payment_method, started_at, restaurant_tables(name), session_guests(id, name, sort_order), orders(id)",
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
    paymentMethod: s.payment_method,
  }));
}

// Which orders to load. The dashboard never loads a café's whole history:
//  - "live": today's orders, every order of a still-open table, and anything not
//    finished yet (so an unfinished order is never hidden by the day rollover).
//  - "range": one business day, for the History page.
type OrderScope =
  | { kind: "live"; startsAt: string; openSessionIds: string[] }
  | { kind: "range"; startsAt: string; endsAt: string };

async function fetchBusinessDay(
  supabase: SupabaseClient,
  day?: string,
): Promise<BusinessDay | null> {
  const { data } = await supabase.rpc("business_day_bounds", {
    p_day: day ?? null,
  });

  const row = Array.isArray(data) ? data[0] : null;

  if (!row) return null;

  return {
    day: row.day,
    startsAt: new Date(row.starts_at).toISOString(),
    endsAt: new Date(row.ends_at).toISOString(),
  };
}

async function fetchOrders(
  supabase: SupabaseClient,
  restaurantId: string,
  scope: OrderScope,
): Promise<Order[]> {
  let query = supabase
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

  if (scope.kind === "live") {
    const parts = [
      `created_at.gte.${scope.startsAt}`,
      "status.in.(awaiting_validation,pending,confirmed,preparing,ready)",
    ];

    if (scope.openSessionIds.length > 0) {
      parts.push(`session_id.in.(${scope.openSessionIds.join(",")})`);
    }

    query = query.or(parts.join(","));
  } else {
    query = query
      .gte("created_at", scope.startsAt)
      .lt("created_at", scope.endsAt);
  }

  const { data } = await query;

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

export type DayOrders = {
  day: BusinessDay | null;
  orders: Order[];
  error?: string;
};

type StaffDataContextValue = {
  loading: boolean;
  /** True when the café's service has been paused (manual billing switch). */
  suspended: boolean;
  restaurantId: string | null;
  restaurantName: string;
  restaurantSlug: string;
  taxRate: number;
  /** The current business day (null until loaded, or before migration 013). */
  businessDay: BusinessDay | null;
  /** Live orders only: today's, plus those of open tables. See OrderScope. */
  orders: Order[];
  sessions: TableSession[];
  tables: RestaurantTable[];

  /** All orders of one business day ("2026-10-27"), for the History page. */
  fetchDay: (day?: string) => Promise<DayOrders>;

  /** The last failed save, to show staff. Set by every write below. */
  notice: Notice;
  dismissNotice: () => void;

  requestBill: (sessionId: string) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  cancelOrder: (orderId: string) => Promise<void>;
  /** "wrong_code" is for the guest-facing code check; "busy" means a tap on the same order is still saving. */
  validateOrder: (
    orderId: string,
    code: string,
  ) => Promise<"ok" | "wrong_code" | "failed" | "busy">;
  markSessionPaid: (sessionId: string, method: PaymentMethod) => Promise<void>;
  /** The guest said they paid but nothing arrived: back to unpaid. */
  markSessionUnpaid: (sessionId: string) => Promise<void>;
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

  // Bookings: record when guests are due (the table is only held around that
  // time), or clear the booking (guests arrived / cancelled).
  reserveTable: (
    tableId: string,
    reservedFor: string,
    note: string,
  ) => Promise<WriteResult>;
  clearReservation: (tableId: string) => Promise<WriteResult>;
};

export type Notice = { id: number; text: string } | null;

// What a save sends back (a Supabase result): an error, or the rows it changed.
type SaveResult = { error: unknown; data?: unknown[] | null };

const StaffDataContext = createContext<StaffDataContextValue | null>(null);

export function StaffDataProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => createClient());
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState("");
  const [restaurantSlug, setRestaurantSlug] = useState("");
  const [taxRate, setTaxRate] = useState(0);
  const [loading, setLoading] = useState(true);
  const [suspended, setSuspended] = useState(false);
  const [businessDay, setBusinessDay] = useState<BusinessDay | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [sessions, setSessions] = useState<TableSession[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [notice, setNotice] = useState<Notice>(null);
  const noticeCount = useRef(0);
  const inFlight = useRef(new Set<string>());

  const loadData = useCallback(
    async (rid: string) => {
      const [tablesRes, sessionsRes, dayRes] = await Promise.all([
        fetchTables(supabase, rid),
        fetchSessions(supabase, rid),
        fetchBusinessDay(supabase),
      ]);

      // If the day can't be worked out (migration 013 not applied yet), fall
      // back to this device's midnight so the dashboard still works.
      const startsAt =
        dayRes?.startsAt ??
        new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

      const ordersRes = await fetchOrders(supabase, rid, {
        kind: "live",
        startsAt,
        openSessionIds: sessionsRes.map((s) => s.id),
      });

      setTables(tablesRes);
      setSessions(sessionsRes);
      setBusinessDay(dayRes);
      setOrders(ordersRes);
    },
    [supabase],
  );

  useEffect(() => {
    let ignore = false;

    async function init() {
      setLoading(true);

      // A paused café can't read its own data (current_restaurant_id() returns
      // null for it), so ask the dedicated status function first. That way the
      // dashboard can say "service paused" instead of "not set up yet".
      const { data: billingStatus } = await supabase.rpc("my_billing_status");

      if (ignore) return;

      if (billingStatus === "suspended") {
        setSuspended(true);
        setRestaurantId(null);
        setLoading(false);
        return;
      }

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

  // When the business day rolls over (e.g. 5:00 am) refresh by itself, so a
  // dashboard left open overnight starts the new day without a manual reload.
  const dayEndsAt = businessDay?.endsAt ?? null;

  useEffect(() => {
    if (!dayEndsAt) return;

    const wait = new Date(dayEndsAt).getTime() - Date.now() + 1000;

    // setTimeout can't wait longer than ~24 days; a day is far below that.
    if (wait <= 0 || wait > 2 ** 31 - 1) return;

    const timer = setTimeout(() => {
      refetch();
    }, wait);

    return () => clearTimeout(timer);
  }, [dayEndsAt, refetch]);

  const fetchDay = useCallback(
    async (day?: string): Promise<DayOrders> => {
      if (!restaurantId) {
        return { day: null, orders: [], error: "No restaurant loaded." };
      }

      const bounds = await fetchBusinessDay(supabase, day);

      if (!bounds) {
        return {
          day: null,
          orders: [],
          error: "Could not work out that day. Has migration 013 been run?",
        };
      }

      const rows = await fetchOrders(supabase, restaurantId, {
        kind: "range",
        startsAt: bounds.startsAt,
        endsAt: bounds.endsAt,
      });

      return { day: bounds, orders: rows };
    },
    [supabase, restaurantId],
  );

  const dismissNotice = useCallback(() => setNotice(null), []);

  const announce = useCallback((text: string) => {
    noticeCount.current += 1;
    setNotice({ id: noticeCount.current, text });
  }, []);

  // Runs one save. A second tap on the same thing is ignored while the first is still
  // running. If it fails (an error, or nothing was changed, e.g. the café is paused),
  // staff are told. It always reloads, so the screen shows what is really saved.
  const save = useCallback(
    async (
      key: string,
      failure: string,
      work: () => PromiseLike<SaveResult>,
    ): Promise<"ok" | "failed" | "busy"> => {
      if (inFlight.current.has(key)) return "busy";

      inFlight.current.add(key);
      let ok = false;

      try {
        const { error, data } = await work();
        ok = !error && (data === undefined || (data?.length ?? 0) > 0);
      } catch {
        ok = false;
      }

      inFlight.current.delete(key);
      await refetch();

      if (!ok) announce(failure);

      return ok ? "ok" : "failed";
    },
    [refetch, announce],
  );

  const requestBill = useCallback(
    async (sessionId: string) => {
      await save(
        `bill:${sessionId}`,
        "Couldn't request the bill. Please try again.",
        () =>
          supabase
            .from("table_sessions")
            .update({ bill_requested: true })
            .eq("id", sessionId)
            .select("id"),
      );
    },
    [supabase, save],
  );

  const updateOrderStatus = useCallback(
    async (orderId: string, status: OrderStatus) => {
      await save(
        `order:${orderId}`,
        "Couldn't update the order. Please try again.",
        () =>
          supabase
            .from("orders")
            .update({ status })
            .eq("id", orderId)
            .select("id"),
      );
    },
    [supabase, save],
  );

  const cancelOrder = useCallback(
    async (orderId: string) => {
      await save(
        `order:${orderId}`,
        "Couldn't cancel the order. Please try again.",
        () =>
          supabase
            .from("orders")
            .update({ status: "cancelled" })
            .eq("id", orderId)
            .select("id"),
      );
    },
    [supabase, save],
  );

  const validateOrder = useCallback(
    async (orderId: string, code: string) => {
      const { data: order, error: readError } = await supabase
        .from("orders")
        .select("validation_code")
        .eq("id", orderId)
        .single();

      if (readError || !order) {
        announce("Couldn't check the code. Please try again.");
        return "failed" as const;
      }

      if (order.validation_code !== code) return "wrong_code" as const;

      // Only an order still waiting for its code can be confirmed, so a cancelled
      // order is never brought back by a late tap.
      return save(
        `order:${orderId}`,
        "Couldn't confirm this order. It may already be confirmed or cancelled.",
        () =>
          supabase
            .from("orders")
            .update({ status: "pending" })
            .eq("id", orderId)
            .eq("status", "awaiting_validation")
            .select("id"),
      );
    },
    [supabase, save, announce],
  );

  const markSessionPaid = useCallback(
    async (sessionId: string, method: PaymentMethod) => {
      await save(
        `pay:${sessionId}`,
        "Couldn't record the payment. Please try again.",
        () =>
          supabase
            .from("table_sessions")
            .update({ payment_status: "paid", payment_method: method })
            .eq("id", sessionId)
            .select("id"),
      );
    },
    [supabase, save],
  );

  const markSessionUnpaid = useCallback(
    async (sessionId: string) => {
      await save(
        `pay:${sessionId}`,
        "Couldn't update the payment. Please try again.",
        () =>
          supabase
            .from("table_sessions")
            .update({ payment_status: "unpaid" })
            .eq("id", sessionId)
            .select("id"),
      );
    },
    [supabase, save],
  );

  const closeTableSession = useCallback(
    async (tableId: string) => {
      const session = sessions.find(
        (s) => s.tableId === tableId && s.status !== "closed",
      );

      if (session) {
        const closed = await save(
          `table:${tableId}`,
          "Couldn't free the table. Please try again.",
          () =>
            supabase
              .from("table_sessions")
              .update({ status: "closed", closed_at: new Date().toISOString() })
              .eq("id", session.id)
              .select("id"),
        );

        // Never mark the table free while its visit is still open.
        if (closed !== "ok") return;
      }

      await save(
        `table:${tableId}`,
        "Couldn't free the table. Please try again.",
        () =>
          supabase
            .from("restaurant_tables")
            .update({ status: "available" })
            .eq("id", tableId)
            .select("id"),
      );
    },
    [supabase, sessions, save],
  );

  const updateSessionGuestCount = useCallback(
    async (sessionId: string, guestCount: number) => {
      const session = sessions.find((s) => s.id === sessionId);
      if (!session) return;

      const safeCount = Math.max(1, guestCount);
      const current = session.guests.length;

      if (safeCount === current) return;

      await save(
        `guests:${sessionId}`,
        "Couldn't change the number of guests. Please try again.",
        () => {
          if (safeCount < current) {
            const idsToRemove = session.guests
              .slice(safeCount)
              .map((g) => g.id);

            return supabase
              .from("session_guests")
              .delete()
              .in("id", idsToRemove)
              .select("id");
          }

          const newGuests = Array.from(
            { length: safeCount - current },
            (_, i) => ({
              session_id: sessionId,
              name: `Guest ${current + i + 1}`,
              sort_order: current + i + 1,
            }),
          );

          return supabase.from("session_guests").insert(newGuests).select("id");
        },
      );
    },
    [supabase, sessions, save],
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

  const reserveTable = useCallback(
    async (
      tableId: string,
      reservedFor: string,
      note: string,
    ): Promise<WriteResult> => {
      if (!restaurantId) return { error: "No restaurant loaded." };

      const when = Date.parse(reservedFor);
      if (Number.isNaN(when)) {
        return { error: "Please pick a valid date and time." };
      }

      // Only the booking columns change. The table's status stays as it is:
      // a booking only holds the table around its time (see lib/reservations).
      const { data, error } = await supabase
        .from("restaurant_tables")
        .update({
          reserved_for: new Date(when).toISOString(),
          reservation_note: note.trim().slice(0, 80) || null,
        })
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

  const clearReservation = useCallback(
    async (tableId: string): Promise<WriteResult> => {
      if (!restaurantId) return { error: "No restaurant loaded." };

      const { data, error } = await supabase
        .from("restaurant_tables")
        .update({ reserved_for: null, reservation_note: null })
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

  return (
    <StaffDataContext.Provider
      value={{
        loading,
        suspended,
        restaurantId,
        restaurantName,
        restaurantSlug,
        taxRate,
        businessDay,
        fetchDay,
        orders,
        sessions,
        tables,
        notice,
        dismissNotice,
        requestBill,
        updateOrderStatus,
        cancelOrder,
        validateOrder,
        markSessionPaid,
        markSessionUnpaid,
        closeTableSession,
        updateSessionGuestCount,
        addTables,
        updateTable,
        deleteTable,
        reserveTable,
        clearReservation,
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
