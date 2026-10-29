"use client";

import { useState } from "react";
import { Banknote, Smartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import type { PaymentOptions } from "@/types/payment";
import { buildUpiLink } from "@/lib/upi";

type PayPanelProps = {
  amount: number;
  note: string;
  options: PaymentOptions;
  onClaim: (method: "upi" | "cash") => Promise<boolean>;
  onBack: () => void;
};

const primary =
  "flex h-14 w-full items-center justify-center rounded-full bg-[#f5f2ea] px-6 text-sm font-medium text-[#0b0b0d] transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50";
const secondary =
  "flex h-14 w-full items-center justify-between rounded-full border border-white/10 px-6 text-sm text-white/70 transition hover:border-white/20 hover:bg-white/5";

export default function PayPanel({
  amount,
  note,
  options,
  onClaim,
  onBack,
}: PayPanelProps) {
  const hasUpi = Boolean(options.upiId || options.qrUrl);
  const [step, setStep] = useState<"choose" | "upi" | "cash">(
    hasUpi && !options.acceptsCash
      ? "upi"
      : !hasUpi && options.acceptsCash
        ? "cash"
        : "choose",
  );
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const money = `₹${amount.toLocaleString("en-IN")}`;
  const upiLink = options.upiId
    ? buildUpiLink({
        upiId: options.upiId,
        payeeName: options.payeeName,
        amount,
        note,
      })
    : null;

  async function claim(method: "upi" | "cash") {
    setBusy(true);
    setFailed(false);
    const ok = await onClaim(method);
    setBusy(false);
    if (!ok) setFailed(true);
  }

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-white/30">
        Amount to pay
      </p>
      <p className="mt-2 text-4xl font-medium tracking-[-0.03em] text-white">
        {money}
      </p>

      {step === "choose" && (
        <div className="mt-6 grid gap-3">
          <button
            type="button"
            onClick={() => setStep("upi")}
            className={secondary}
          >
            <span>Pay with UPI</span>
            <Smartphone size={16} />
          </button>
          <button
            type="button"
            onClick={() => setStep("cash")}
            className={secondary}
          >
            <span>Pay cash at the table</span>
            <Banknote size={16} />
          </button>
        </div>
      )}

      {step === "upi" && (
        <div className="mt-6">
          {upiLink ? (
            <>
              <a href={upiLink} className={primary}>
                Open UPI app
              </a>

              <div className="mx-auto mt-5 w-fit rounded-2xl bg-white p-3">
                <QRCodeSVG value={upiLink} size={168} />
              </div>
              <p className="mt-3 text-center text-xs text-white/35">
                Or scan this with another phone&apos;s UPI app.
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto w-fit max-w-full rounded-2xl bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- the café's own uploaded QR picture */}
                <img
                  src={options.qrUrl ?? ""}
                  alt={`UPI QR code for ${options.payeeName}`}
                  className="max-h-72 w-auto max-w-full"
                />
              </div>
              <p className="mt-3 text-center text-xs text-white/35">
                Scan with any UPI app and enter {money}.
              </p>
            </>
          )}

          <p className="mt-5 text-center text-xs text-white/35">
            Paying {options.payeeName}. Tap below once the payment goes through.
          </p>

          <button
            type="button"
            disabled={busy}
            onClick={() => claim("upi")}
            className={`${primary} mt-3`}
          >
            {busy ? "Sending…" : "I've paid"}
          </button>
        </div>
      )}

      {step === "cash" && (
        <div className="mt-6">
          <p className="text-sm leading-6 text-white/50">
            A staff member will come to your table to collect {money} in cash.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => claim("cash")}
            className={`${primary} mt-4`}
          >
            {busy ? "Sending…" : "Call staff to collect cash"}
          </button>
        </div>
      )}

      {failed && (
        <p className="mt-3 text-center text-xs text-red-300/80">
          That did not go through. Please try again, or ask a staff member.
        </p>
      )}

      <button
        type="button"
        onClick={
          step === "choose" || !(hasUpi && options.acceptsCash)
            ? onBack
            : () => setStep("choose")
        }
        className={`${secondary} mt-3 justify-center`}
      >
        Back
      </button>
    </div>
  );
}
