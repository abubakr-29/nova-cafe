"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, ChevronDown, Pencil, Plus, Trash2, X } from "lucide-react";

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
  sizes: [],
  addons: [],
};

export default function DashboardMenuPage() {
  const [supabase] = useState(() => createClient());
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItemRow[]>([]);

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
          "id, name, description, price, image_url, available, category_id, sort_order, menu_item_sizes(id, name, price), menu_item_addons(id, name, price)",
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
            "id, name, description, price, image_url, available, category_id, sort_order, menu_item_sizes(id, name, price), menu_item_addons(id, name, price)",
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
    setEditorOpen(true);
  }

  async function handleSaveItem() {
    if (!restaurantId || !form.name.trim() || !form.categoryId) return;

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
    const { error } = await supabase
      .from("menu_items")
      .update({ available: !item.available })
      .eq("id", item.id);

    if (error) {
      setSaveError("Could not update availability. Please try again.");
      return;
    }

    loadData();
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

  const itemsByCategory = categories.map((category) => ({
    category,
    items: items.filter((item) => item.category_id === category.id),
  }));

  const uncategorized = items.filter((item) => !item.category_id);

  return (
    <main className="min-h-screen bg-[#0b0b0d] text-[#f5f2ea]">
      <div className="flex min-h-screen">
        <div className="min-w-0 flex-1">
          <header className="flex h-20 items-center justify-between border-b border-white/[0.07] px-6 md:px-10">
            <div>
              <p className="text-xs text-white/25">White Cave</p>
              <p className="mt-1 text-sm text-white/60">Menu management</p>
            </div>

            <button
              type="button"
              aria-label="Notifications"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/40 transition hover:bg-white/5 hover:text-white"
            >
              <Bell size={16} />
            </button>
          </header>

          {saveError && (
            <div className="mx-6 mt-4 rounded-xl border border-red-400/20 bg-red-950/40 px-4 py-3 text-sm text-red-200 md:mx-10">
              {saveError}
            </div>
          )}

          <div className="mx-auto max-w-375 px-6 py-8 md:px-10">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[#d7a45a]">
                  Menu
                </p>

                <h1 className="mt-3 text-3xl font-medium tracking-[-0.03em] md:text-4xl">
                  Manage your menu
                </h1>

                <p className="mt-2 text-sm text-white/30">
                  Add items, set prices, and toggle availability — changes
                  reflect on the customer menu instantly.
                </p>
              </div>

              <button
                type="button"
                onClick={openNewItemEditor}
                className="flex h-12 shrink-0 items-center gap-2 rounded-full bg-[#f5f2ea] px-6 text-sm font-medium text-[#0b0b0d] transition hover:scale-[1.01] active:scale-[0.99]"
              >
                <Plus size={15} />
                Add item
              </button>
            </div>

            {/* Categories */}
            <section className="mt-8 rounded-3xl border border-white/8 bg-white/2.5 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-white/30">
                Categories
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center gap-1 rounded-full border border-white/10 bg-white/2.5 pl-4 pr-1.5 py-1.5"
                  >
                    {editingCategoryId === category.id ? (
                      <input
                        autoFocus
                        value={editingCategoryName}
                        onChange={(e) => setEditingCategoryName(e.target.value)}
                        onBlur={() => handleRenameCategory(category.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter")
                            handleRenameCategory(category.id);
                        }}
                        className="w-28 bg-transparent text-sm text-white outline-none"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCategoryId(category.id);
                          setEditingCategoryName(category.name);
                        }}
                        className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white"
                      >
                        {category.name}
                        <Pencil size={11} className="text-white/25" />
                      </button>
                    )}

                    {confirmingDeleteCategoryId === category.id ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(category.id)}
                        className="rounded-full bg-red-400/15 px-2 py-1 text-[10px] text-red-300"
                      >
                        Confirm?
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmingDeleteCategoryId(category.id)
                        }
                        aria-label={`Delete ${category.name}`}
                        className="flex h-6 w-6 items-center justify-center rounded-full text-white/25 hover:bg-white/5 hover:text-red-300"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 flex gap-2">
                <input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddCategory();
                  }}
                  placeholder="New category name"
                  className="w-56 rounded-full border border-white/10 bg-white/2.5 px-4 py-2 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/20"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-2 text-sm text-white/60 transition hover:bg-white/5"
                >
                  <Plus size={13} />
                  Add category
                </button>
              </div>
            </section>

            {/* Items */}
            {loading ? (
              <p className="mt-8 text-sm text-white/30">Loading menu...</p>
            ) : (
              <div className="mt-8 space-y-8">
                {itemsByCategory.map(({ category, items: categoryItems }) => (
                  <section key={category.id}>
                    <p className="mb-3 text-sm font-medium text-white/50">
                      {category.name}
                    </p>

                    {categoryItems.length === 0 ? (
                      <p className="text-xs text-white/20">No items yet.</p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {categoryItems.map((item) => (
                          <MenuItemCard
                            key={item.id}
                            item={item}
                            confirmingDelete={
                              confirmingDeleteItemId === item.id
                            }
                            onToggleAvailability={() =>
                              handleToggleAvailability(item)
                            }
                            onEdit={() => openEditItemEditor(item)}
                            onRequestDelete={() =>
                              setConfirmingDeleteItemId(item.id)
                            }
                            onCancelDelete={() =>
                              setConfirmingDeleteItemId(null)
                            }
                            onConfirmDelete={() => handleDeleteItem(item.id)}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                ))}

                {uncategorized.length > 0 && (
                  <section>
                    <p className="mb-3 text-sm font-medium text-white/50">
                      Uncategorized
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {uncategorized.map((item) => (
                        <MenuItemCard
                          key={item.id}
                          item={item}
                          confirmingDelete={confirmingDeleteItemId === item.id}
                          onToggleAvailability={() =>
                            handleToggleAvailability(item)
                          }
                          onEdit={() => openEditItemEditor(item)}
                          onRequestDelete={() =>
                            setConfirmingDeleteItemId(item.id)
                          }
                          onCancelDelete={() => setConfirmingDeleteItemId(null)}
                          onConfirmDelete={() => handleDeleteItem(item.id)}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}

            <Link
              href="/menu"
              className="mt-10 inline-block text-blue-400 hover:text-blue-300"
            >
              View customer menu
            </Link>
          </div>
        </div>
      </div>

      {/* Item editor */}
      {editorOpen && (
        <div className="fixed inset-0 z-100 flex items-end justify-center sm:items-center">
          <button
            aria-label="Close editor"
            onClick={() => setEditorOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <div className="relative z-10 max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-4xl border border-white/10 bg-[#151519] p-6 sm:rounded-4xl md:p-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-medium text-white">
                {editingItemId ? "Edit item" : "Add item"}
              </h2>
              <button
                onClick={() => setEditorOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-white/40 hover:bg-white/5 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Item name"
                className="rounded-xl border border-white/10 bg-white/2.5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/20 sm:col-span-2"
              />

              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Description"
                rows={2}
                className="rounded-xl border border-white/10 bg-white/2.5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/20 sm:col-span-2"
              />

              <input
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="Price (₹)"
                className="rounded-xl border border-white/10 bg-white/2.5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/20"
              />

              <div className="relative">
                <select
                  value={form.categoryId}
                  onChange={(e) =>
                    setForm({ ...form, categoryId: e.target.value })
                  }
                  className="w-full appearance-none rounded-xl border border-white/10 bg-white/2.5 px-4 py-3 text-sm text-white outline-none focus:border-white/20"
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

              <input
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="Image URL (optional)"
                className="rounded-xl border border-white/10 bg-white/2.5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/20 sm:col-span-2"
              />

              <label className="flex items-center gap-2 text-sm text-white/60 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.available}
                  onChange={(e) =>
                    setForm({ ...form, available: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-white/20 bg-white/2.5"
                />
                Available to order
              </label>
            </div>

            {/* Sizes */}
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white/60">Sizes</p>
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      sizes: [...form.sizes, { name: "", price: 0 }],
                    })
                  }
                  className="flex items-center gap-1 text-xs text-white/40 hover:text-white"
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
                      placeholder="Size name (e.g. Large)"
                      className="flex-1 rounded-xl border border-white/10 bg-white/2.5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/25"
                    />
                    <input
                      type="number"
                      value={size.price}
                      onChange={(e) =>
                        updateSizeRow(index, {
                          price: Number(e.target.value) || 0,
                        })
                      }
                      placeholder="+₹"
                      className="w-24 rounded-xl border border-white/10 bg-white/2.5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/25"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          sizes: form.sizes.filter((_, i) => i !== index),
                        })
                      }
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/30 hover:bg-white/5 hover:text-red-300"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Add-ons */}
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white/60">Add-ons</p>
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      addons: [...form.addons, { name: "", price: 0 }],
                    })
                  }
                  className="flex items-center gap-1 text-xs text-white/40 hover:text-white"
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
                      placeholder="Add-on name (e.g. Extra shot)"
                      className="flex-1 rounded-xl border border-white/10 bg-white/2.5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/25"
                    />
                    <input
                      type="number"
                      value={addon.price}
                      onChange={(e) =>
                        updateAddonRow(index, {
                          price: Number(e.target.value) || 0,
                        })
                      }
                      placeholder="+₹"
                      className="w-24 rounded-xl border border-white/10 bg-white/2.5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/25"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          addons: form.addons.filter((_, i) => i !== index),
                        })
                      }
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/30 hover:bg-white/5 hover:text-red-300"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveItem}
              disabled={!form.name.trim() || !form.categoryId}
              className="mt-8 h-12 w-full rounded-full bg-[#f5f2ea] text-sm font-medium text-[#0b0b0d] transition hover:scale-[1.01] active:scale-[0.99] disabled:cursor-default disabled:opacity-40"
            >
              {editingItemId ? "Save changes" : "Add item"}
            </button>
          </div>
        </div>
      )}
    </main>
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
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/2.5 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white/80">
            {item.name}
          </p>
          <p className="mt-1 text-xs text-white/30">₹{item.price}</p>
        </div>

        <button
          type="button"
          onClick={onToggleAvailability}
          aria-label={`${item.available ? "Mark sold out" : "Mark available"}: ${item.name}`}
          className={`relative h-7 w-12 shrink-0 rounded-full transition ${
            item.available ? "bg-[#d7a45a]" : "bg-white/10"
          }`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-[#0b0b0d] transition-transform ${
              item.available ? "translate-x-0" : "-translate-x-5"
            }`}
          />
        </button>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-white/10 py-2 text-xs text-white/55 transition hover:bg-white/5"
        >
          <Pencil size={12} />
          Edit
        </button>

        {confirmingDelete ? (
          <button
            type="button"
            onClick={onConfirmDelete}
            onBlur={onCancelDelete}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-red-400/30 bg-red-400/10 py-2 text-xs text-red-300 transition hover:bg-red-400/15"
          >
            Confirm delete
          </button>
        ) : (
          <button
            type="button"
            onClick={onRequestDelete}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-white/10 py-2 text-xs text-white/30 transition hover:text-red-300"
          >
            <Trash2 size={12} />
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
