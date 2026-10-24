"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { ArrowLeft, Camera, Check, ImagePlus, X } from "lucide-react";

import { thumbnailUrl } from "@/lib/menu-image";
import { matchPhoto, type PhotoMatch } from "@/lib/photo-matching";
import { uploadMenuPhoto } from "@/lib/photo-upload";
import { useStaffData } from "@/lib/staff-data-context";
import { createClient } from "@/lib/supabase/client";

type Dish = {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
};

type Entry = {
  key: string;
  file: File;
  previewUrl: string;
  itemId: string;
  kind: PhotoMatch["kind"];
  suggestions: string[];
  status: "ready" | "uploading" | "done" | "error";
  error?: string;
};

const CONCURRENCY = 3;

export default function MenuPhotosPage() {
  const { restaurantId, restaurantName } = useStaffData();
  const [supabase] = useState(() => createClient());

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [sales, setSales] = useState<Map<string, number>>(new Map());

  const [entries, setEntries] = useState<Entry[]>([]);
  const [running, setRunning] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [busyDishId, setBusyDishId] = useState<string | null>(null);
  const [dishError, setDishError] = useState<{
    id: string;
    message: string;
  } | null>(null);

  const fileInput = useRef<HTMLInputElement>(null);
  const previewUrls = useRef<string[]>([]);

  useEffect(() => {
    const urls = previewUrls.current;

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    if (!restaurantId) return;

    let ignore = false;

    async function load() {
      const [categoriesResult, itemsResult, salesResult] = await Promise.all([
        supabase
          .from("menu_categories")
          .select("id, name")
          .eq("restaurant_id", restaurantId)
          .order("sort_order"),
        supabase
          .from("menu_items")
          .select("id, name, image_url, category_id, sort_order")
          .eq("restaurant_id", restaurantId)
          .order("sort_order"),
        supabase.rpc("menu_item_popularity", { p_days: 90 }),
      ]);

      if (ignore) return;

      if (categoriesResult.error || itemsResult.error) {
        setLoadFailed(true);
        setLoading(false);
        return;
      }

      const names = new Map(
        (categoriesResult.data ?? []).map((c: { id: string; name: string }) => [
          c.id,
          c.name,
        ]),
      );

      setDishes(
        (itemsResult.data ?? []).map(
          (item: {
            id: string;
            name: string;
            image_url: string | null;
            category_id: string | null;
          }) => ({
            id: item.id,
            name: item.name,
            category: names.get(item.category_id ?? "") ?? "Other",
            imageUrl: item.image_url ?? "",
          }),
        ),
      );

      // Best sellers are a nice-to-have: if this fails we just don't rank.
      if (!salesResult.error) {
        setSales(
          new Map(
            (salesResult.data ?? []).map(
              (row: { menu_item_id: string; total_quantity: number }) => [
                row.menu_item_id,
                Number(row.total_quantity),
              ],
            ),
          ),
        );
      }

      setLoading(false);
    }

    load();

    return () => {
      ignore = true;
    };
  }, [supabase, restaurantId]);

  const withPhoto = dishes.filter((d) => d.imageUrl).length;
  const coverage =
    dishes.length > 0 ? Math.round((withPhoto / dishes.length) * 100) : 0;

  // Dishes that still need a photo: best sellers first, then menu order.
  const needPhoto = useMemo(() => {
    const missing = dishes.filter((d) => !d.imageUrl);
    const ranked = missing
      .filter((d) => (sales.get(d.id) ?? 0) > 0)
      .sort((a, b) => (sales.get(b.id) ?? 0) - (sales.get(a.id) ?? 0));

    return {
      ranked: ranked.slice(0, 8),
      unranked: missing.slice(0, 8),
      hasSales: ranked.length > 0,
    };
  }, [dishes, sales]);

  const dishById = useMemo(
    () => new Map(dishes.map((d) => [d.id, d])),
    [dishes],
  );

  // Two waiting photos aimed at the same dish: ask the person to choose.
  const conflicts = useMemo(() => {
    const counts = new Map<string, number>();

    for (const entry of entries) {
      if (
        entry.itemId &&
        (entry.status === "ready" || entry.status === "error")
      ) {
        counts.set(entry.itemId, (counts.get(entry.itemId) ?? 0) + 1);
      }
    }

    return new Set([...counts].filter(([, n]) => n > 1).map(([id]) => id));
  }, [entries]);

  const waiting = entries.filter(
    (e) => e.itemId && (e.status === "ready" || e.status === "error"),
  );

  function patch(key: string, changes: Partial<Entry>) {
    setEntries((current) =>
      current.map((e) => (e.key === key ? { ...e, ...changes } : e)),
    );
  }

  function addFiles(files: FileList | File[]) {
    const incoming = Array.from(files).filter((f) =>
      f.type.startsWith("image/"),
    );

    setEntries((current) => {
      const known = new Set(current.map((e) => e.key));
      const added: Entry[] = [];

      for (const file of incoming) {
        const key = `${file.name}|${file.size}|${file.lastModified}`;
        if (known.has(key)) continue;
        known.add(key);

        const match = matchPhoto(file.name, dishes);
        const previewUrl = URL.createObjectURL(file);
        previewUrls.current.push(previewUrl);

        added.push({
          key,
          file,
          previewUrl,
          itemId: match.itemId ?? "",
          kind: match.kind,
          suggestions: match.suggestions,
          status: "ready",
        });
      }

      return [...current, ...added];
    });
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer.files);
  }

  async function attach(dishId: string, file: File) {
    if (!restaurantId) throw new Error("Your restaurant isn't loaded yet.");

    const { url } = await uploadMenuPhoto(supabase, restaurantId, file);

    const { error } = await supabase
      .from("menu_items")
      .update({ image_url: url })
      .eq("id", dishId)
      .eq("restaurant_id", restaurantId);

    if (error) {
      throw new Error(
        "The photo uploaded but couldn't be attached to the dish. Please try again.",
      );
    }

    setDishes((current) =>
      current.map((d) => (d.id === dishId ? { ...d, imageUrl: url } : d)),
    );
  }

  async function uploadEntry(entry: Entry) {
    patch(entry.key, { status: "uploading", error: undefined });

    try {
      await attach(entry.itemId, entry.file);
      patch(entry.key, { status: "done" });
    } catch (e) {
      patch(entry.key, {
        status: "error",
        error: e instanceof Error ? e.message : "Couldn't upload this photo.",
      });
    }
  }

  async function uploadAll() {
    if (running || conflicts.size > 0 || waiting.length === 0) return;

    setRunning(true);

    const queue = [...waiting];
    let next = 0;

    async function worker() {
      while (next < queue.length) {
        const entry = queue[next++];
        await uploadEntry(entry);
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    setRunning(false);
  }

  async function addForDish(dishId: string, file: File) {
    setBusyDishId(dishId);
    setDishError(null);

    try {
      await attach(dishId, file);
    } catch (e) {
      setDishError({
        id: dishId,
        message: e instanceof Error ? e.message : "Couldn't upload this photo.",
      });
    } finally {
      setBusyDishId(null);
    }
  }

  function removeEntry(key: string) {
    setEntries((current) => current.filter((e) => e.key !== key));
  }

  const doneCount = entries.filter((e) => e.status === "done").length;
  const suggestedList = needPhoto.hasSales
    ? needPhoto.ranked
    : needPhoto.unranked;

  return (
    <>
      <header className="flex h-20 items-center justify-between border-b border-white/[0.07] px-6 md:px-10">
        <div>
          <p className="text-xs text-white/25">{restaurantName}</p>
          <p className="mt-1 text-sm text-white/60">Menu photos</p>
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
        {loadFailed ? (
          <p role="alert" className="text-sm text-red-300/80">
            Couldn&apos;t load your menu. Please refresh the page.
          </p>
        ) : loading ? (
          <p className="text-sm text-white/30">Loading…</p>
        ) : (
          <>
            {/* Coverage */}
            <section className="rounded-3xl border border-white/[0.07] bg-white/2 p-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h1 className="text-sm font-medium">Photo coverage</h1>
                  <p
                    className="mt-1 text-xs text-white/40"
                    data-testid="coverage"
                  >
                    {withPhoto} of {dishes.length} dishes have a photo
                  </p>
                </div>

                <p className="text-2xl font-medium tabular-nums">{coverage}%</p>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/6">
                <div
                  className="h-full rounded-full bg-[#d7a45a] transition-all"
                  style={{ width: `${coverage}%` }}
                />
              </div>

              <p className="mt-3 text-xs leading-5 text-white/35">
                You don&apos;t need a photo for every dish. A few good ones for
                your signature items make the biggest difference.
              </p>
            </section>

            {/* Best sellers */}
            {suggestedList.length > 0 && (
              <section className="rounded-3xl border border-white/7 bg-white/2 p-6">
                <h2 className="text-sm font-medium">
                  {needPhoto.hasSales
                    ? "Best sellers without a photo"
                    : "Dishes without a photo"}
                </h2>
                <p className="mt-1 text-xs text-white/35">
                  {needPhoto.hasSales
                    ? "Based on the last 90 days of orders. These are where a photo helps most."
                    : "Once you have orders, your best sellers will be listed here first."}
                </p>

                <ul className="mt-4 divide-y divide-white/6">
                  {suggestedList.map((dish) => (
                    <li
                      key={dish.id}
                      className="flex items-center justify-between gap-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm">{dish.name}</p>
                        <p className="mt-0.5 text-[11px] text-white/35">
                          {dish.category}
                          {needPhoto.hasSales &&
                            ` · ${sales.get(dish.id)} ordered`}
                        </p>
                        {dishError?.id === dish.id && (
                          <p
                            role="alert"
                            className="mt-1 text-[11px] text-red-300/80"
                          >
                            {dishError.message}
                          </p>
                        )}
                      </div>

                      <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs text-white/70 transition hover:bg-white/5">
                        <Camera size={14} />
                        {busyDishId === dish.id ? "Uploading…" : "Add photo"}
                        <input
                          type="file"
                          accept="image/*"
                          aria-label={`Add a photo for ${dish.name}`}
                          disabled={busyDishId !== null}
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            if (file) addForDish(dish.id, file);
                          }}
                        />
                      </label>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Bulk upload */}
            <section className="rounded-3xl border border-white/[0.07] bg-white/2 p-6">
              <h2 className="text-sm font-medium">
                Upload many photos at once
              </h2>
              <p className="mt-1 text-xs leading-5 text-white/40">
                Name each photo after its dish, like{" "}
                <code className="text-white/60">margherita-pizza.jpg</code>, and
                we&apos;ll match them up. Anything we can&apos;t match, you can
                assign by hand before uploading.
              </p>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className={`mt-4 flex flex-col items-center rounded-2xl border border-dashed px-6 py-8 text-center transition ${
                  dragging
                    ? "border-[#d7a45a]/60 bg-[#d7a45a]/5"
                    : "border-white/15"
                }`}
              >
                <ImagePlus size={22} className="text-white/30" />
                <p className="mt-3 text-sm text-white/60">Drop photos here</p>

                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="mt-3 rounded-full border border-white/10 px-5 py-2 text-xs text-white/70 transition hover:bg-white/5"
                >
                  Choose photos
                </button>

                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  multiple
                  aria-label="Choose photos"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </div>

              {entries.length > 0 && (
                <>
                  <ul className="mt-5 space-y-3" aria-label="Photos to upload">
                    {entries.map((entry) => {
                      const locked =
                        entry.status === "uploading" || entry.status === "done";
                      const dish = dishById.get(entry.itemId);
                      const conflict =
                        !!entry.itemId &&
                        conflicts.has(entry.itemId) &&
                        !locked;

                      return (
                        <li
                          key={entry.key}
                          data-testid="photo-row"
                          className="flex gap-3 rounded-2xl border border-white/[0.07] p-3"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element -- a local preview of the file the person just picked */}
                          <img
                            src={entry.previewUrl}
                            alt=""
                            className="h-16 w-16 shrink-0 rounded-xl object-cover"
                          />

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs text-white/45">
                              {entry.file.name}
                            </p>

                            <select
                              value={entry.itemId}
                              disabled={locked}
                              onChange={(e) =>
                                patch(entry.key, {
                                  itemId: e.target.value,
                                  status: "ready",
                                  error: undefined,
                                })
                              }
                              aria-label={`Dish for ${entry.file.name}`}
                              className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#111114] px-3 py-2 text-xs text-white outline-none focus:border-white/25 disabled:opacity-60"
                            >
                              <option value="">Choose a dish…</option>
                              {dishes.map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.name} · {d.category}
                                </option>
                              ))}
                            </select>

                            {!entry.itemId && entry.suggestions.length > 0 && (
                              <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-white/40">
                                {entry.kind === "ambiguous"
                                  ? "More than one dish has this name:"
                                  : "Did you mean"}
                                {entry.suggestions.map((id) => (
                                  <button
                                    key={id}
                                    type="button"
                                    onClick={() =>
                                      patch(entry.key, { itemId: id })
                                    }
                                    className="rounded-full border border-white/10 px-2.5 py-0.5 text-white/70 transition hover:bg-white/5"
                                  >
                                    {dishById.get(id)?.name} ·{" "}
                                    {dishById.get(id)?.category}
                                  </button>
                                ))}
                              </p>
                            )}

                            {dish?.imageUrl && !locked && !conflict && (
                              <p className="mt-1.5 text-[11px] text-[#d7a45a]/80">
                                This dish already has a photo. Uploading
                                replaces it.
                              </p>
                            )}

                            {conflict && (
                              <p
                                role="alert"
                                className="mt-1.5 text-[11px] text-red-300/80"
                              >
                                Another photo is also set for {dish?.name}.
                                Choose one dish per photo.
                              </p>
                            )}

                            {entry.status === "error" && (
                              <p
                                role="alert"
                                className="mt-1.5 text-[11px] text-red-300/80"
                              >
                                {entry.error}
                              </p>
                            )}
                          </div>

                          <div className="flex w-20 shrink-0 flex-col items-end justify-between">
                            {entry.status === "done" ? (
                              <span className="flex items-center gap-1 text-[11px] text-emerald-300">
                                <Check size={13} /> Added
                              </span>
                            ) : entry.status === "uploading" ? (
                              <span className="text-[11px] text-white/45">
                                Uploading…
                              </span>
                            ) : (
                              <button
                                type="button"
                                aria-label={`Remove ${entry.file.name}`}
                                onClick={() => removeEntry(entry.key)}
                                className="rounded-full p-1.5 text-white/35 transition hover:bg-white/5 hover:text-white"
                              >
                                <X size={14} />
                              </button>
                            )}

                            {entry.itemId &&
                              dish?.imageUrl &&
                              entry.status === "done" && (
                                <Image
                                  src={thumbnailUrl(dish.imageUrl)}
                                  alt=""
                                  width={28}
                                  height={28}
                                  unoptimized
                                  className="h-7 w-7 rounded-md object-cover"
                                />
                              )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={uploadAll}
                      disabled={
                        running || waiting.length === 0 || conflicts.size > 0
                      }
                      className="h-11 rounded-full bg-[#f5f2ea] px-6 text-sm font-medium text-[#0b0b0d] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {running
                        ? "Uploading…"
                        : waiting.length === 0
                          ? "Choose a dish for each photo"
                          : `Upload ${waiting.length} ${waiting.length === 1 ? "photo" : "photos"}`}
                    </button>

                    {entries.some((e) => !e.itemId && e.status === "ready") && (
                      <span className="text-xs text-white/40">
                        {
                          entries.filter(
                            (e) => !e.itemId && e.status === "ready",
                          ).length
                        }{" "}
                        still need a dish and will be skipped.
                      </span>
                    )}

                    {doneCount > 0 && !running && (
                      <span className="text-xs text-emerald-300/80">
                        {doneCount} {doneCount === 1 ? "photo" : "photos"}{" "}
                        added.
                      </span>
                    )}
                  </div>
                </>
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}
