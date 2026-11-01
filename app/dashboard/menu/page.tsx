"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  ChevronDown,
  ImageIcon,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { PageHeader, pageShell } from "@/components/dashboard/page-header";
import DietDot from "@/components/menu/diet-dot";
import PhotoField from "@/components/menu/photo-field";
import { formatPrice } from "@/lib/format-price";
import { thumbnailUrl } from "@/lib/menu-image";
import type { Diet } from "@/lib/menu-import";
import { useStaffData } from "@/lib/staff-data-context";

import { createClient } from "@/lib/supabase/client";

type Category = { id: string; name: string; sort_order: number };

type SizeRow = { id?: string; name: string; price: number };
type AddonRow = { id?: string; name: string; price: number };

type MenuItemRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  available: boolean;
  diet: Diet | null;
  category_id: string | null;
  menu_item_sizes: SizeRow[];
  menu_item_addons: AddonRow[];
};

type ItemForm = {
  name: string;
  description: string;
  price: string;
  imageUrl: string;
  categoryId: string;
  available: boolean;
  diet: Diet | "";
  sizes: SizeRow[];
  addons: AddonRow[];
};

const emptyForm: ItemForm = {
  name: "",
  description: "",
  price: "",
  imageUrl: "",
  categoryId: "",
  available: true,
  diet: "",
  sizes: [],
  addons: [],
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/2.5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/25";

const softButton =
  "flex h-11 items-center justify-center gap-2 rounded-full border border-white/10 px-5 text-sm text-white/60 transition hover:bg-white/5 hover:text-white cursor-pointer";

export default function DashboardMenuPage() {
  const { restaurantSlug } = useStaffData();
  const [supabase] = useState(() => createClient());
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItemRow[]>([]);

  const [query, setQuery] = useState("");
  const [soldOutOnly, setSoldOutOnly] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [confirmingDeleteCategoryId, setConfirmingDeleteCategoryId] = useState<
    string | null
  >(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [form, setForm] = useState<ItemForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmingDeleteItemId, setConfirmingDeleteItemId] = useState<
    string | null
  >(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Auto-dismiss the error banner after a few seconds rather than
  // leaving it stuck on screen.
  useEffect(() => {
    if (!saveError) return;
    const timer = setTimeout(() => setSaveError(null), 5000);
    return () => clearTimeout(timer);
  }, [saveError]);

  // Escape closes the "More" menu and the item editor.
  useEffect(() => {
    if (!editorOpen && !moreOpen) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setEditorOpen(false);
        setMoreOpen(false);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editorOpen, moreOpen]);

  async function loadData() {
    const { data: rid } = await supabase.rpc("current_restaurant_id");

    if (!rid) {
      setLoading(false);
      return;
    }

    setRestaurantId(rid);

    const [{ data: cats }, { data: menuItems }] = await Promise.all([
      supabase
        .from("menu_categories")
        .select("id, name, sort_order")
        .eq("restaurant_id", rid)
        .order("sort_order"),
      supabase
        .from("menu_items")
        .select(
          "id, name, description, price, image_url, available, diet, category_id, sort_order, menu_item_sizes(id, name, price), menu_item_addons(id, name, price)",
        )
        .eq("restaurant_id", rid)
        .order("sort_order"),
    ]);

    setCategories(cats ?? []);
    setItems((menuItems ?? []) as MenuItemRow[]);
    setLoading(false);
  }

  useEffect(() => {
    let ignore = false;

    async function initialLoad() {
      const { data: rid } = await supabase.rpc("current_restaurant_id");

      if (!rid) {
        if (!ignore) setLoading(false);
        return;
      }

      if (ignore) return;
      setRestaurantId(rid);

      const [{ data: cats }, { data: menuItems }] = await Promise.all([
        supabase
          .from("menu_categories")
          .select("id, name, sort_order")
          .eq("restaurant_id", rid)
          .order("sort_order"),
        supabase
          .from("menu_items")
          .select(
            "id, name, description, price, image_url, available, diet, category_id, sort_order, menu_item_sizes(id, name, price), menu_item_addons(id, name, price)",
          )
          .eq("restaurant_id", rid)
          .order("sort_order"),
      ]);

      if (ignore) return;

      setCategories(cats ?? []);
      setItems((menuItems ?? []) as MenuItemRow[]);
      setLoading(false);
    }

    initialLoad();

    return () => {
      ignore = true;
    };
  }, [supabase]);

  async function handleAddCategory() {
    if (!newCategoryName.trim() || !restaurantId) return;

    const { error } = await supabase.from("menu_categories").insert({
      restaurant_id: restaurantId,
      name: newCategoryName.trim(),
      sort_order: categories.length + 1,
    });

    if (error) {
      setSaveError("Could not add category. Please try again.");
      return;
    }

    setNewCategoryName("");
    loadData();
  }

  async function handleRenameCategory(id: string) {
    if (!editingCategoryName.trim()) {
      setEditingCategoryId(null);
      return;
    }

    const { error } = await supabase
      .from("menu_categories")
      .update({ name: editingCategoryName.trim() })
      .eq("id", id);

    if (error) {
      setSaveError("Could not rename category. Please try again.");
      return;
    }

    setEditingCategoryId(null);
    loadData();
  }

  async function handleDeleteCategory(id: string) {
    const { error } = await supabase
      .from("menu_categories")
      .delete()
      .eq("id", id);

    setConfirmingDeleteCategoryId(null);

    if (error) {
      setSaveError(
        "Could not delete category. Move or delete its items first, then try again.",
      );
      return;
    }

    loadData();
  }

  function openNewItemEditor() {
    setEditingItemId(null);
    setForm({ ...emptyForm, categoryId: categories[0]?.id ?? "" });
    setSaveError(null);
    setEditorOpen(true);
  }

  function openEditItemEditor(item: MenuItemRow) {
    setEditingItemId(item.id);
    setForm({
      name: item.name,
      description: item.description ?? "",
      price: item.price.toString(),
      imageUrl: item.image_url ?? "",
      categoryId: item.category_id ?? "",
      available: item.available,
      diet: item.diet ?? "",
      sizes: item.menu_item_sizes.map((s) => ({
        id: s.id,
        name: s.name,
        price: s.price,
      })),
      addons: item.menu_item_addons.map((a) => ({
        id: a.id,
        name: a.name,
        price: a.price,
      })),
    });
    setSaveError(null);
    setEditorOpen(true);
  }

  async function saveItem() {
    if (!restaurantId) return;

    if (!form.name.trim()) {
      setSaveError("Please enter the item name.");
      return;
    }

    if (!form.categoryId) {
      setSaveError("Please choose a category.");
      return;
    }

    const parsedPrice = Number(form.price);
    if (
      form.price.trim() === "" ||
      !Number.isFinite(parsedPrice) ||
      parsedPrice < 0
    ) {
      setSaveError("Please enter a valid price (0 or more).");
      return;
    }

    const payload = {
      restaurant_id: restaurantId,
      category_id: form.categoryId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: parsedPrice,
      image_url: form.imageUrl.trim() || null,
      available: form.available,
      diet: form.diet || null,
    };

    let itemId = editingItemId;

    if (itemId) {
      const { error } = await supabase
        .from("menu_items")
        .update(payload)
        .eq("id", itemId);

      if (error) {
        setSaveError("Could not save item. Please try again.");
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("menu_items")
        .insert({ ...payload, sort_order: items.length + 1 })
        .select("id")
        .single();

      if (error || !data) {
        setSaveError("Could not save item. Please try again.");
        return;
      }

      itemId = data.id;
    }

    if (!itemId) return;

    // Simplest reliable way to sync a small child list: clear and
    // re-insert, rather than diffing. Historical orders snapshot their
    // own size/addon name+price at order time, so this never touches
    // anything already billed.
    const { error: clearSizesError } = await supabase
      .from("menu_item_sizes")
      .delete()
      .eq("menu_item_id", itemId);

    if (clearSizesError) {
      setSaveError("Item saved, but sizes could not be updated.");
      return;
    }

    const cleanSizes = form.sizes.filter((s) => s.name.trim());
    if (cleanSizes.length > 0) {
      const { error: sizesError } = await supabase
        .from("menu_item_sizes")
        .insert(
          cleanSizes.map((s, i) => ({
            menu_item_id: itemId,
            name: s.name.trim(),
            price: s.price,
            sort_order: i + 1,
          })),
        );

      if (sizesError) {
        setSaveError("Item saved, but sizes could not be updated.");
        return;
      }
    }

    const { error: clearAddonsError } = await supabase
      .from("menu_item_addons")
      .delete()
      .eq("menu_item_id", itemId);

    if (clearAddonsError) {
      setSaveError("Item saved, but add-ons could not be updated.");
      return;
    }

    const cleanAddons = form.addons.filter((a) => a.name.trim());
    if (cleanAddons.length > 0) {
      const { error: addonsError } = await supabase
        .from("menu_item_addons")
        .insert(
          cleanAddons.map((a, i) => ({
            menu_item_id: itemId,
            name: a.name.trim(),
            price: a.price,
            sort_order: i + 1,
          })),
        );

      if (addonsError) {
        setSaveError("Item saved, but add-ons could not be updated.");
        return;
      }
    }

    setEditorOpen(false);
    loadData();
  }

  // Ignores a second tap while a save is running.
  async function handleSaveItem() {
    if (saving) return;
    setSaving(true);
    try {
      await saveItem();
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteItem(id: string) {
    const { error } = await supabase.from("menu_items").delete().eq("id", id);

    setConfirmingDeleteItemId(null);

    if (error) {
      setSaveError("Could not delete item. Please try again.");
      return;
    }

    loadData();
  }

  async function handleToggleAvailability(item: MenuItemRow) {
    // Show the change straight away; undo it if the save fails.
    setItems((current) =>
      current.map((i) =>
        i.id === item.id ? { ...i, available: !item.available } : i,
      ),
    );

    const { error } = await supabase
      .from("menu_items")
      .update({ available: !item.available })
      .eq("id", item.id);

    if (error) {
      setSaveError("Could not update availability. Please try again.");
      loadData();
    }
  }

  function updateSizeRow(index: number, patch: Partial<SizeRow>) {
    setForm((current) => ({
      ...current,
      sizes: current.sizes.map((s, i) =>
        i === index ? { ...s, ...patch } : s,
      ),
    }));
  }

  function updateAddonRow(index: number, patch: Partial<AddonRow>) {
    setForm((current) => ({
      ...current,
      addons: current.addons.map((a, i) =>
        i === index ? { ...a, ...patch } : a,
      ),
    }));
  }

  function scrollToSection(id: string) {
    document
      .getElementById(`cat-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ----- what to show -----
  const q = query.trim().toLowerCase();
  const filtering = q !== "" || soldOutOnly;

  function matches(item: MenuItemRow) {
    if (soldOutOnly && item.available) return false;
    if (!q) return true;
    return item.name.toLowerCase().includes(q);
  }

  const uncategorized = items.filter((item) => !item.category_id);

  const sections = [
    ...categories.map((category) => ({
      id: category.id,
      name: category.name,
      all: items.filter((item) => item.category_id === category.id),
    })),
    ...(uncategorized.length > 0
      ? [{ id: "uncategorized", name: "Uncategorized", all: uncategorized }]
      : []),
  ].map((section) => ({ ...section, shown: section.all.filter(matches) }));

  const visibleSections = filtering
    ? sections.filter((section) => section.shown.length > 0)
    : sections;

  const soldOutCount = items.filter((item) => !item.available).length;
  const noCategories = !loading && categories.length === 0;
  const noItems = !loading && categories.length > 0 && items.length === 0;

  function renderCard(item: MenuItemRow) {
    return (
      <MenuItemCard
        key={item.id}
        item={item}
        confirmingDelete={confirmingDeleteItemId === item.id}
        onToggleAvailability={() => handleToggleAvailability(item)}
        onEdit={() => openEditItemEditor(item)}
        onRequestDelete={() => setConfirmingDeleteItemId(item.id)}
        onCancelDelete={() => setConfirmingDeleteItemId(null)}
        onConfirmDelete={() => handleDeleteItem(item.id)}
      />
    );
  }

  return (
    <div className={pageShell("wide")}>
      <PageHeader
        title="Menu"
        subtitle={
          loading || items.length === 0
            ? "Add items, set prices, and mark things sold out. Changes show on the customer menu instantly."
            : `${items.length} ${items.length === 1 ? "item" : "items"}${
                soldOutCount > 0 ? ` · ${soldOutCount} sold out` : ""
              }. Changes show on the customer menu instantly.`
        }
        actions={
          <>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMoreOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={moreOpen}
                className={softButton}
              >
                <MoreHorizontal size={16} />
                More
              </button>

              {moreOpen && (
                <>
                  <button
                    type="button"
                    aria-label="Close menu"
                    onClick={() => setMoreOpen(false)}
                    className="fixed inset-0 z-30 cursor-default"
                  />
                  <div
                    role="menu"
                    className="absolute right-0 top-13 z-40 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#151519] p-1.5 shadow-2xl"
                  >
                    <Link
                      role="menuitem"
                      href="/dashboard/menu/photos"
                      className="block rounded-xl px-3 py-2.5 text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
                    >
                      Add photos
                    </Link>
                    <Link
                      role="menuitem"
                      href="/dashboard/menu/import"
                      className="block rounded-xl px-3 py-2.5 text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
                    >
                      Import a menu
                    </Link>
                    {restaurantSlug && (
                      <Link
                        role="menuitem"
                        href={`/menu/${restaurantSlug}`}
                        target="_blank"
                        className="block rounded-xl px-3 py-2.5 text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
                      >
                        View public menu
                      </Link>
                    )}
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={openNewItemEditor}
              disabled={categories.length === 0}
              className="flex h-11 shrink-0 items-center gap-2 rounded-full bg-[#f5f2ea] px-5 text-sm font-medium text-[#0b0b0d] transition hover:scale-[1.02] disabled:cursor-default disabled:opacity-40 disabled:hover:scale-100 cursor-pointer"
            >
              <Plus size={15} />
              Add item
            </button>
          </>
        }
      />

      {saveError && !editorOpen && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-400/20 bg-red-950/40 px-4 py-3 text-sm text-red-200"
        >
          {saveError}
        </div>
      )}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <div
              key={n}
              className="h-32 animate-pulse rounded-2xl border border-white/[0.07] bg-white/2.5"
            />
          ))}
        </div>
      ) : noCategories ? (
        <section className="rounded-3xl border border-white/8 bg-white/2.5 p-6 md:p-8">
          <h2 className="text-lg font-medium">Set up your menu</h2>
          <p className="mt-2 max-w-xl text-sm text-white/45">
            Start with a category, like Coffee or Starters. Then add your items
            one by one, or import a whole menu from a spreadsheet.
          </p>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddCategory();
              }}
              placeholder="First category, e.g. Coffee"
              aria-label="Category name"
              className={`${inputClass} sm:max-w-xs`}
            />
            <button
              type="button"
              onClick={handleAddCategory}
              disabled={!newCategoryName.trim()}
              className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#f5f2ea] px-6 text-sm font-medium text-[#0b0b0d] transition hover:scale-[1.02] disabled:cursor-default disabled:opacity-40 disabled:hover:scale-100 cursor-pointer"
            >
              <Plus size={15} />
              Add category
            </button>
            <Link
              href="/dashboard/menu/import"
              className={`${softButton} h-12`}
            >
              Import a menu
            </Link>
          </div>
        </section>
      ) : (
        <>
          {/* Search, filter and category chips stay in view while scrolling */}
          <div className="sticky top-0 z-20 -mx-5 border-b border-white/[0.07] bg-[#0b0b0d]/95 px-5 pb-3 pt-2 backdrop-blur md:-mx-10 md:px-10">
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search the menu"
                  aria-label="Search the menu"
                  className="h-11 w-full rounded-full border border-white/10 bg-white/2.5 pl-10 pr-10 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/25"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-white/40 hover:bg-white/5 hover:text-white cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSoldOutOnly((on) => !on)}
                aria-pressed={soldOutOnly}
                className={`h-11 shrink-0 rounded-full border px-4 text-sm transition cursor-pointer ${
                  soldOutOnly
                    ? "border-[#d7a45a] bg-[#d7a45a]/15 text-[#d7a45a]"
                    : "border-white/10 text-white/55 hover:bg-white/5"
                }`}
              >
                Sold out{soldOutCount > 0 ? ` (${soldOutCount})` : ""}
              </button>
            </div>

            <div className="mt-2.5 flex items-center gap-2">
              <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-0.5 scrollbar-none [&::-webkit-scrollbar]:hidden">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => scrollToSection(section.id)}
                    className="shrink-0 rounded-full border border-white/10 px-3.5 py-1.5 text-xs text-white/60 transition hover:bg-white/5 hover:text-white cursor-pointer"
                  >
                    {section.name}
                    <span className="ml-1.5 text-white/30">
                      {section.all.length}
                    </span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setManageOpen((open) => !open)}
                aria-expanded={manageOpen}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition cursor-pointer ${
                  manageOpen
                    ? "bg-white/10 text-white"
                    : "text-white/45 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Pencil size={12} />
                Categories
              </button>
            </div>
          </div>

          {/* Manage categories */}
          {manageOpen && (
            <section className="mt-5 rounded-3xl border border-white/8 bg-white/2.5 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Manage categories</p>
                <button
                  type="button"
                  onClick={() => setManageOpen(false)}
                  aria-label="Close"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white/40 hover:bg-white/5 hover:text-white cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="mt-3 flex gap-2">
                <input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddCategory();
                  }}
                  placeholder="New category name"
                  aria-label="New category name"
                  className="h-11 min-w-0 flex-1 rounded-full border border-white/10 bg-white/2.5 px-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/25"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  disabled={!newCategoryName.trim()}
                  className="flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-white/10 px-4 text-sm text-white/70 transition hover:bg-white/5 cursor-pointer disabled:cursor-default disabled:opacity-40"
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>

              <ul className="mt-3 divide-y divide-white/6">
                {categories.map((category) => {
                  const count = items.filter(
                    (item) => item.category_id === category.id,
                  ).length;

                  return (
                    <li
                      key={category.id}
                      className="flex items-center gap-3 py-2.5"
                    >
                      {editingCategoryId === category.id ? (
                        <input
                          autoFocus
                          value={editingCategoryName}
                          onChange={(e) =>
                            setEditingCategoryName(e.target.value)
                          }
                          onBlur={() => handleRenameCategory(category.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter")
                              handleRenameCategory(category.id);
                          }}
                          aria-label="Category name"
                          className="min-w-0 flex-1 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-white outline-none"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategoryId(category.id);
                            setEditingCategoryName(category.name);
                          }}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm text-white/80 hover:text-white cursor-pointer"
                        >
                          <span className="truncate">{category.name}</span>
                          <Pencil
                            size={11}
                            className="shrink-0 text-white/25"
                          />
                        </button>
                      )}

                      <span className="shrink-0 text-xs text-white/30">
                        {count} {count === 1 ? "item" : "items"}
                      </span>

                      {confirmingDeleteCategoryId === category.id ? (
                        <div className="flex shrink-0 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setConfirmingDeleteCategoryId(null)}
                            className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/55 hover:bg-white/5 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(category.id)}
                            className="rounded-full border border-red-400/30 bg-red-400/10 px-3 py-1.5 text-xs text-red-300 hover:bg-red-400/15 cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmingDeleteCategoryId(category.id)
                          }
                          aria-label={`Delete ${category.name}`}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/30 hover:bg-white/5 hover:text-red-300 cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Items */}
          {noItems ? (
            <section className="mt-6 rounded-3xl border border-dashed border-white/12 p-8 text-center">
              <p className="text-base font-medium">No items yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-white/40">
                Add your first item, or import a whole menu from a spreadsheet.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={openNewItemEditor}
                  className="flex h-11 items-center gap-2 rounded-full bg-[#f5f2ea] px-5 text-sm font-medium text-[#0b0b0d] transition hover:scale-[1.02] cursor-pointer"
                >
                  <Plus size={15} />
                  Add item
                </button>
                <Link href="/dashboard/menu/import" className={softButton}>
                  Import a menu
                </Link>
              </div>
            </section>
          ) : filtering && visibleSections.length === 0 ? (
            <section className="mt-6 rounded-3xl border border-dashed border-white/12 p-8 text-center">
              <p className="text-base font-medium">Nothing matches</p>
              <p className="mt-1 text-sm text-white/40">
                Try a different word, or clear the filters.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setSoldOutOnly(false);
                }}
                className={`${softButton} mx-auto mt-4`}
              >
                Clear filters
              </button>
            </section>
          ) : (
            <div className="mt-6 space-y-9">
              {visibleSections.map((section) => (
                <section
                  key={section.id}
                  id={`cat-${section.id}`}
                  className="scroll-mt-48 lg:scroll-mt-32"
                >
                  <div className="mb-3 flex items-baseline gap-2">
                    <h2 className="text-base font-medium text-white/85">
                      {section.name}
                    </h2>
                    <span className="text-xs text-white/30">
                      {filtering
                        ? `${section.shown.length} of ${section.all.length}`
                        : section.all.length}
                    </span>
                  </div>

                  {section.shown.length === 0 ? (
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-white/10 px-4 py-3">
                      <p className="text-sm text-white/30">
                        Nothing in this category yet.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          openNewItemEditor();
                          setForm((current) => ({
                            ...current,
                            categoryId: section.id,
                          }));
                        }}
                        className="shrink-0 text-xs text-white/55 underline-offset-4 hover:text-white hover:underline cursor-pointer"
                      >
                        Add an item
                      </button>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {section.shown.map(renderCard)}
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
        </>
      )}

      {/* Item editor */}
      {editorOpen && (
        <div className="fixed inset-0 z-100 flex items-end justify-center sm:items-center">
          <button
            aria-label="Close editor"
            onClick={() => setEditorOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-pointer"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label={editingItemId ? "Edit item" : "Add item"}
            className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-4xl border border-white/10 bg-[#151519] sm:rounded-4xl"
          >
            <div className="flex shrink-0 items-center justify-between px-6 pb-3 pt-6 md:px-8 md:pt-8">
              <h2 className="text-xl font-medium text-white">
                {editingItemId ? "Edit item" : "Add item"}
              </h2>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full text-white/40 hover:bg-white/5 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4 md:px-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Item name" className="sm:col-span-2">
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Cappuccino"
                    className={inputClass}
                  />
                </Field>

                <Field
                  label="Description"
                  hint="Optional. Shown to guests under the name."
                  className="sm:col-span-2"
                >
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    rows={2}
                    className={inputClass}
                  />
                </Field>

                <Field label="Price">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-white/40">
                      ₹
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={form.price}
                      onChange={(e) =>
                        setForm({ ...form, price: e.target.value })
                      }
                      placeholder="0"
                      className={`${inputClass} pl-8`}
                    />
                  </div>
                </Field>

                <Field label="Category">
                  <div className="relative">
                    <select
                      value={form.categoryId}
                      onChange={(e) =>
                        setForm({ ...form, categoryId: e.target.value })
                      }
                      className={`${inputClass} appearance-none cursor-pointer`}
                    >
                      <option value="" disabled>
                        Choose a category
                      </option>
                      {categories.map((category) => (
                        <option
                          key={category.id}
                          value={category.id}
                          className="bg-[#151519]"
                        >
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={14}
                      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/30"
                    />
                  </div>
                </Field>

                <div className="sm:col-span-2">
                  <PhotoField
                    value={form.imageUrl}
                    onChange={(url) => setForm({ ...form, imageUrl: url })}
                    restaurantId={restaurantId}
                  />
                </div>

                <Field label="Veg / non-veg" className="sm:col-span-2">
                  <div
                    role="radiogroup"
                    aria-label="Veg or non-veg"
                    className="flex flex-wrap gap-2"
                  >
                    {(
                      [
                        { value: "", label: "Not set" },
                        { value: "veg", label: "Veg" },
                        { value: "non_veg", label: "Non-veg" },
                        { value: "egg", label: "Egg" },
                      ] as const
                    ).map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={form.diet === option.value}
                        onClick={() => setForm({ ...form, diet: option.value })}
                        className={`flex h-10 items-center gap-2 rounded-full border px-4 text-xs transition cursor-pointer ${
                          form.diet === option.value
                            ? "border-[#f5f2ea] bg-[#f5f2ea] font-medium text-[#0b0b0d]"
                            : "border-white/10 text-white/55 hover:bg-white/5"
                        }`}
                      >
                        {option.value !== "" && (
                          <DietDot diet={option.value} className="bg-white" />
                        )}
                        {option.label}
                      </button>
                    ))}
                  </div>
                </Field>

                <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 px-4 py-3 sm:col-span-2">
                  <div>
                    <p className="text-sm text-white/80">Available to order</p>
                    <p className="text-xs text-white/35">
                      Turn off to show it as sold out.
                    </p>
                  </div>
                  <Switch
                    checked={form.available}
                    onChange={(on) => setForm({ ...form, available: on })}
                    label="Available to order"
                  />
                </div>
              </div>

              {/* Sizes */}
              <div className="mt-7">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/70">Sizes</p>
                    <p className="text-xs text-white/30">
                      Optional. The price is added to the base price.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        sizes: [...form.sizes, { name: "", price: 0 }],
                      })
                    }
                    className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs text-white/50 hover:bg-white/5 hover:text-white cursor-pointer"
                  >
                    <Plus size={12} />
                    Add size
                  </button>
                </div>

                <div className="mt-2 space-y-2">
                  {form.sizes.map((size, index) => (
                    <div key={size.id ?? index} className="flex gap-2">
                      <input
                        value={size.name}
                        onChange={(e) =>
                          updateSizeRow(index, { name: e.target.value })
                        }
                        placeholder="Size name, e.g. Large"
                        aria-label="Size name"
                        className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/2.5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/25"
                      />
                      <input
                        type="number"
                        inputMode="decimal"
                        value={size.price}
                        onChange={(e) =>
                          updateSizeRow(index, {
                            price: Number(e.target.value) || 0,
                          })
                        }
                        placeholder="+₹"
                        aria-label="Extra price"
                        className="w-24 rounded-xl border border-white/10 bg-white/2.5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/25"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            sizes: form.sizes.filter((_, i) => i !== index),
                          })
                        }
                        aria-label="Remove size"
                        className="flex h-11 w-9 shrink-0 items-center justify-center rounded-full text-white/30 hover:bg-white/5 hover:text-red-300 cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add-ons */}
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/70">Add-ons</p>
                    <p className="text-xs text-white/30">
                      Optional extras guests can tick, like an extra shot.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        addons: [...form.addons, { name: "", price: 0 }],
                      })
                    }
                    className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs text-white/50 hover:bg-white/5 hover:text-white cursor-pointer"
                  >
                    <Plus size={12} />
                    Add add-on
                  </button>
                </div>

                <div className="mt-2 space-y-2">
                  {form.addons.map((addon, index) => (
                    <div key={addon.id ?? index} className="flex gap-2">
                      <input
                        value={addon.name}
                        onChange={(e) =>
                          updateAddonRow(index, { name: e.target.value })
                        }
                        placeholder="Add-on name, e.g. Extra shot"
                        aria-label="Add-on name"
                        className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/2.5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/25"
                      />
                      <input
                        type="number"
                        inputMode="decimal"
                        value={addon.price}
                        onChange={(e) =>
                          updateAddonRow(index, {
                            price: Number(e.target.value) || 0,
                          })
                        }
                        placeholder="+₹"
                        aria-label="Extra price"
                        className="w-24 rounded-xl border border-white/10 bg-white/2.5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/25"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            addons: form.addons.filter((_, i) => i !== index),
                          })
                        }
                        aria-label="Remove add-on"
                        className="flex h-11 w-9 shrink-0 items-center justify-center rounded-full text-white/30 hover:bg-white/5 hover:text-red-300 cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Save bar: always in view, even with the phone keyboard open */}
            <div className="shrink-0 border-t border-white/[0.07] bg-[#151519] px-6 py-4 md:px-8">
              {saveError && (
                <p role="alert" className="mb-3 text-sm text-red-300">
                  {saveError}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="h-12 rounded-full border border-white/10 px-6 text-sm text-white/60 transition hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveItem}
                  disabled={saving}
                  className="h-12 flex-1 rounded-full bg-[#f5f2ea] text-sm font-medium text-[#0b0b0d] transition hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:cursor-default disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingItemId
                      ? "Save changes"
                      : "Add item"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs text-white/45">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-white/25">{hint}</p>}
    </div>
  );
}

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (on: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${
        checked ? "bg-[#d7a45a]" : "bg-white/15"
      }`}
    >
      <span
        className={`absolute left-1 top-1 h-5 w-5 rounded-full transition-transform ${
          checked ? "translate-x-5 bg-[#0b0b0d]" : "translate-x-0 bg-white/60"
        }`}
      />
    </button>
  );
}

function MenuItemCard({
  item,
  confirmingDelete,
  onToggleAvailability,
  onEdit,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  item: MenuItemRow;
  confirmingDelete: boolean;
  onToggleAvailability: () => void;
  onEdit: () => void;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}) {
  const [photoFailed, setPhotoFailed] = useState(false);

  return (
    <div className="flex flex-col rounded-2xl border border-white/[0.07] bg-white/2.5 p-4">
      <div
        className={`flex min-w-0 flex-1 items-start gap-3 ${
          item.available ? "" : "opacity-50"
        }`}
      >
        {item.image_url && !photoFailed ? (
          <Image
            src={thumbnailUrl(item.image_url)}
            alt=""
            width={56}
            height={56}
            unoptimized
            onError={() => setPhotoFailed(true)}
            className="h-14 w-14 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/4 text-white/20">
            <ImageIcon size={18} />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-medium text-white/85">
            <DietDot diet={item.diet} />
            <span className="truncate">{item.name}</span>
          </p>
          <p className="mt-1 text-sm text-white/55">
            {item.menu_item_sizes.length > 0
              ? [...item.menu_item_sizes]
                  .sort((a, b) => a.price - b.price)
                  .map(
                    (size) =>
                      `${size.name} ${formatPrice(item.price + size.price)}`,
                  )
                  .join(" · ")
              : formatPrice(item.price)}
          </p>
          {item.description && (
            <p className="mt-1 truncate text-xs text-white/30">
              {item.description}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/6 pt-3">
        {confirmingDelete ? (
          <>
            <p className="text-xs text-white/50">Delete this item?</p>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={onCancelDelete}
                className="rounded-full border border-white/10 px-3.5 py-2 text-xs text-white/55 transition hover:bg-white/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirmDelete}
                className="rounded-full border border-red-400/30 bg-red-400/10 px-3.5 py-2 text-xs text-red-300 transition hover:bg-red-400/15 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2.5">
              <Switch
                checked={item.available}
                onChange={onToggleAvailability}
                label={`${item.available ? "Mark sold out" : "Mark available"}: ${item.name}`}
              />
              <span
                className={`text-xs ${
                  item.available ? "text-white/55" : "text-[#d7a45a]"
                }`}
              >
                {item.available ? "Available" : "Sold out"}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onEdit}
                className="flex h-9 items-center gap-1.5 rounded-full border border-white/10 px-3.5 text-xs text-white/65 transition hover:bg-white/5 hover:text-white cursor-pointer"
              >
                <Pencil size={12} />
                Edit
              </button>
              <button
                type="button"
                onClick={onRequestDelete}
                aria-label={`Delete ${item.name}`}
                className="flex h-9 w-9 items-center justify-center rounded-full text-white/30 transition hover:bg-white/5 hover:text-red-300 cursor-pointer"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
