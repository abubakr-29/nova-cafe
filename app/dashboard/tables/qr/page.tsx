"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowLeft, Printer, TriangleAlert } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { useStaffData } from "@/lib/staff-data-context";
import { tableUrl, useSiteUrl } from "@/lib/site-url";
import { compareTableNames } from "@/lib/table-layout";

export default function TableQrSheetPage() {
  const { loading, restaurantName, restaurantSlug, tables } = useStaffData();
  const site = useSiteUrl();

  const sortedTables = useMemo(
    () => [...tables].sort((a, b) => compareTableNames(a.name, b.name)),
    [tables],
  );

  function handlePrint() {
    // A QR code printed from localhost (or from an unconfigured preview
    // address) will not work for customers. Make that a conscious choice.
    if (site.isLocal || !site.isConfigured) {
      const proceed = window.confirm(
        `These QR codes point to ${site.url || "this address"}, which is ${
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
    <div className="px-6 py-8 md:px-10 print:p-0">
      {/* Toolbar — screen only */}
      <div className="mx-auto mb-6 max-w-5xl print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href="/dashboard/tables"
              className="mb-3 flex items-center gap-2 text-xs text-white/40 transition hover:text-white/70"
            >
              <ArrowLeft size={14} />
              Back to tables
            </Link>
            <h1 className="text-lg font-medium">Table QR codes</h1>
            <p className="mt-1 text-xs text-white/35">
              One card per table, six to an A4 page. Print, cut and place each
              card on its table.
            </p>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            disabled={loading || sortedTables.length === 0}
            className="flex items-center gap-2 rounded-full bg-[#f5f2ea] px-4 py-2.5 text-sm font-medium text-[#0b0b0d] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            <Printer size={15} />
            Print
          </button>
        </div>

        {(site.isLocal || !site.isConfigured) && site.url && (
          <div className="mt-5 flex gap-3 rounded-2xl border border-[#d7a45a]/30 bg-[#d7a45a]/[0.07] p-4 text-xs leading-relaxed text-[#d7a45a]">
            <TriangleAlert size={15} className="mt-0.5 shrink-0" />
            <p>
              {site.isConfigured ? (
                <>
                  <span className="font-medium">NEXT_PUBLIC_SITE_URL</span> is
                  set to <span className="font-mono">{site.url}</span>, which
                  looks like a private address. Customers can&apos;t open codes
                  that point there.
                </>
              ) : (
                <>
                  <span className="font-medium">NEXT_PUBLIC_SITE_URL</span> is
                  not set, so these codes point to{" "}
                  <span className="font-mono">{site.url}</span>, the address
                  you&apos;re browsing on right now. Set it to your public
                  domain before printing real cards.
                </>
              )}
            </p>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-center text-sm text-white/30 print:hidden">
          Loading…
        </p>
      ) : sortedTables.length === 0 ? (
        <p className="text-center text-sm text-white/30 print:hidden">
          You haven&apos;t added any tables yet.
        </p>
      ) : (
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 print:max-w-none print:grid-cols-2 print:gap-4">
          {sortedTables.map((table) => {
            const url = tableUrl(site.url, restaurantSlug, table.id);

            return (
              <div
                key={table.id}
                className="break-inside-avoid rounded-2xl border border-black/20 bg-white p-6 text-center text-black"
              >
                <p className="line-clamp-1 text-[11px] uppercase tracking-[0.25em] text-black/50">
                  {restaurantName}
                </p>

                <p className="mt-2 text-3xl font-semibold">{table.name}</p>

                <div className="mt-4 flex justify-center">
                  <QRCodeSVG
                    value={url}
                    size={176}
                    level="M"
                    marginSize={1}
                    bgColor="#ffffff"
                    fgColor="#000000"
                  />
                </div>

                <p className="mt-4 text-sm font-medium">
                  Scan to view the menu and order
                </p>

                <p className="mt-2 break-all text-[9px] leading-snug text-black/40">
                  {url}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
