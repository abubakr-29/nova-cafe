// Turns a restaurant name into a URL-safe slug, e.g. "White Cave Café" ->
// "white-cave-cafe". Used for the auto-suggested slug on signup — the
// person can still edit it before submitting.
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// Slugs become part of every customer-facing QR code URL
// (/menu/[restaurantSlug]/...), so keep this in sync with whatever the
// database's slug format constraint (if any) expects.
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) && slug.length >= 3;
}
