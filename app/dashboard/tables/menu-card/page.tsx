"use client";

import { useState } from "react";
import { Printer, TriangleAlert } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { PageHeader, pageShell } from "@/components/dashboard/page-header";
import { menuUrl, useSiteUrl } from "@/lib/site-url";
import { useStaffData } from "@/lib/staff-data-context";

type Layout = "poster" | "cards";

export default function MenuCardPage() {
  const { loading, restaurantName, restaurantSlug } = useStaffData();
  const site = useSiteUrl();

  const [layout, setLayout] = useState<Layout>("poster");
  const [orderLine, setOrderLine] = useState(true);

  const url = menuUrl(site.url, restaurantSlug);
  const shownUrl = url.replace(/^https?:\/\//, "");
  const cardCount = layout === "poster" ? 1 : 4;

  function handlePrint() {
    // A code printed from localhost (or an unconfigured address) will not
    // work for guests. Make that a conscious choice.
    if (site.isLocal || !site.isConfigured) {
      const proceed = window.confirm(
        `This QR code points to ${site.url || "this address"}, which is ${
          site.isLocal
            ? "only reachable from this network"
            : "not your configured public address"
        }. Print anyway?`,
      );
      if (!proceed) return;
    }

    window.print();
  }

  return (
    <div className={`${pageShell("default")} print:max-w-none print:p-0`}>
      {/* Controls: screen only */}
      <div className="print:hidden">
        <PageHeader
          title="Menu QR card"
          subtitle="A printable card that opens your menu on a guest's phone. Put it on the door, the counter, or a poster."
          backHref="/dashboard/tables"
          backLabel="Back to tables"
          actions={
            <button
              type="button"
              onClick={handlePrint}
              disabled={loading}
              className="flex h-11 items-center gap-2 rounded-full bg-[#f5f2ea] px-5 text-sm font-medium text-[#0b0b0d] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              <Printer size={15} />
              Print
            </button>
          }
        />

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div
            role="radiogroup"
            aria-label="Card size"
            className="flex rounded-full border border-white/10 p-1"
          >
            {(
              [
                { value: "poster", label: "One poster (A4)" },
                { value: "cards", label: "Four small cards" },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={layout === option.value}
                onClick={() => setLayout(option.value)}
                className={`h-9 rounded-full px-4 text-xs transition cursor-pointer ${
                  layout === option.value
                    ? "bg-[#f5f2ea] font-medium text-[#0b0b0d]"
                    : "text-white/55 hover:text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 text-xs text-white/55">
            <input
              type="checkbox"
              checked={orderLine}
              onChange={(e) => setOrderLine(e.target.checked)}
              className="h-4 w-4 cursor-pointer accent-[#d7a45a]"
            />
            Add &ldquo;To order, scan the code on your table&rdquo;
          </label>
        </div>

        {(site.isLocal || !site.isConfigured) && site.url && (
          <div className="mt-5 flex gap-3 rounded-2xl border border-[#d7a45a]/30 bg-[#d7a45a]/[0.07] p-4 text-xs leading-relaxed text-[#d7a45a]">
            <TriangleAlert size={15} className="mt-0.5 shrink-0" />
            <p>
              {site.isConfigured ? (
                <>
                  <span className="font-medium">NEXT_PUBLIC_SITE_URL</span> is
                  set to <span className="font-mono">{site.url}</span>, which
                  looks like a private address. Guests can&apos;t open codes
                  that point there.
                </>
              ) : (
                <>
                  <span className="font-medium">NEXT_PUBLIC_SITE_URL</span> is
                  not set, so this code points to{" "}
                  <span className="font-mono">{site.url}</span>, the address
                  you&apos;re browsing on right now. Set it to your public
                  domain before printing.
                </>
              )}
            </p>
          </div>
        )}

        <p className="mt-6 text-xs text-white/30">
          Prints on plain white paper. The code opens{" "}
          <span className="font-mono text-white/45">{shownUrl}</span>
        </p>
      </div>

      {/* The card(s): the same markup is shown and printed */}
      {loading ? (
        <p className="mt-10 text-center text-sm text-white/30 print:hidden">
          Loading…
        </p>
      ) : layout === "poster" ? (
        <div className="mx-auto mt-6 max-w-md print:mt-0 print:max-w-none">
          <Card
            name={restaurantName}
            url={url}
            shownUrl={shownUrl}
            orderLine={orderLine}
            size="poster"
          />
        </div>
      ) : (
        <div className="mx-auto mt-6 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2 print:mt-0 print:max-w-none print:gap-0">
          {Array.from({ length: cardCount }, (_, i) => (
            <Card
              key={i}
              name={restaurantName}
              url={url}
              shownUrl={shownUrl}
              orderLine={orderLine}
              size="small"
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Card({
  name,
  url,
  shownUrl,
  orderLine,
  size,
}: {
  name: string;
  url: string;
  shownUrl: string;
  orderLine: boolean;
  size: "poster" | "small";
}) {
  const poster = size === "poster";

  return (
    <div
      className={`flex flex-col items-center justify-center bg-white text-center text-black break-inside-avoid ${
        poster
          ? "rounded-3xl border border-black/15 px-8 py-14 print:h-[275mm] print:rounded-none print:border-0"
          : "rounded-2xl border border-dashed border-black/30 px-6 py-10 print:h-[138mm] print:rounded-none"
      }`}
    >
      <p
        className={`line-clamp-2 uppercase tracking-[0.3em] text-black/55 ${
          poster ? "text-sm print:text-lg" : "text-[10px] print:text-xs"
        }`}
      >
        {name}
      </p>

      <h2
        className={`font-semibold tracking-tight ${
          poster
            ? "mt-4 text-4xl print:mt-6 print:text-6xl"
            : "mt-2 text-2xl print:mt-3 print:text-3xl"
        }`}
      >
        Scan to see our menu
      </h2>

      <div className={poster ? "mt-8 print:mt-12" : "mt-5 print:mt-6"}>
        <QRCodeSVG
          value={url}
          size={poster ? 640 : 400}
          level="M"
          marginSize={1}
          bgColor="#ffffff"
          fgColor="#000000"
          className={
            poster
              ? "h-auto w-64 print:w-[110mm]"
              : "h-auto w-40 print:w-[58mm]"
          }
        />
      </div>

      {orderLine && (
        <p
          className={`text-black/70 ${
            poster
              ? "mt-8 text-base print:mt-12 print:text-2xl"
              : "mt-4 text-xs print:mt-5 print:text-sm"
          }`}
        >
          To order, scan the code on your table.
        </p>
      )}

      <p
        className={`break-all font-mono text-black/40 ${
          poster
            ? "mt-4 text-xs print:text-base"
            : "mt-2 text-[9px] print:text-[10px]"
        }`}
      >
        {shownUrl}
      </p>
    </div>
  );
}
