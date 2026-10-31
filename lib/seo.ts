import { BRAND } from "@/lib/brand";

export const SITE = {
  name: BRAND.product,
  company: BRAND.company,
  companyUrl: "https://famedia.co.in",
  tagline: "QR table ordering for cafés and restaurants",
  description:
    "Guests scan the table QR code, order and pay from their own phone. Your team sees every order live. UPI and cash, split bills, daily sales reports. No app to install.",
} as const;

/**
 * The public address of this site (NEXT_PUBLIC_SITE_URL, no slash at the end).
 * It is empty until you set it. Search engines are told to stay away until then,
 * so a test address such as xxx.workers.dev never gets indexed.
 */
export function configuredSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/+$/, "");
}

/** Always a valid URL, for places that need one (metadataBase). */
export function siteUrl() {
  return configuredSiteUrl() || "http://localhost:3000";
}
