import type { TablePosition, TableShape } from "@/types/table";

// The dashboard floor map is a 1.35:1 canvas and table positions are
// percentages of it. Two things on that canvas are fixed decorations: the
// "Window" strip along the top, and the "Counter" / "Kitchen" blocks in the
// bottom corners. New tables are auto-placed on a grid inside the free band
// between them.
const COLUMNS = 8;
const ROWS = 4;
const X_START = 6;
const X_STEP = 11;
const Y_START = 13;
const Y_STEP = 16;
const TILE_HEIGHT = 11;
const SLOT_COUNT = COLUMNS * ROWS;

function tileWidth(shape: TableShape) {
  return shape === "rectangle" ? 10 : 8;
}

function overlaps(a: TablePosition, b: TablePosition) {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  );
}

/**
 * Picks a floor-map position for each new table: the first grid slot that
 * doesn't overlap an existing (or already-planned) table. When the grid is
 * full, extra tables are stacked at a small offset and counted in `overflow`
 * so the UI can warn that the floor map is crowded.
 */
export function planTablePositions(
  existing: TablePosition[],
  shapes: TableShape[],
): { positions: TablePosition[]; overflow: number } {
  const taken = [...existing];
  const positions: TablePosition[] = [];
  let overflow = 0;

  for (const shape of shapes) {
    const width = tileWidth(shape);
    let placed: TablePosition | null = null;

    for (let i = 0; i < SLOT_COUNT && !placed; i++) {
      const candidate: TablePosition = {
        x: X_START + (i % COLUMNS) * X_STEP,
        y: Y_START + Math.floor(i / COLUMNS) * Y_STEP,
        width,
        height: TILE_HEIGHT,
      };

      if (!taken.some((t) => overlaps(candidate, t))) placed = candidate;
    }

    if (!placed) {
      const slot = overflow % SLOT_COUNT;
      const layer = Math.floor(overflow / SLOT_COUNT) + 1;
      const offset = Math.min(layer * 2, 4);

      placed = {
        x: X_START + (slot % COLUMNS) * X_STEP + offset,
        y: Y_START + Math.floor(slot / COLUMNS) * Y_STEP + offset,
        width,
        height: TILE_HEIGHT,
      };
      overflow += 1;
    }

    positions.push(placed);
    taken.push(placed);
  }

  return { positions, overflow };
}

/** "Table 1", "Table 2", ... continuing after the highest existing number. */
export function nextTableNames(existingNames: string[], count: number) {
  let max = 0;

  for (const name of existingNames) {
    const match = /^Table\s+(\d+)$/i.exec(name.trim());
    if (match) max = Math.max(max, Number(match[1]));
  }

  return Array.from({ length: count }, (_, i) => `Table ${max + i + 1}`);
}

/** Natural sort so "Table 2" comes before "Table 10". */
export function compareTableNames(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}
