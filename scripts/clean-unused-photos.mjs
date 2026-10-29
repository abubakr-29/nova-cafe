// Finds menu photos that nothing uses any more and (only with --apply) deletes them.
//
//   node --env-file=.env.local scripts/clean-unused-photos.mjs white-cave           # just look
//   node --env-file=.env.local scripts/clean-unused-photos.mjs white-cave --apply   # delete
//
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local (this runs on your
// own computer, never in the browser) and migration 016 applied.
//
// A photo counts as USED if a menu item uses it, or a bill of a table that is still open
// shows it. Photos younger than 24 hours are always kept: someone may have just uploaded
// one and not saved the item yet. Each photo has a small "-thumb" twin; it follows its photo.

import { createClient } from "@supabase/supabase-js";
import { pathToFileURL } from "node:url";

const BUCKET = "menu-images";
const GRACE_MS = 24 * 60 * 60 * 1000;

const thumbOf = (path) => path.replace(/\.(webp|jpg)$/i, "-thumb.$1");

/** Pure: which files can go. `files` = [{ name, created_at, size }], `used` = Set of paths. */
export function findUnused({ files, used, now, graceMs = GRACE_MS }) {
  const keep = new Set([...used, ...[...used].map(thumbOf)]);

  return files.filter(
    (file) =>
      !keep.has(file.name) &&
      now - new Date(file.created_at).getTime() > graceMs,
  );
}

async function listFolder(supabase, folder) {
  const files = [];

  for (let offset = 0; ; offset += 100) {
    const { data, error } = await supabase.storage.from(BUCKET).list(folder, {
      limit: 100,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) throw new Error(`Could not list photos: ${error.message}`);

    for (const entry of data) {
      // Folders have no id; our photos are all direct files of the café's folder.
      if (entry.id) {
        files.push({
          name: `${folder}/${entry.name}`,
          created_at: entry.created_at,
          size: entry.metadata?.size ?? 0,
        });
      }
    }

    if (data.length < 100) return files;
  }
}

export async function run({
  supabase,
  slug,
  apply,
  force = false,
  now = Date.now(),
  log = console.log,
}) {
  const { data: cafe, error: cafeError } = await supabase
    .from("restaurants")
    .select("id")
    .eq("slug", slug)
    .single();

  if (cafeError || !cafe) throw new Error(`No café with slug "${slug}"`);

  const { data: refs, error: refError } = await supabase.rpc(
    "menu_photo_references",
    {
      p_slug: slug,
    },
  );

  if (refError)
    throw new Error(`Could not read photo references: ${refError.message}`);

  const used = new Set(refs ?? []);
  const files = await listFolder(supabase, cafe.id);
  const unused = findUnused({ files, used, now });
  const bytes = unused.reduce((sum, f) => sum + f.size, 0);

  log(`${files.length} files in storage, ${used.size} photos in use.`);
  log(
    `${unused.length} unused files (${(bytes / 1024 / 1024).toFixed(1)} MB):`,
  );
  unused.slice(0, 20).forEach((f) => log(`  ${f.name}`));
  if (unused.length > 20) log(`  ...and ${unused.length - 20} more`);

  if (!apply) {
    log(
      unused.length
        ? "\nNothing deleted. Add --apply to delete these."
        : "\nNothing to clean.",
    );
    return { deleted: 0, unused: unused.length };
  }

  // If the database says NOTHING is in use but files exist, something may be wrong.
  if (used.size === 0 && files.length > 0 && !force) {
    throw new Error(
      "No photo is in use but files exist. If that is right, add --even-if-none-used.",
    );
  }

  for (let i = 0; i < unused.length; i += 100) {
    const batch = unused.slice(i, i + 100).map((f) => f.name);
    const { error } = await supabase.storage.from(BUCKET).remove(batch);

    if (error) throw new Error(`Delete failed: ${error.message}`);
  }

  log(`\nDeleted ${unused.length} files.`);
  return { deleted: unused.length, unused: unused.length };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const slug = process.argv[2];

  if (!slug || slug.startsWith("--")) {
    console.error(
      "Usage: node --env-file=.env.local scripts/clean-unused-photos.mjs <slug> [--apply]",
    );
    process.exit(1);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
    { auth: { persistSession: false } },
  );

  run({
    supabase,
    slug,
    apply: process.argv.includes("--apply"),
    force: process.argv.includes("--even-if-none-used"),
  }).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
