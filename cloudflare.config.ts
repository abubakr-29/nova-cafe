import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    // The Worker's name. It also names the free test address (tavro.<you>.workers.dev).
    name: "tavro",
    entrypoint: "vinext/server/fetch-handler",

    // Keep this a day or two in the past. Cloudflare reads it in UTC, which is
    // behind India, and a date "in the future" is rejected.
    compatibilityDate: "2026-10-30",
    compatibilityFlags: ["nodejs_compat"],
    workersDev: false,
    previewUrls: false,

    // Your own address, once you have chosen the name. Leave it out for the
    // first test deploy. Example: domains: ["yourname.famedia.co.in"],
    domains: ["tavro.famedia.co.in"],

    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ASSETS: bindings.assets(),
      IMAGES: bindings.images(),
      // The Supabase secret key. Declaring it here is what makes it reach the
      // server code (process.env.SUPABASE_SECRET_KEY). Its value is never in this
      // file: set it in the Cloudflare dashboard, see the guide.
      SUPABASE_SECRET_KEY: bindings.secret(),
    },
  }),
});
