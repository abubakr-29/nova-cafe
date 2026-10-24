// Matches photo file names to menu items, so an owner can drop in 40 photos
// named after the dishes ("margherita-pizza.jpg") and we pair them up.

export type MatchableItem = { id: string; name: string };

export type PhotoMatch = {
  /** Set only when exactly one item matches the file name. */
  itemId: string | null;
  /** Items worth offering when there's no single exact match (best first). */
  suggestions: string[];
  kind: "exact" | "ambiguous" | "suggested" | "none";
};

/** "Chicken BBQ  Pizza" -> "chicken bbq pizza"; "&" reads as "and". */
export function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** "Fried_Rice (2).JPG" -> "fried rice". */
export function nameFromFilename(filename: string) {
  const base = filename
    .replace(/^.*[\\/]/, "")
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/\s*\(\d+\)\s*$/, "")
    .replace(/[-_ ]+copy\s*\d*$/i, "");

  return normalizeName(base);
}

const squash = (normalised: string) => normalised.replace(/ /g, "");

function similarity(a: Set<string>, b: Set<string>) {
  if (a.size === 0 || b.size === 0) return 0;

  let shared = 0;
  for (const token of a) if (b.has(token)) shared++;

  return shared / (a.size + b.size - shared);
}

export function matchPhoto(
  filename: string,
  items: MatchableItem[],
): PhotoMatch {
  const wanted = nameFromFilename(filename);
  const key = squash(wanted);

  if (!key) return { itemId: null, suggestions: [], kind: "none" };

  const exact = items.filter(
    (item) => squash(normalizeName(item.name)) === key,
  );

  if (exact.length === 1) {
    return { itemId: exact[0].id, suggestions: [], kind: "exact" };
  }

  if (exact.length > 1) {
    return {
      itemId: null,
      suggestions: exact.map((item) => item.id),
      kind: "ambiguous",
    };
  }

  const tokens = new Set(wanted.split(" "));

  const suggestions = items
    .map((item) => ({
      id: item.id,
      score: similarity(tokens, new Set(normalizeName(item.name).split(" "))),
    }))
    .filter((entry) => entry.score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((entry) => entry.id);

  return {
    itemId: null,
    suggestions,
    kind: suggestions.length > 0 ? "suggested" : "none",
  };
}
