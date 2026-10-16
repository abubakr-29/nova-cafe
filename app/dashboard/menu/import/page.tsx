"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Download, FileUp } from "lucide-react";

import DietDot from "@/components/menu/diet-dot";
import { formatPrice } from "@/lib/format-price";
import {
  MENU_IMPORT_TEMPLATE,
  menuItemKey,
  parseMenuImport,
  toRpcPayload,
  type ImportRow,
} from "@/lib/menu-import";
import { useStaffData } from "@/lib/staff-data-context";
import { createClient } from "@/lib/supabase/client";

type Existing = {
  categories: Set<string>;
  items: Set<string>;
  /** False when we couldn't read the current menu (the server still skips duplicates). */
  known: boolean;
};

type ImportResult = {
  new_categories: number;
  new_items: number;
  skipped_existing: number;
};

const lower = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

const buttonClass =
  "flex h-10 items-center gap-2 rounded-xl border border-white/10 px-4 text-xs text-white/60 transition hover:bg-white/5 hover:text-white";

export default function ImportMenuPage() {
  const { restaurantName } = useStaffData();
  const [supabase] = useState(() => createClient());
  const fileInput = useRef<HTMLInputElement>(null);

  const [text, setText] = useState("");
  const [existing, setExisting] = useState<Existing | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  // What is already on the menu, so the preview can say what will be skipped.
  useEffect(() => {
    let ignore = false;

    async function load() {
      const { data: restaurantId } = await supabase.rpc(
        "current_restaurant_id",
      );

      if (!restaurantId) {
        if (!ignore) {
          setExisting({
            categories: new Set(),
            items: new Set(),
            known: false,
          });
        }
        return;
      }

      const [categoriesResult, itemsResult] = await Promise.all([
        supabase
          .from("menu_categories")
          .select("id, name")
          .eq("restaurant_id", restaurantId),
        supabase
          .from("menu_items")
          .select("name, category_id")
          .eq("restaurant_id", restaurantId),
      ]);

      if (ignore) return;

      if (categoriesResult.error || itemsResult.error) {
        setExisting({ categories: new Set(), items: new Set(), known: false });
        return;
      }

      const categories = categoriesResult.data ?? [];
      const nameById = new Map(categories.map((c) => [c.id, c.name as string]));

      setExisting({
        known: true,
        categories: new Set(categories.map((c) => lower(c.name))),
        items: new Set(
          (itemsResult.data ?? []).map((i) =>
            menuItemKey(nameById.get(i.category_id) ?? "", i.name),
          ),
        ),
      });
    }

    load();

    return () => {
      ignore = true;
    };
  }, [supabase, reloadKey]);

  const parsed = useMemo(
    () => (text.trim() ? parseMenuImport(text) : null),
    [text],
  );

  const plan = useMemo(() => {
    if (!parsed || parsed.fatal) return null;

    const isExisting = (row: ImportRow) =>
      existing?.known
        ? existing.items.has(menuItemKey(row.category, row.name))
        : false;

    const newRows = parsed.rows.filter((row) => !isExisting(row));

    const newCategories = new Set<string>();
    for (const row of newRows) {
      if (!existing?.categories.has(lower(row.category))) {
        newCategories.add(lower(row.category));
      }
    }

    // Group for the preview, in sheet order.
    const groups = new Map<string, { row: ImportRow; existing: boolean }[]>();
    for (const row of parsed.rows) {
      const list = groups.get(row.category) ?? [];
      list.push({ row, existing: isExisting(row) });
      groups.set(row.category, list);
    }

    return {
      newCount: newRows.length,
      skippedCount: parsed.rows.length - newRows.length,
      newCategoryCount: newCategories.size,
      groups: [...groups.entries()],
    };
  }, [parsed, existing]);

  function loadFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      setText(String(reader.result ?? ""));
      setResult(null);
      setImportError(null);
    };
    reader.readAsText(file);
  }

  function downloadTemplate() {
    const url = URL.createObjectURL(
      new Blob([MENU_IMPORT_TEMPLATE + "\n"], { type: "text/csv" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "menu-import-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport() {
    if (!parsed || !plan || plan.newCount === 0 || busy) return;

    setBusy(true);
    setImportError(null);
    setResult(null);

    // Every valid row is sent; the database skips anything already on the menu.
    const { data, error } = await supabase.rpc("import_menu", {
      p_items: toRpcPayload(parsed.rows),
    });

    setBusy(false);

    if (error) {
      setImportError(
        error.code === "PGRST202"
          ? "The import feature isn't installed in your database yet. Run the import_menu SQL in Supabase first."
          : error.message,
      );
      return;
    }

    setResult(data as ImportResult);
    setText("");
    setReloadKey((key) => key + 1);
  }

  const canImport = !!plan && plan.newCount > 0 && !busy && existing !== null;

  return (
    <>
      <header className="flex h-20 items-center justify-between border-b border-white/[0.07] px-6 md:px-10">
        <div>
          <p className="text-xs text-white/25">{restaurantName}</p>
          <p className="mt-1 text-sm text-white/60">Import menu</p>
        </div>

        <Link
          href="/dashboard/menu"
          className="flex items-center gap-2 text-xs text-white/40 transition hover:text-white/70"
        >
          <ArrowLeft size={14} />
          Back to menu
        </Link>
      </header>

      <div className="mx-auto max-w-4xl space-y-6 px-6 py-8 md:px-10">
        {result && (
          <div className="rounded-3xl border border-emerald-400/25 bg-emerald-400/[0.07] p-6">
            <p className="text-sm font-medium text-emerald-300">
              Import complete
            </p>
            <p className="mt-2 text-sm text-white/70">
              Added {result.new_items}{" "}
              {result.new_items === 1 ? "item" : "items"}
              {result.new_categories > 0 &&
                ` and ${result.new_categories} new ${
                  result.new_categories === 1 ? "category" : "categories"
                }`}
              .
              {result.skipped_existing > 0 &&
                ` ${result.skipped_existing} ${
                  result.skipped_existing === 1 ? "was" : "were"
                } already on your menu and left unchanged.`}
            </p>
            <Link
              href="/dashboard/menu"
              className="mt-4 inline-block text-xs text-emerald-300/90 underline underline-offset-4"
            >
              Go to your menu
            </Link>
          </div>
        )}

        <section className="rounded-3xl border border-white/[0.07] bg-white/2 p-6">
          <h1 className="text-sm font-medium">Add many items at once</h1>
          <p className="mt-1 text-xs leading-5 text-white/40">
            Copy rows from a spreadsheet (Google Sheets or Excel) and paste them
            below, or upload a CSV file. Importing only adds items, so anything
            already on your menu is left alone, and it&apos;s safe to import the
            same file again after fixing a mistake.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={downloadTemplate}
              className={buttonClass}
            >
              <Download size={14} />
              Download template
            </button>

            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className={buttonClass}
            >
              <FileUp size={14} />
              Upload CSV file
            </button>

            <input
              ref={fileInput}
              type="file"
              accept=".csv,.tsv,.txt,text/csv,text/plain"
              aria-label="Upload a CSV file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) loadFile(file);
                e.target.value = "";
              }}
            />

            {text && (
              <button
                type="button"
                onClick={() => {
                  setText("");
                  setImportError(null);
                }}
                className="h-10 px-3 text-xs text-white/35 transition hover:text-white/70"
              >
                Clear
              </button>
            )}
          </div>

          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setResult(null);
              setImportError(null);
            }}
            rows={9}
            spellCheck={false}
            aria-label="Paste your menu here"
            placeholder={
              "category\tname\tprice\tsizes\tdiet\nStarters\tFrench Fries\t200\t\tveg\nMain Course\tFried Rice\t\tHalf=250|Full=350\t"
            }
            className="mt-4 w-full rounded-2xl border border-white/10 bg-white/3 p-4 font-mono text-xs leading-5 text-white outline-none transition placeholder:text-white/20 focus:border-white/25"
          />

          <details className="mt-4 text-xs text-white/40">
            <summary className="cursor-pointer text-white/55">
              What columns can I use?
            </summary>
            <div className="mt-3 space-y-2 leading-5">
              <p>
                The first row must be the column names. Order doesn&apos;t
                matter.
              </p>
              <ul className="space-y-1.5">
                <li>
                  <b className="text-white/60">category</b> and{" "}
                  <b className="text-white/60">name</b>: required on every row.
                </li>
                <li>
                  <b className="text-white/60">price</b>: a number (₹ and commas
                  are fine). Optional when you give sizes.
                </li>
                <li>
                  <b className="text-white/60">sizes</b>: for items sold in more
                  than one portion, write the full price of each, like{" "}
                  <code className="text-white/60">Half=250|Full=350</code>.
                </li>
                <li>
                  <b className="text-white/60">diet</b>: veg, non-veg or egg.
                  Leave blank if unsure.
                </li>
                <li>
                  <b className="text-white/60">description</b>,{" "}
                  <b className="text-white/60">image_url</b> (a web link) and{" "}
                  <b className="text-white/60">available</b> (yes/no) are
                  optional.
                </li>
              </ul>
            </div>
          </details>
        </section>

        {parsed?.fatal && (
          <div
            role="alert"
            className="rounded-2xl border border-red-400/25 bg-red-400/[0.07] p-4 text-xs leading-5 text-red-200"
          >
            {parsed.fatal}
          </div>
        )}

        {parsed && plan && (
          <section className="rounded-3xl border border-white/[0.07] bg-white/2 p-6">
            <h2 className="text-sm font-medium">Preview</h2>

            <p className="mt-2 text-sm text-white/70" data-testid="summary">
              {plan.newCount} {plan.newCount === 1 ? "item" : "items"} to add
              {plan.newCategoryCount > 0 &&
                `, in ${plan.newCategoryCount} new ${
                  plan.newCategoryCount === 1 ? "category" : "categories"
                }`}
              .
              {plan.skippedCount > 0 &&
                ` ${plan.skippedCount} already on your menu will be skipped.`}
              {parsed.errors.length > 0 &&
                ` ${parsed.errors.length} ${
                  parsed.errors.length === 1 ? "row" : "rows"
                } can't be imported.`}
            </p>

            {existing && !existing.known && (
              <p className="mt-2 text-xs text-[#d7a45a]">
                I couldn&apos;t read your current menu, so I can&apos;t show
                which items already exist. Anything already there will still be
                skipped.
              </p>
            )}

            {parsed.errors.length > 0 && (
              <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/5 p-4">
                <p className="text-xs font-medium text-red-200">
                  These rows will not be imported
                </p>
                <ul className="mt-2 space-y-1 text-xs text-red-200/80">
                  {parsed.errors.map((issue, i) => (
                    <li key={i}>
                      Row {issue.line}: {issue.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {parsed.warnings.length > 0 && (
              <details
                className="mt-4 rounded-2xl border border-[#d7a45a]/20 bg-[#d7a45a]/5 p-4"
                open={parsed.warnings.length <= 5}
              >
                <summary className="cursor-pointer text-xs font-medium text-[#d7a45a]">
                  {parsed.warnings.length}{" "}
                  {parsed.warnings.length === 1 ? "thing" : "things"} to check
                </summary>
                <ul className="mt-2 space-y-1 text-xs text-[#d7a45a]/80">
                  {parsed.warnings.map((issue, i) => (
                    <li key={i}>
                      Row {issue.line}: {issue.message}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            <div className="mt-5 max-h-[55vh] space-y-5 overflow-y-auto rounded-2xl border border-white/6 p-4">
              {plan.groups.map(([category, entries]) => (
                <div key={category}>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#d7a45a]">
                    {category}
                  </p>

                  <ul className="mt-1 divide-y divide-white/5">
                    {entries.map(({ row, existing: alreadyThere }) => (
                      <li
                        key={row.line}
                        className={`flex items-start justify-between gap-4 py-2 text-sm ${
                          alreadyThere ? "opacity-40" : ""
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <DietDot diet={row.diet} />
                          <span className="wrap-break-word">{row.name}</span>
                          {!row.available && (
                            <span className="shrink-0 text-[10px] uppercase tracking-wider text-white/40">
                              Sold out
                            </span>
                          )}
                          {alreadyThere && (
                            <span className="shrink-0 text-[10px] uppercase tracking-wider text-white/50">
                              Already on menu
                            </span>
                          )}
                        </span>

                        <span className="shrink-0 text-right text-xs tabular-nums text-white/60">
                          {row.sizes.length > 0
                            ? row.sizes
                                .map((s) => `${s.name} ${formatPrice(s.total)}`)
                                .join(" · ")
                            : formatPrice(row.price)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {importError && (
              <p role="alert" className="mt-4 text-xs text-red-300/90">
                {importError}
              </p>
            )}

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={handleImport}
                disabled={!canImport}
                className="h-11 rounded-full bg-[#f5f2ea] px-6 text-sm font-medium text-[#0b0b0d] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy
                  ? "Importing…"
                  : plan.newCount === 0
                    ? "Nothing new to import"
                    : `Import ${plan.newCount} ${plan.newCount === 1 ? "item" : "items"}`}
              </button>

              {existing === null && (
                <span className="text-xs text-white/30">
                  Checking your current menu…
                </span>
              )}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
