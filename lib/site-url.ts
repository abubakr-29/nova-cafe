import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

const LOCAL_HOST =
  /^(localhost|0\.0\.0\.0|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[::1\])|\.local$/i;

function isLocalUrl(url: string) {
  if (!url) return false;

  try {
    return LOCAL_HOST.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

/**
 * The public base URL that table QR codes should point at.
 *
 * Set NEXT_PUBLIC_SITE_URL (e.g. https://menu.example.com) so printed codes
 * never depend on whichever address the dashboard happens to be opened on.
 * Without it we fall back to the current origin and flag that to the UI.
 */
export function useSiteUrl() {
  const origin = useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => "",
  );

  const configured = (process.env.NEXT_PUBLIC_SITE_URL ?? "")
    .trim()
    .replace(/\/+$/, "");
  const url = configured || origin;

  return { url, isConfigured: configured !== "", isLocal: isLocalUrl(url) };
}

export function tableUrl(
  siteUrl: string,
  restaurantSlug: string,
  tableId: string,
) {
  return `${siteUrl}/menu/${encodeURIComponent(restaurantSlug)}/${tableId}`;
}
