import type { NextConfig } from "next";

// Content-Security-Policy. It is sent as REPORT-ONLY first: the browser console lists
// anything it would block, but nothing is blocked. After a clean test of every screen,
// rename the header to "Content-Security-Policy" to enforce it.
const csp = [
  "default-src 'self'",
  // Next.js puts small inline scripts and styles in the page.
  // The two Google hosts are only needed on vinext, which loads next/font/google
  // fonts from Google instead of hosting them itself.
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Menu photos come from Supabase Storage (and any https image link a café pastes).
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  // The app talks to Supabase (data and realtime).
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const isProduction = process.env.NODE_ENV === "production";

// Private pages: never cached, and never listed by search engines.
const noStore = [
  { key: "Cache-Control", value: "no-store" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          ...(isProduction
            ? [
                {
                  key: "Content-Security-Policy-Report-Only",
                  value: csp,
                },
              ]
            : []),
        ],
      },
      // Live data: the menu, the dashboard, login and the API must never be cached.
      { source: "/menu/:path*", headers: noStore },
      { source: "/dashboard/:path*", headers: noStore },
      { source: "/login", headers: noStore },
      { source: "/api/:path*", headers: noStore },
    ];
  },
};

export default nextConfig;
