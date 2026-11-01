"use client";

import { useEffect, useState } from "react";

import { PageHeader, pageShell } from "@/components/dashboard/page-header";
import PaymentSettings from "@/components/settings/payment-settings";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const [supabase] = useState(() => createClient());
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [taxRatePercent, setTaxRatePercent] = useState("");
  const [dayStart, setDayStart] = useState("05:00");
  const [savedDayStart, setSavedDayStart] = useState("05:00");
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      const [{ data: rid }, { data: owner }] = await Promise.all([
        supabase.rpc("current_restaurant_id"),
        supabase.rpc("is_restaurant_owner"),
      ]);

      if (!rid || ignore) {
        setLoading(false);
        return;
      }

      setRestaurantId(rid);
      setIsOwner(owner === true);

      const { data } = await supabase
        .from("restaurants")
        .select("name, tax_rate, day_start_time")
        .eq("id", rid)
        .single();

      if (data && !ignore) {
        setName(data.name);
        setTaxRatePercent((data.tax_rate * 100).toString());
        const start = String(data.day_start_time).slice(0, 5);
        setDayStart(start);
        setSavedDayStart(start);
      }

      if (!ignore) setLoading(false);
    }

    load();

    return () => {
      ignore = true;
    };
  }, [supabase]);

  async function handleSave() {
    if (!restaurantId || !isOwner) return;

    setSaving(true);
    setSaveError(null);

    const rate = Math.max(0, Math.min(30, Number(taxRatePercent) || 0)) / 100;

    const { data, error } = await supabase
      .from("restaurants")
      .update({ tax_rate: rate })
      .eq("id", restaurantId)
      .select("id");

    if (error || !data || data.length === 0) {
      setSaving(false);
      setSaveError("Couldn't save the tax rate. Please try again.");
      return;
    }

    if (dayStart && dayStart !== savedDayStart) {
      const { error: dayError } = await supabase.rpc("set_day_start", {
        p_time: dayStart,
      });

      if (dayError) {
        setSaving(false);
        setSaveError(dayError.message);
        return;
      }

      setSavedDayStart(dayStart);
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className={pageShell("narrow")}>
      <PageHeader
        title="Settings"
        subtitle="How your café runs: tax, business day and payments."
      />

      {loading ? (
        <p className="text-sm text-white/30">Loading...</p>
      ) : (
        <div>
          <div className="rounded-3xl border border-white/8 bg-white/2.5 p-6">
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
              max={30}
              step={0.1}
              value={taxRatePercent}
              disabled={!isOwner}
              onChange={(e) => setTaxRatePercent(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/2.5 px-4 py-3 text-sm text-white outline-none focus:border-white/20 disabled:text-white/50"
            />
            <p className="mt-1 text-[10px] text-white/20">
              Applied automatically to every order and bill.
            </p>

            <label className="mt-6 block text-xs text-white/40">
              Business day starts at
            </label>
            <input
              type="time"
              min="00:00"
              max="08:00"
              value={dayStart}
              disabled={!isOwner}
              onChange={(e) => setDayStart(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/2.5 px-4 py-3 text-sm text-white outline-none focus:border-white/20 disabled:text-white/50"
            />
            <p className="mt-1 text-[10px] text-white/20">
              Orders placed before this time count toward the previous day.
              Between 00:00 and 08:00. Changing it also changes how past days
              are grouped in Reports and History, and it can only be changed
              when all tables are closed.
            </p>

            {isOwner ? (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="mt-6 h-12 rounded-full bg-[#f5f2ea] px-6 text-sm font-medium text-[#0b0b0d] transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                {saved ? "Saved!" : saving ? "Saving..." : "Save changes"}
              </button>
            ) : (
              <p className="mt-6 text-xs text-white/30">
                Only the owner can change these settings.
              </p>
            )}
            {saveError && (
              <p className="mt-3 text-xs text-red-300/80">{saveError}</p>
            )}
          </div>

          <PaymentSettings />
        </div>
      )}
    </div>
  );
}
