"use client";

import { CalendarDays, Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import DayPicker from "@/components/ui/day-picker";
import { formatDay, shiftDay } from "@/lib/business-day";
import { downloadCsv, toCsv } from "@/lib/csv";
import { createClient } from "@/lib/supabase/client";
import { useStaffData } from "@/lib/staff-data-context";

type Row = { label: string; orders?: number; quantity?: number; sales: number };

type Report = {
  totals: {
    orders: number;
    sales: number;
    subtotal: number;
    tax: number;
    average: number;
    paid: number;
    unpaid: number;
    cancelled: number;
  };
  by_payment: { method: string; orders: number; sales: number }[];
  by_source: { source: string; orders: number; sales: number }[];
  by_hour: { hour: number; orders: number; sales: number }[];
  by_day: { day: string; orders: number; sales: number }[];
  by_table: { table: string; orders: number; sales: number }[];
  top_items: { name: string; quantity: number; sales: number }[];
};

type Preset = "today" | "yesterday" | "7d" | "30d" | "custom";

const PRESETS: { key: Exclude<Preset, "custom">; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
];

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  card: "Card",
  not_recorded: "Not recorded",
};

const rupees = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export default function ReportsPage() {
  const { businessDay, restaurantName } = useStaffData();
  const [supabase] = useState(() => createClient());
  const today = businessDay?.day ?? null;

  const [preset, setPreset] = useState<Preset>("7d");
  const [custom, setCustom] = useState<{ start: string; end: string } | null>(
    null,
  );
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"orders" | "items" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const range = useMemo(() => {
    if (!today) return null;

    if (preset === "custom" && custom) return custom;
    if (preset === "today") return { start: today, end: today };

    if (preset === "yesterday") {
      const day = shiftDay(today, -1);
      return { start: day, end: day };
    }

    return { start: shiftDay(today, preset === "30d" ? -29 : -6), end: today };
  }, [preset, custom, today]);

  const from = range?.start;
  const to = range?.end;

  useEffect(() => {
    if (!from || !to) return;

    let ignore = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc("report_data", {
        p_from: from,
        p_to: to,
      });

      if (ignore) return;

      if (rpcError) {
        setReport(null);
        setError(
          rpcError.code === "42501"
            ? "Reports are for the café owner only."
            : "Could not load the report. Please try again.",
        );
      } else {
        setReport(data as Report);
      }

      setLoading(false);
    }

    load();

    return () => {
      ignore = true;
    };
  }, [supabase, from, to]);

  async function exportCsv(kind: "orders" | "items") {
    if (!from || !to) return;

    setExporting(kind);
    setExportError(null);

    // The API sends at most 1,000 rows at a time, so read page by page.
    const rows: Record<string, string | number | null>[] = [];

    for (let page = 0; ; page += 1) {
      const { data, error: rpcError } = await supabase
        .rpc(kind === "orders" ? "report_orders" : "report_items", {
          p_from: from,
          p_to: to,
        })
        .range(page * 1000, page * 1000 + 999);

      if (rpcError || !data) {
        setExportError("The export did not finish. Please try again.");
        setExporting(null);
        return;
      }

      rows.push(...data);

      if (data.length < 1000) break;
    }

    const csv =
      kind === "orders"
        ? toCsv(
            [
              "Business day",
              "Date",
              "Time",
              "Order no",
              "Table",
              "Placed by",
              "Status",
              "Items",
              "Subtotal",
              "GST",
              "Total",
              "Payment status",
              "Payment method",
              "Paid at",
            ],
            rows.map((r) => [
              r.business_day,
              r.date,
              r.time,
              r.order_number,
              r.table_name,
              r.placed_by,
              r.status,
              r.items,
              r.subtotal,
              r.tax,
              r.total,
              r.payment_status,
              r.payment_method,
              r.paid_at,
            ]),
          )
        : toCsv(
            [
              "Business day",
              "Date",
              "Time",
              "Order no",
              "Table",
              "Order status",
              "Item",
              "Size",
              "Add-ons",
              "Quantity",
              "Unit price",
              "Line total",
            ],
            rows.map((r) => [
              r.business_day,
              r.date,
              r.time,
              r.order_number,
              r.table_name,
              r.status,
              r.item,
              r.size,
              r.addons,
              r.quantity,
              r.unit_price,
              r.total_price,
            ]),
          );

    const slug = (restaurantName || "cafe")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    downloadCsv(`${slug}-${kind}-${from}-to-${to}.csv`, csv);
    setExporting(null);
  }

  const rangeLabel =
    from && to
      ? from === to
        ? formatDay(from)
        : `${formatDay(from)} – ${formatDay(to)}`
      : "Loading";

  const hours: Row[] = useMemo(() => {
    if (!report || report.by_hour.length === 0) return [];

    const first = report.by_hour[0].hour;
    const last = report.by_hour[report.by_hour.length - 1].hour;
    const byHour = new Map(report.by_hour.map((h) => [h.hour, h]));

    return Array.from({ length: last - first + 1 }, (_, i) => {
      const hour = first + i;
      const found = byHour.get(hour);

      return {
        label: `${hour % 12 || 12}${hour < 12 ? "am" : "pm"}`,
        orders: found?.orders ?? 0,
        sales: found?.sales ?? 0,
      };
    });
  }, [report]);

  return (
    <div className="mx-auto max-w-4xl px-5 py-6 md:px-10 md:py-8">
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
        Reports
      </h1>

      <p className="mt-1 text-sm text-white/45">
        Sales by business day. Cancelled and unconfirmed orders are not counted
        as sales.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPreset(p.key)}
            className={`h-11 cursor-pointer rounded-full border px-5 text-sm font-medium transition ${
              preset === p.key
                ? "border-[#f5f2ea] bg-[#f5f2ea] text-[#0b0b0d]"
                : "border-white/10 text-white/70 hover:bg-white/5"
            }`}
          >
            {p.label}
          </button>
        ))}

        <button
          type="button"
          disabled={!today}
          onClick={() => setCalendarOpen(true)}
          className={`flex h-11 cursor-pointer items-center gap-2 rounded-full border px-5 text-sm font-medium transition ${
            preset === "custom"
              ? "border-[#f5f2ea] bg-[#f5f2ea] text-[#0b0b0d]"
              : "border-white/10 text-white/70 hover:bg-white/5"
          }`}
        >
          <CalendarDays size={15} />
          {preset === "custom" ? rangeLabel : "Pick dates"}
        </button>
      </div>

      {preset !== "custom" && (
        <p className="mt-3 text-xs text-white/35">{rangeLabel}</p>
      )}

      {calendarOpen && today && (
        <DayPicker
          range
          title="Pick a date range"
          start={range?.start ?? today}
          end={range?.end ?? today}
          max={today}
          maxDays={92}
          onPick={(start, end) => {
            setCustom({ start, end });
            setPreset("custom");
          }}
          onClose={() => setCalendarOpen(false)}
        />
      )}

      {error ? (
        <p className="mt-8 rounded-2xl border border-red-300/20 bg-red-300/6 px-5 py-4 text-sm text-red-200">
          {error}
        </p>
      ) : !report ? (
        <p className="py-16 text-center text-sm text-white/35">Loading…</p>
      ) : (
        <div className={loading ? "opacity-50 transition-opacity" : ""}>
          <section className="mt-6 rounded-3xl border border-white/[0.07] bg-white/2.5 p-6">
            <p className="text-xs text-white/45 md:text-sm">Sales</p>

            <p className="mt-1.5 text-4xl font-semibold tracking-tight tabular-nums">
              {rupees(report.totals.sales)}
            </p>

            <p className="mt-2 text-sm text-white/45">
              Paid {rupees(report.totals.paid)} · Not paid yet{" "}
              {rupees(report.totals.unpaid)}
            </p>
          </section>

          <section className="mt-3 grid grid-cols-2 divide-x divide-white/[0.07] rounded-3xl border border-white/[0.07] bg-white/2.5 md:grid-cols-4">
            <Stat label="Orders" value={`${report.totals.orders}`} />
            <Stat label="Average order" value={rupees(report.totals.average)} />
            <Stat label="GST collected" value={rupees(report.totals.tax)} />
            <Stat label="Cancelled" value={`${report.totals.cancelled}`} />
          </section>

          {report.totals.orders === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-white/10 px-6 py-16 text-center">
              <p className="text-sm text-white/55">No sales in these dates</p>
            </div>
          ) : (
            <>
              <Card title="How guests paid" note="Paid bills only">
                <Bars
                  rows={report.by_payment.map((p) => ({
                    label: METHOD_LABELS[p.method] ?? p.method,
                    orders: p.orders,
                    sales: p.sales,
                  }))}
                />
              </Card>

              {report.by_day.length > 1 && (
                <Card title="Sales by day">
                  <Bars
                    rows={report.by_day.map((d) => ({
                      label: formatDay(d.day),
                      orders: d.orders,
                      sales: d.sales,
                    }))}
                  />
                </Card>
              )}

              <Card title="Sales by hour" note="Clock time of the order">
                <Bars rows={hours} />
              </Card>

              <Card title="Top items" note="By sales, top 10">
                <Bars
                  rows={report.top_items.map((i) => ({
                    label: i.name,
                    quantity: i.quantity,
                    sales: i.sales,
                  }))}
                />
              </Card>

              <Card title="By table">
                <Bars
                  rows={report.by_table.map((t) => ({
                    label: t.table,
                    orders: t.orders,
                    sales: t.sales,
                  }))}
                />
              </Card>

              <Card title="Who placed the orders">
                <Bars
                  rows={report.by_source.map((s) => ({
                    label: s.source === "staff" ? "Staff" : "Customers",
                    orders: s.orders,
                    sales: s.sales,
                  }))}
                />
              </Card>
            </>
          )}

          <section className="mt-6 rounded-3xl border border-white/8 p-6">
            <h2 className="text-sm font-medium text-white/80">
              Download for your records
            </h2>

            <p className="mt-1 text-xs text-white/40">
              CSV files open in Excel or Google Sheets. Times are café time.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {(
                [
                  ["orders", "Orders (one row per order)"],
                  ["items", "Items (one row per item sold)"],
                ] as const
              ).map(([kind, label]) => (
                <button
                  key={kind}
                  type="button"
                  disabled={exporting !== null}
                  onClick={() => exportCsv(kind)}
                  className="flex h-11 cursor-pointer items-center gap-2 rounded-full border border-white/10 px-5 text-sm text-white/75 transition hover:bg-white/5 disabled:opacity-50"
                >
                  <Download size={15} />
                  {exporting === kind ? "Preparing…" : label}
                </button>
              ))}
            </div>

            {exportError && (
              <p className="mt-3 text-xs text-red-300/80">{exportError}</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-4 md:px-6 md:py-5">
      <p className="text-xs text-white/45 md:text-sm">{label}</p>

      <p className="mt-1.5 text-xl font-semibold tracking-tight tabular-nums md:text-2xl">
        {value}
      </p>
    </div>
  );
}

function Card({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 rounded-3xl border border-white/8 bg-white/2 p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium text-white/80">{title}</h2>
        {note && <span className="text-xs text-white/30">{note}</span>}
      </div>

      <div className="mt-4">{children}</div>
    </section>
  );
}

// Plain bars: no chart library. The longest bar is full width.
function Bars({ rows }: { rows: Row[] }) {
  const top = Math.max(...rows.map((r) => r.sales), 1);

  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-white/75">{row.label}</span>

            <span className="shrink-0 tabular-nums text-white/85">
              {rupees(row.sales)}
              {(row.quantity ?? row.orders) !== undefined && (
                <span className="ml-2 text-xs text-white/35">
                  {row.quantity !== undefined
                    ? `${row.quantity} sold`
                    : `${row.orders} ${row.orders === 1 ? "order" : "orders"}`}
                </span>
              )}
            </span>
          </div>

          <div className="mt-1.5 h-1.5 rounded-full bg-white/6">
            <div
              className="h-full rounded-full bg-[#d7a45a]"
              style={{ width: `${Math.max((row.sales / top) * 100, 1.5)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
