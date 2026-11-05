import { describe, expect, it } from "vitest";

import {
  MAX_IMPORT_ROWS,
  MENU_IMPORT_TEMPLATE,
  menuItemKey,
  parseDelimited,
  parseMenuImport,
  toRpcPayload,
} from "@/lib/menu-import";

describe("parseDelimited", () => {
  it("handles quotes, commas inside quotes and doubled quotes", () => {
    expect(parseDelimited('a,"b,c",d\n1,"he said ""hi""",3', ",")).toEqual([
      ["a", "b,c", "d"],
      ["1", 'he said "hi"', "3"],
    ]);
  });
});

describe("parseMenuImport", () => {
  it("reads a simple menu and cleans the price", () => {
    const result = parseMenuImport(
      "Category,Item,Price\nCoffee,Cappuccino,120\nCoffee,Flat white,₹135\n",
    );

    expect(result.fatal).toBeNull();
    expect(result.errors).toEqual([]);
    expect(result.rows.map((r) => [r.category, r.name, r.price])).toEqual([
      ["Coffee", "Cappuccino", 120],
      ["Coffee", "Flat white", 135],
    ]);
  });

  it("works with the downloadable template as it is", () => {
    const result = parseMenuImport(MENU_IMPORT_TEMPLATE);

    expect(result.fatal).toBeNull();
    expect(result.errors).toEqual([]);
    expect(result.rows.length).toBeGreaterThan(2);
  });

  it("understands sizes: the lowest total is the base price, others are extras", () => {
    const [row] = parseMenuImport(
      "category,name,price,sizes,diet\nPizza,Margherita,,Half=250|Full=350,veg\n",
    ).rows;

    expect(row.price).toBe(250);
    expect(row.diet).toBe("veg");
    expect(row.sizes).toEqual([
      { name: "Half", total: 250, extra: 0 },
      { name: "Full", total: 350, extra: 100 },
    ]);
  });

  it("accepts semicolon and tab separated files (Excel in some regions)", () => {
    for (const text of [
      "category;name;price\nSoup;Tomato;90\n",
      "category\tname\tprice\nSoup\tTomato\t90\n",
    ]) {
      const result = parseMenuImport(text);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toMatchObject({
        category: "Soup",
        name: "Tomato",
        price: 90,
      });
    }
  });

  it("reports each bad row with its line number and skips it", () => {
    const result = parseMenuImport(
      "category,name,price\n,Tea,50\nCoffee,,50\nCoffee,Tea,abc\nCoffee,Mocha,150\n",
    );

    expect(result.rows.map((r) => r.name)).toEqual(["Mocha"]);
    expect(result.errors.map((e) => e.line)).toEqual([2, 3, 4]);
  });

  it("warns about duplicates and keeps only the first", () => {
    const result = parseMenuImport(
      "category,name,price\nCoffee,Mocha,150\nCoffee,Mocha,160\n",
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].price).toBe(150);
    expect(result.warnings[0].message).toMatch(/more than once/);
  });

  it("warns about an unknown diet word and sets no dot", () => {
    const result = parseMenuImport(
      "category,name,price,diet\nSoup,Tomato,90,vegan\n",
    );

    expect(result.rows[0].diet).toBeNull();
    expect(result.warnings[0].message).toMatch(/vegan/);
  });

  it("stops with a plain message when the header or the rows are missing", () => {
    expect(parseMenuImport("foo,bar\n1,2\n").fatal).toMatch(/header row/);
    expect(parseMenuImport("category,name,price\n").fatal).toMatch(
      /no menu items/,
    );
  });
});

describe("import size limit", () => {
  it("is 1000 rows, as the error message promises", () => {
    expect(MAX_IMPORT_ROWS).toBe(1000);
  });

  const build = (count: number) =>
    [
      "category,name,price",
      ...Array.from({ length: count }, (_, i) => `Cat,Item ${i},10`),
    ].join("\n");

  it("accepts a menu right at the limit", () => {
    const result = parseMenuImport(build(MAX_IMPORT_ROWS));

    expect(result.fatal).toBeNull();
    expect(result.rows).toHaveLength(MAX_IMPORT_ROWS);
  });

  it("refuses a menu over the limit instead of importing part of it", () => {
    const result = parseMenuImport(build(MAX_IMPORT_ROWS + 1));

    expect(result.fatal).not.toBeNull();
    expect(result.rows).toEqual([]);
  });
});

describe("menuItemKey", () => {
  it("ignores case and extra spaces when comparing items", () => {
    expect(menuItemKey("Coffee", "Flat  White")).toBe(
      menuItemKey(" coffee ", "flat white"),
    );
  });
});

describe("toRpcPayload", () => {
  it("sends sizes as extras over the base price, ready for the database", () => {
    const rows = parseMenuImport(
      "category,name,price,sizes\nPizza,Margherita,,Half=250|Full=350\n",
    ).rows;

    expect(toRpcPayload(rows)).toEqual([
      {
        category: "Pizza",
        name: "Margherita",
        description: null,
        price: 250,
        image_url: null,
        available: true,
        diet: null,
        sizes: [
          { name: "Half", price: 0 },
          { name: "Full", price: 100 },
        ],
      },
    ]);
  });
});
