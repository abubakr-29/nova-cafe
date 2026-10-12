"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { ExternalLink, Plus, Printer, Trash2 } from "lucide-react";

import { useStaffData } from "@/lib/staff-data-context";
import { tableUrl, useSiteUrl } from "@/lib/site-url";
import {
  compareTableNames,
  nextTableNames,
  planTablePositions,
} from "@/lib/table-layout";
import type { RestaurantTable, TableShape } from "@/types/table";

const SHAPES: { value: TableShape; label: string }[] = [
  { value: "square", label: "Square" },
  { value: "round", label: "Round" },
  { value: "rectangle", label: "Rectangle" },
];

const MAX_BATCH = 50;
const MAX_SEATS = 30;

const inputClass =
  "h-10 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/25";

type Notice = { kind: "error" | "success"; text: string } | null;

function parseWholeNumber(value: string) {
  return /^\d+$/.test(value.trim()) ? Number(value) : NaN;
}

export default function TablesPage() {
  const {
    loading,
    restaurantSlug,
    tables,
    addTables,
    updateTable,
    deleteTable,
  } = useStaffData();
  const site = useSiteUrl();

  const [count, setCount] = useState("1");
  const [seats, setSeats] = useState("4");
  const [shape, setShape] = useState<TableShape>("square");
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const sortedTables = useMemo(
    () => [...tables].sort((a, b) => compareTableNames(a.name, b.name)),
    [tables],
  );

  const countValue = parseWholeNumber(count);
  const seatsValue = parseWholeNumber(seats);
  const countValid = countValue >= 1 && countValue <= MAX_BATCH;
  const seatsValid = seatsValue >= 1 && seatsValue <= MAX_SEATS;

  const previewNames = useMemo(
    () =>
      countValid
        ? nextTableNames(
            tables.map((t) => t.name),
            countValue,
          )
        : [],
    [countValid, countValue, tables],
  );

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    if (!countValid || !seatsValid || adding) return;

    setAdding(true);
    setNotice(null);

    const names = nextTableNames(
      tables.map((t) => t.name),
      countValue,
    );
    const { positions, overflow } = planTablePositions(
      tables.map((t) => t.position),
      names.map(() => shape),
    );

    const result = await addTables(
      names.map((name, i) => ({
        name,
        seats: seatsValue,
        shape,
        position: positions[i],
      })),
    );

    setAdding(false);

    if (result.error) {
      setNotice({ kind: "error", text: result.error });
      return;
    }

    setNotice({
      kind: "success",
      text:
        `Added ${names.length === 1 ? names[0] : `${names[0]} to ${names[names.length - 1]}`}.` +
        (overflow > 0
          ? " The floor map is full, so some new tables overlap others on it."
          : ""),
    });
  }

  return (
    <>
      <header className="flex h-20 items-center justify-between border-b border-white/[0.07] px-6 md:px-10">
        <div>
          <p className="text-xs text-white/25">Setup</p>
          <p className="mt-1 text-sm text-white/60">Tables &amp; QR codes</p>
        </div>

        <Link
          href="/dashboard/tables/qr"
          className="flex items-center gap-2 rounded-full bg-[#f5f2ea] px-4 py-2.5 text-sm font-medium text-[#0b0b0d] transition hover:scale-[1.02]"
        >
          <Printer size={15} />
          Print QR codes
        </Link>
      </header>

      <div className="mx-auto max-w-4xl space-y-8 px-6 py-8 md:px-10">
        {/* Add tables */}
        <section className="rounded-3xl border border-white/[0.07] bg-white/2 p-6">
          <h2 className="text-sm font-medium">Add tables</h2>
          <p className="mt-1 text-xs text-white/35">
            New tables are numbered automatically and placed on the floor map.
          </p>

          <form
            onSubmit={handleAdd}
            className="mt-5 flex flex-wrap items-end gap-4"
          >
            <label className="block">
              <span className="mb-1.5 block text-xs text-white/40">
                How many
              </span>
              <input
                value={count}
                onChange={(e) => setCount(e.target.value)}
                inputMode="numeric"
                className={`${inputClass} w-24`}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs text-white/40">
                Seats each
              </span>
              <input
                value={seats}
                onChange={(e) => setSeats(e.target.value)}
                inputMode="numeric"
                className={`${inputClass} w-24`}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs text-white/40">Shape</span>
              <select
                value={shape}
                onChange={(e) => setShape(e.target.value as TableShape)}
                className={`${inputClass} w-36`}
              >
                {SHAPES.map((s) => (
                  <option
                    key={s.value}
                    value={s.value}
                    className="bg-[#111114]"
                  >
                    {s.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              disabled={!countValid || !seatsValid || adding || loading}
              className="flex h-10 items-center gap-2 rounded-xl bg-white/10 px-4 text-sm transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              <Plus size={15} />
              {adding ? "Adding…" : "Add"}
            </button>
          </form>

          <p className="mt-3 text-xs text-white/30">
            {countValid && seatsValid
              ? `Will add ${
                  previewNames.length === 1
                    ? previewNames[0]
                    : `${previewNames[0]} to ${previewNames[previewNames.length - 1]}`
                }.`
              : `Enter 1-${MAX_BATCH} tables and 1-${MAX_SEATS} seats.`}
          </p>

          {notice && (
            <p
              className={`mt-3 text-xs ${
                notice.kind === "error"
                  ? "text-red-300/80"
                  : "text-emerald-300/80"
              }`}
            >
              {notice.text}
            </p>
          )}
        </section>

        {/* Existing tables */}
        <section>
          <h2 className="mb-3 text-sm font-medium">
            Your tables{" "}
            <span className="font-normal text-white/30">({tables.length})</span>
          </h2>

          {loading ? (
            <p className="text-sm text-white/30">Loading…</p>
          ) : sortedTables.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 px-6 py-12 text-center">
              <p className="text-sm text-white/50">No tables yet.</p>
              <p className="mt-1 text-xs text-white/30">
                Add your first tables above, then print their QR codes.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {sortedTables.map((table) => (
                <TableRow
                  // Remount when the saved values change so the editable
                  // fields never show stale data after a refetch.
                  key={`${table.id}:${table.name}:${table.seats}:${table.shape}`}
                  table={table}
                  otherNames={tables
                    .filter((t) => t.id !== table.id)
                    .map((t) => t.name.trim().toLowerCase())}
                  url={tableUrl(site.url, restaurantSlug, table.id)}
                  onSave={updateTable}
                  onDelete={deleteTable}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

const STATUS_LABEL: Record<RestaurantTable["status"], string> = {
  available: "Available",
  occupied: "Occupied",
  reserved: "Reserved",
  attention: "Attention",
};

function TableRow({
  table,
  otherNames,
  url,
  onSave,
  onDelete,
}: {
  table: RestaurantTable;
  otherNames: string[];
  url: string;
  onSave: (
    tableId: string,
    patch: { name?: string; seats?: number; shape?: TableShape },
  ) => Promise<{ error?: string }>;
  onDelete: (tableId: string) => Promise<{ error?: string }>;
}) {
  const [name, setName] = useState(table.name);
  const [seats, setSeats] = useState(String(table.seats));
  const [shape, setShape] = useState<TableShape>(table.shape);
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedName = name.trim();
  const seatsValue = parseWholeNumber(seats);

  const nameTaken = otherNames.includes(trimmedName.toLowerCase());
  const valid =
    trimmedName.length > 0 &&
    !nameTaken &&
    seatsValue >= 1 &&
    seatsValue <= MAX_SEATS;
  const dirty =
    trimmedName !== table.name ||
    seatsValue !== table.seats ||
    shape !== table.shape;

  const canDelete = table.status === "available";

  async function handleSave() {
    if (!valid || !dirty || busy) return;

    setBusy(true);
    setError(null);

    const result = await onSave(table.id, {
      name: trimmedName,
      seats: seatsValue,
      shape,
    });

    // On success the row remounts with the saved values (see `key`).
    if (result.error) {
      setError(result.error);
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (busy) return;

    setBusy(true);
    setError(null);

    const result = await onDelete(table.id);

    if (result.error) {
      setError(result.error);
      setBusy(false);
      setConfirmingDelete(false);
    }
  }

  return (
    <li className="rounded-2xl border border-white/[0.07] bg-white/2 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Table name"
          className={`${inputClass} w-36 ${nameTaken ? "border-red-300/40" : ""}`}
        />

        <input
          value={seats}
          onChange={(e) => setSeats(e.target.value)}
          inputMode="numeric"
          aria-label="Seats"
          className={`${inputClass} w-16`}
        />
        <span className="-ml-1 text-xs text-white/30">seats</span>

        <select
          value={shape}
          onChange={(e) => setShape(e.target.value as TableShape)}
          aria-label="Shape"
          className={`${inputClass} w-32`}
        >
          {SHAPES.map((s) => (
            <option key={s.value} value={s.value} className="bg-[#111114]">
              {s.label}
            </option>
          ))}
        </select>

        <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-wider text-white/35">
          {STATUS_LABEL[table.status]}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {dirty && (
            <button
              type="button"
              onClick={handleSave}
              disabled={!valid || busy}
              className="h-9 rounded-xl bg-[#f5f2ea] px-3 text-xs font-medium text-[#0b0b0d] transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? "Saving…" : "Save"}
            </button>
          )}

          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${table.name} customer page`}
            title="Open the customer page for this table"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/40 transition hover:bg-white/5 hover:text-white/70"
          >
            <ExternalLink size={14} />
          </a>

          {confirmingDelete ? (
            <>
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy}
                className="h-9 rounded-xl bg-red-400/15 px-3 text-xs text-red-200 transition hover:bg-red-400/25 disabled:opacity-40 cursor-pointer"
              >
                {busy ? "Deleting…" : "Confirm delete"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="h-9 rounded-xl px-2 text-xs text-white/40 transition hover:text-white/70 cursor-pointer"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              disabled={!canDelete || busy}
              aria-label={`Delete ${table.name}`}
              title={
                canDelete
                  ? "Delete this table"
                  : "Close this table's session before deleting it"
              }
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/40 transition hover:bg-red-400/10 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {nameTaken && (
        <p className="mt-2 text-xs text-red-300/80">
          Another table already uses that name.
        </p>
      )}
      {error && <p className="mt-2 text-xs text-red-300/80">{error}</p>}
    </li>
  );
}
