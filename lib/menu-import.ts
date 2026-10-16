// Menu import: turns a pasted spreadsheet / CSV into validated menu rows.
//
// Pure functions only (no React, no Supabase), so the rules are easy to test.
//
// Columns (header names are case-insensitive, order doesn't matter, unknown
// columns are ignored):
//
//   category     required   e.g. "Starters"
//   name         required   e.g. "French Fries"
//   price        required unless sizes is given
//   sizes        optional   "Half=250|Full=350"  (full prices; we store extras)
//   diet         optional   veg / non-veg / egg
//   description  optional
//   image_url    optional   https://...
//   available    optional   yes / no  (default yes)

export type Diet = "veg" | "non_veg" | "egg";

export type ParsedSize = {
  name: string;
  /** What the database stores: the extra on top of the item's base price. */
  extra: number;
  /** What a customer actually pays for this size (used for previews). */
  total: number;
};

export type ImportRow = {
  /** Spreadsheet row number (the header is row 1). */
  line: number;
  category: string;
  name: string;
  /** Base price. When sizes exist this is the cheapest size. */
  price: number;
  sizes: ParsedSize[];
  diet: Diet | null;
  description: string | null;
  imageUrl: string | null;
  available: boolean;
};

export type RowIssue = { line: number; message: string };

export type ParseResult = {
  /** Valid rows, in sheet order, with in-file duplicates removed. */
  rows: ImportRow[];
  /** Rows that can't be imported. */
  errors: RowIssue[];
  /** Rows that import fine but had something adjusted or ignored. */
  warnings: RowIssue[];
  /** Set when the whole file can't be read (e.g. a required column is missing). */
  fatal: string | null;
};

export const MAX_IMPORT_ROWS = 1000;

const MAX_CATEGORY = 80;
const MAX_NAME = 150;
const MAX_SIZE_NAME = 60;
const MAX_SIZES = 10;
const MAX_DESCRIPTION = 500;
const MAX_IMAGE_URL = 500;

export const MENU_IMPORT_TEMPLATE = [
  "category,name,price,sizes,diet,description,image_url,available",
  "Starters,French Fries,200,,veg,,,yes",
  "Starters,Chicken Nuggets,300,,non-veg,,,yes",
  "Main Course,Fried Rice,,Half=250|Full=350,,,,yes",
  "Drinks,Cold Coffee,200,,veg,Chilled and creamy,,yes",
].join("\n");

// ---- delimited text ------------------------------------------------------

function detectDelimiter(text: string) {
  const firstLine =
    text.split(/\r?\n/).find((line) => line.trim() !== "") ?? "";

  let tabs = 0;
  let commas = 0;
  let semicolons = 0;
  let inQuotes = false;

  for (const ch of firstLine) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && ch === "\t") tabs++;
    else if (!inQuotes && ch === ",") commas++;
    else if (!inQuotes && ch === ";") semicolons++;
  }

  // Pasting cells from Google Sheets / Excel gives tab-separated text.
  if (tabs > 0 && tabs >= commas) return "\t";
  if (semicolons > commas) return ";";
  return ",";
}

/** Minimal RFC-4180 style parser: quotes, "" escapes, CRLF, quoted newlines. */
export function parseDelimited(text: string, delimiter: string): string[][] {
  const source = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];

  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < source.length; i++) {
    const ch = source[i];

    if (inQuotes) {
      if (ch === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"' && field === "") {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && source[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

// ---- headers -------------------------------------------------------------

type Column =
  | "category"
  | "name"
  | "price"
  | "sizes"
  | "diet"
  | "description"
  | "image"
  | "available";

const HEADER_ALIASES: Record<string, Column> = {
  category: "category",
  categoryname: "category",
  section: "category",
  group: "category",

  name: "name",
  item: "name",
  itemname: "name",
  dish: "name",
  dishname: "name",

  price: "price",
  rate: "price",
  cost: "price",
  mrp: "price",
  amount: "price",

  sizes: "sizes",
  size: "sizes",
  variants: "sizes",
  portion: "sizes",
  portions: "sizes",

  diet: "diet",
  veg: "diet",
  type: "diet",
  foodtype: "diet",
  vegnonveg: "diet",
  vegornonveg: "diet",

  description: "description",
  desc: "description",
  details: "description",

  image: "image",
  imageurl: "image",
  photo: "image",
  photourl: "image",
  picture: "image",

  available: "available",
  availability: "available",
  instock: "available",
};

const normaliseHeader = (h: string) =>
  h.toLowerCase().replace(/[^a-z0-9]/g, "");

// ---- cell parsers --------------------------------------------------------

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

function parseMoney(raw: string): number | null {
  const cleaned = raw
    .toLowerCase()
    .replace(/₹|rs\.?|inr|\/-/g, "")
    .replace(/[,\s]/g, "");

  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;

  const value = Number(cleaned);
  return value <= 1_000_000 ? value : null;
}

function parseSizes(
  raw: string,
): { sizes: { name: string; total: number }[] } | { error: string } {
  const parts = raw
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);

  const sizes: { name: string; total: number }[] = [];

  for (const part of parts) {
    const match =
      part.match(/^(.+?)\s*[=:]\s*(.+)$/) ?? part.match(/^(.+?)\s+(\S+)$/);

    const name = match ? clean(match[1]) : "";
    const total = match ? parseMoney(match[2]) : null;

    if (!name || total === null) {
      return {
        error: `Couldn't read the size "${part}". Write sizes like Half=250|Full=350.`,
      };
    }

    if (name.length > MAX_SIZE_NAME) {
      return { error: `The size name "${name}" is too long.` };
    }

    sizes.push({ name, total });
  }

  return { sizes };
}

function parseDiet(raw: string): Diet | null | "invalid" {
  const v = raw.toLowerCase().replace(/[^a-z]/g, "");

  if (v === "") return null;
  if (["veg", "vegetarian", "v", "green"].includes(v)) return "veg";
  if (["nonveg", "nonvegetarian", "nv", "red"].includes(v)) return "non_veg";
  if (["egg", "eggetarian", "e", "containsegg"].includes(v)) return "egg";

  return "invalid";
}

function parseAvailable(raw: string): boolean | "invalid" {
  const v = raw.toLowerCase().trim();

  if (v === "") return true;
  if (["yes", "y", "true", "1", "available", "in stock"].includes(v)) {
    return true;
  }
  if (
    [
      "no",
      "n",
      "false",
      "0",
      "sold out",
      "unavailable",
      "out of stock",
    ].includes(v)
  ) {
    return false;
  }

  return "invalid";
}

/** Same key the importer uses to decide "this item is already on the menu". */
export function menuItemKey(category: string, name: string) {
  return `${clean(category).toLowerCase()}\u0000${clean(name).toLowerCase()}`;
}

// ---- main ----------------------------------------------------------------

export function parseMenuImport(text: string): ParseResult {
  const result: ParseResult = {
    rows: [],
    errors: [],
    warnings: [],
    fatal: null,
  };

  if (!text.trim()) {
    result.fatal = "There's nothing to import yet.";
    return result;
  }

  const table = parseDelimited(text, detectDelimiter(text));
  const [headerRow, ...dataRows] = table;

  const columns = new Map<Column, number>();
  headerRow.forEach((header, index) => {
    const column = HEADER_ALIASES[normaliseHeader(header)];
    if (column && !columns.has(column)) columns.set(column, index);
  });

  const missing: string[] = [];
  if (!columns.has("category")) missing.push("category");
  if (!columns.has("name")) missing.push("name");
  if (!columns.has("price") && !columns.has("sizes")) {
    missing.push("price (or sizes)");
  }

  if (missing.length > 0) {
    const found = headerRow.map((h) => h.trim()).filter(Boolean);
    result.fatal =
      `The first row must be a header row with these columns: ${missing.join(", ")}. ` +
      (found.length > 0
        ? `I found: ${found.join(", ")}.`
        : "I couldn't find any column names.");
    return result;
  }

  const cell = (row: string[], column: Column) => {
    const index = columns.get(column);
    return index === undefined ? "" : (row[index] ?? "");
  };

  const filledRows = dataRows
    .map((row, i) => ({ row, line: i + 2 }))
    .filter(({ row }) => row.some((value) => value.trim() !== ""));

  if (filledRows.length === 0) {
    result.fatal = "I found the header row but no menu items below it.";
    return result;
  }

  if (filledRows.length > MAX_IMPORT_ROWS) {
    result.fatal = `That's ${filledRows.length} rows. The limit is ${MAX_IMPORT_ROWS} per import, so please split the file.`;
    return result;
  }

  const seen = new Set<string>();

  for (const { row, line } of filledRows) {
    const error = (message: string) => result.errors.push({ line, message });
    const warn = (message: string) => result.warnings.push({ line, message });

    const category = clean(cell(row, "category"));
    // People often paste numbered lists ("1. French Fries"); drop the number.
    const name = clean(cell(row, "name")).replace(/^\d{1,3}[.)]\s+/, "");

    if (!category) {
      error("The category is blank. Fill it in on every row.");
      continue;
    }
    if (!name) {
      error("The item name is blank.");
      continue;
    }
    if (category.length > MAX_CATEGORY) {
      error(`The category name is too long (max ${MAX_CATEGORY} characters).`);
      continue;
    }
    if (name.length > MAX_NAME) {
      error(`The item name is too long (max ${MAX_NAME} characters).`);
      continue;
    }

    // ---- price / sizes ----
    const priceText = cell(row, "price").trim();
    const sizesText = cell(row, "sizes").trim();

    let price: number | null = priceText ? parseMoney(priceText) : null;
    let sizes: ParsedSize[] = [];

    if (priceText && price === null) {
      error(`"${priceText}" isn't a valid price.`);
      continue;
    }

    if (sizesText) {
      const parsed = parseSizes(sizesText);

      if ("error" in parsed) {
        error(parsed.error);
        continue;
      }

      if (parsed.sizes.length > MAX_SIZES) {
        error(`Too many sizes (max ${MAX_SIZES}).`);
        continue;
      }

      const names = parsed.sizes.map((s) => s.name.toLowerCase());
      if (new Set(names).size !== names.length) {
        error("Two sizes have the same name.");
        continue;
      }

      if (parsed.sizes.length === 1) {
        warn(
          `Only one size was listed, so it's treated as a plain price of ₹${parsed.sizes[0].total}.`,
        );
        price = parsed.sizes[0].total;
      } else if (parsed.sizes.length > 1) {
        const base = Math.min(...parsed.sizes.map((s) => s.total));

        if (price !== null && price !== base) {
          warn(
            `The price column (₹${price}) was ignored because sizes were given. The cheapest size (₹${base}) is the base price.`,
          );
        }

        price = base;
        sizes = parsed.sizes.map((s) => ({
          name: s.name,
          total: s.total,
          extra: Math.round((s.total - base) * 100) / 100,
        }));
      }
    }

    if (price === null) {
      error("Add a price, or a sizes column such as Half=250|Full=350.");
      continue;
    }

    // ---- optional columns ----
    const diet = parseDiet(cell(row, "diet"));
    if (diet === "invalid") {
      warn(
        `"${cell(row, "diet").trim()}" isn't a diet value (use veg, non-veg or egg), so no dot was set.`,
      );
    }

    const available = parseAvailable(cell(row, "available"));
    if (available === "invalid") {
      warn(
        `"${cell(row, "available").trim()}" isn't yes or no, so the item was marked available.`,
      );
    }

    let description: string | null = cell(row, "description").trim() || null;
    if (description && description.length > MAX_DESCRIPTION) {
      description = description.slice(0, MAX_DESCRIPTION);
      warn(`The description was shortened to ${MAX_DESCRIPTION} characters.`);
    }

    let imageUrl: string | null = cell(row, "image").trim() || null;
    if (
      imageUrl &&
      (!/^https?:\/\/\S+$/i.test(imageUrl) || imageUrl.length > MAX_IMAGE_URL)
    ) {
      warn("The image link isn't a valid web address, so it was ignored.");
      imageUrl = null;
    }

    // ---- duplicates inside the file ----
    const key = menuItemKey(category, name);
    if (seen.has(key)) {
      warn(
        `"${name}" appears more than once in ${category}. Only the first is used.`,
      );
      continue;
    }
    seen.add(key);

    result.rows.push({
      line,
      category,
      name,
      price,
      sizes,
      diet: diet === "invalid" ? null : diet,
      description,
      imageUrl,
      available: available === "invalid" ? true : available,
    });
  }

  return result;
}

/** The JSON the import_menu database function expects. */
export function toRpcPayload(rows: ImportRow[]) {
  return rows.map((row) => ({
    category: row.category,
    name: row.name,
    description: row.description,
    price: row.price,
    image_url: row.imageUrl,
    available: row.available,
    diet: row.diet,
    sizes: row.sizes.map((s) => ({ name: s.name, price: s.extra })),
  }));
}
