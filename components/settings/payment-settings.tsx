"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { isValidUpiId } from "@/lib/upi";

const MAX_BYTES = 1024 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "image/webp"];

// Keeps the picture sharp (a QR must stay scannable) and under the 1 MB limit.
async function prepareQr(file: File): Promise<Blob | null> {
  if (!ALLOWED.includes(file.type)) return null;
  if (file.size <= MAX_BYTES) return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );

  return blob && blob.size <= MAX_BYTES ? blob : null;
}

const input =
  "mt-2 w-full rounded-xl border border-white/10 bg-white/2.5 px-4 py-3 text-sm text-white outline-none focus:border-white/20";

export default function PaymentSettings() {
  const [supabase] = useState(() => createClient());
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  const [upiId, setUpiId] = useState("");
  const [payeeName, setPayeeName] = useState("");
  const [acceptsCash, setAcceptsCash] = useState(true);
  const [qrPath, setQrPath] = useState<string | null>(null);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrPreview, setQrPreview] = useState<string | null>(null);
  const [removeQr, setRemoveQr] = useState(false);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  useEffect(() => {
    let ignore = false;

    async function load() {
      const [{ data: rid }, { data: owner }] = await Promise.all([
        supabase.rpc("current_restaurant_id"),
        supabase.rpc("is_restaurant_owner"),
      ]);

      if (ignore) return;

      if (!rid || !owner) {
        setLoading(false);
        return;
      }

      setRestaurantId(rid);
      setIsOwner(true);

      const { data } = await supabase
        .from("restaurant_payment_settings")
        .select("upi_id, upi_payee_name, upi_qr_path, accepts_cash")
        .eq("restaurant_id", rid)
        .maybeSingle();

      if (ignore) return;

      if (data) {
        setUpiId(data.upi_id ?? "");
        setPayeeName(data.upi_payee_name ?? "");
        setAcceptsCash(data.accepts_cash);
        setQrPath(data.upi_qr_path);
      }

      setLoading(false);
    }

    load();

    return () => {
      ignore = true;
    };
  }, [supabase]);

  function pickFile(file: File | null) {
    if (qrPreview) URL.revokeObjectURL(qrPreview);
    setQrFile(file);
    setQrPreview(file ? URL.createObjectURL(file) : null);
    setRemoveQr(false);
  }

  async function handleSave() {
    if (!restaurantId) return;

    const id = upiId.trim();
    const name = payeeName.trim();
    const fail = (text: string) => setMessage({ ok: false, text });

    if (id && !isValidUpiId(id)) {
      return fail("That UPI ID does not look right. It looks like name@bank.");
    }

    if (name.length > 60) return fail("The name can be 60 letters at most.");

    const keepsQr = Boolean(qrFile) || (Boolean(qrPath) && !removeQr);

    if (!acceptsCash && !id && !keepsQr) {
      return fail(
        "Keep at least one way to pay: cash, a UPI ID or a QR picture.",
      );
    }

    setSaving(true);
    setMessage(null);

    let nextPath = removeQr ? null : qrPath;
    let uploaded: string | null = null;

    if (qrFile) {
      const blob = await prepareQr(qrFile);

      if (!blob) {
        setSaving(false);
        return fail("Use a PNG, JPG or WebP picture under 1 MB.");
      }

      const ext = blob.type === "image/jpeg" ? "jpg" : blob.type.split("/")[1];
      uploaded = `${restaurantId}/qr-${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from("payment-qr")
        .upload(uploaded, blob, { contentType: blob.type });

      if (error) {
        setSaving(false);
        return fail("The picture could not be uploaded. Please try again.");
      }

      nextPath = uploaded;
    }

    const { error } = await supabase
      .from("restaurant_payment_settings")
      .upsert({
        restaurant_id: restaurantId,
        upi_id: id || null,
        upi_payee_name: name || null,
        upi_qr_path: nextPath,
        accepts_cash: acceptsCash,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      if (uploaded)
        await supabase.storage.from("payment-qr").remove([uploaded]);
      setSaving(false);
      return fail("Could not save. Please check the details and try again.");
    }

    if (qrPath && qrPath !== nextPath) {
      await supabase.storage.from("payment-qr").remove([qrPath]);
    }

    setQrPath(nextPath);
    setRemoveQr(false);
    pickFile(null);
    setSaving(false);
    setMessage({ ok: true, text: "Saved." });
  }

  if (loading) return null;

  if (!isOwner) {
    return (
      <p className="mt-6 text-xs text-white/30">
        Only the owner can change payment settings.
      </p>
    );
  }

  const shownQr =
    qrPreview ??
    (qrPath && !removeQr
      ? supabase.storage.from("payment-qr").getPublicUrl(qrPath).data.publicUrl
      : null);

  return (
    <div className="mt-6 rounded-3xl border border-white/8 bg-white/2.5 p-6">
      <h2 className="text-lg font-medium">How guests pay</h2>
      <p className="mt-1 text-xs text-white/30">
        Guests pay you directly. Your staff confirm each payment.
      </p>

      <label className="mt-6 block text-xs text-white/40">UPI ID</label>
      <input
        value={upiId}
        onChange={(e) => setUpiId(e.target.value)}
        placeholder="yourcafe@okhdfcbank"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={input}
      />
      <p className="mt-1 text-[10px] text-white/20">
        Guests get a Pay button and a QR with the exact amount filled in.
      </p>

      <label className="mt-6 block text-xs text-white/40">
        Name shown in the UPI app
      </label>
      <input
        value={payeeName}
        onChange={(e) => setPayeeName(e.target.value)}
        placeholder="Leave empty to use the café name"
        maxLength={60}
        className={input}
      />

      <label className="mt-6 block text-xs text-white/40">
        Or upload your UPI QR picture
      </label>
      <p className="mt-1 text-[10px] text-white/20">
        Use this if your UPI ID is long or hard to type. A screenshot from your
        UPI app works. Guests will have to type the amount themselves. If you
        also enter a UPI ID, the ID is used.
      </p>

      {shownQr && (
        <div className="mt-3 w-fit rounded-2xl bg-white p-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- the owner's own QR picture */}
          <img
            src={shownQr}
            alt="UPI QR"
            className="h-40 w-40 object-contain"
          />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          className="text-xs text-white/50 file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-xs file:text-white/70"
        />

        {(qrPath || qrFile) && !removeQr && (
          <button
            type="button"
            onClick={() => {
              pickFile(null);
              setRemoveQr(true);
            }}
            className="text-xs text-red-300/80"
          >
            Remove picture
          </button>
        )}
      </div>

      <label className="mt-6 flex items-center gap-3 text-sm text-white/70">
        <input
          type="checkbox"
          checked={acceptsCash}
          onChange={(e) => setAcceptsCash(e.target.checked)}
          className="h-4 w-4"
        />
        Accept cash at the table
      </label>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="mt-6 h-12 rounded-full bg-[#f5f2ea] px-6 text-sm font-medium text-[#0b0b0d] transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save payment settings"}
      </button>

      {message && (
        <p
          className={`mt-3 text-xs ${message.ok ? "text-emerald-300" : "text-red-300/80"}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
