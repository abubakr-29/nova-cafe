"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const [supabase] = useState(() => createClient());
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [taxRatePercent, setTaxRatePercent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function load() {
      const { data: rid } = await supabase.rpc("current_restaurant_id");

      if (!rid || ignore) {
        setLoading(false);
        return;
      }

      setRestaurantId(rid);

      const { data } = await supabase
        .from("restaurants")
        .select("name, tax_rate")
        .eq("id", rid)
        .single();

      if (data && !ignore) {
        setName(data.name);
        setTaxRatePercent((data.tax_rate * 100).toString());
      }

      if (!ignore) setLoading(false);
    }

    load();

    return () => {
      ignore = true;
    };
  }, [supabase]);

  async function handleSave() {
    if (!restaurantId) return;

    setSaving(true);

    const rate = Math.max(0, Math.min(100, Number(taxRatePercent) || 0)) / 100;

    await supabase
      .from("restaurants")
      .update({ tax_rate: rate })
      .eq("id", restaurantId);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <main className="min-h-screen bg-[#0b0b0d] text-[#f5f2ea]">
      <div className="flex min-h-screen">
        <div className="min-w-0 flex-1">
          <header className="flex h-20 items-center justify-between border-b border-white/[0.07] px-6 md:px-10">
            <div>
              <p className="text-xs text-white/25">White Cave</p>
              <p className="mt-1 text-sm text-white/60">Settings</p>
            </div>

            <button
              type="button"
              aria-label="Notifications"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/40 transition hover:bg-white/5 hover:text-white"
            >
              <Bell size={16} />
            </button>
          </header>

          <div className="mx-auto max-w-2xl px-6 py-8 md:px-10">
            <p className="text-xs uppercase tracking-[0.25em] text-[#d7a45a]">
              Settings
            </p>

            <h1 className="mt-3 text-3xl font-medium tracking-[-0.03em] md:text-4xl">
              Restaurant settings
            </h1>

            {loading ? (
              <p className="mt-8 text-sm text-white/30">Loading...</p>
            ) : (
              <div className="mt-8 rounded-3xl border border-white/8 bg-white/2.5 p-6">
                <label className="text-xs text-white/40">Restaurant name</label>
                <input
                  value={name}
                  disabled
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/2.5 px-4 py-3 text-sm text-white/50 outline-none"
                />
                <p className="mt-1 text-[10px] text-white/20">
                  Contact support to change the restaurant name.
                </p>

                <label className="mt-6 block text-xs text-white/40">
                  Tax rate (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={taxRatePercent}
                  onChange={(e) => setTaxRatePercent(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/2.5 px-4 py-3 text-sm text-white outline-none focus:border-white/20"
                />
                <p className="mt-1 text-[10px] text-white/20">
                  Applied automatically to every order and bill.
                </p>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="mt-6 h-12 rounded-full bg-[#f5f2ea] px-6 text-sm font-medium text-[#0b0b0d] transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                >
                  {saved ? "Saved!" : saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
