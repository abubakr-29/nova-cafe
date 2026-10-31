import type { MetadataRoute } from "next";

import { configuredSiteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = configuredSiteUrl();

  // Only the public home page belongs here. Menus and the dashboard stay private.
  if (!base) return [];

  return [{ url: `${base}/`, changeFrequency: "monthly", priority: 1 }];
}
