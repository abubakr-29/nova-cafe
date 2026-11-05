import { describe, expect, it } from "vitest";

import {
  compareTableNames,
  nextTableNames,
  planTablePositions,
} from "@/lib/table-layout";
import type { TablePosition } from "@/types/table";

function overlap(a: TablePosition, b: TablePosition) {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  );
}

describe("planTablePositions", () => {
  it("lays new tables out along the first row", () => {
    const { positions, overflow } = planTablePositions(
      [],
      ["square", "square", "square"],
    );

    expect(overflow).toBe(0);
    expect(positions.map((p) => [p.x, p.y])).toEqual([
      [6, 13],
      [17, 13],
      [28, 13],
    ]);
  });

  it("makes rectangular tables a little wider", () => {
    const { positions } = planTablePositions([], ["square", "rectangle"]);

    expect(positions[0].width).toBe(8);
    expect(positions[1].width).toBe(10);
  });

  it("skips spots already taken by existing tables", () => {
    const taken = { x: 6, y: 13, width: 8, height: 11 };
    const { positions } = planTablePositions([taken], ["round"]);

    expect(positions[0].x).toBe(17);
  });

  it("never overlaps tables on a full 32-seat grid", () => {
    const { positions, overflow } = planTablePositions(
      [],
      Array(32).fill("square"),
    );

    expect(overflow).toBe(0);
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        expect(overlap(positions[i], positions[j])).toBe(false);
      }
    }
  });

  it("counts tables that no longer fit instead of dropping them", () => {
    const { positions, overflow } = planTablePositions(
      [],
      Array(34).fill("square"),
    );

    expect(positions).toHaveLength(34);
    expect(overflow).toBe(2);
  });
});

describe("nextTableNames", () => {
  it("continues after the highest number, ignoring other names", () => {
    expect(
      nextTableNames(["Table 1", "Table 7", "Bar", "table  3"], 2),
    ).toEqual(["Table 8", "Table 9"]);
  });

  it("starts at Table 1 on an empty floor", () => {
    expect(nextTableNames([], 3)).toEqual(["Table 1", "Table 2", "Table 3"]);
  });
});

describe("compareTableNames", () => {
  it("sorts Table 2 before Table 10", () => {
    expect(["Table 10", "Table 2", "Table 1"].sort(compareTableNames)).toEqual([
      "Table 1",
      "Table 2",
      "Table 10",
    ]);
  });
});
