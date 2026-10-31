import type { MetadataRoute } from "next";

import { configuredSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const base = configuredSiteUrl();

  // No public address set yet (a test deploy): ask everyone to stay out.
  if (!base) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private or per-table pages: staff screens, the API and guests' menu links.
      disallow: ["/dashboard", "/login", "/api/", "/menu/"],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
