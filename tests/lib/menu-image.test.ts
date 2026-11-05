import { describe, expect, it } from "vitest";

import { isMenuStorageUrl, photoPaths, thumbnailUrl } from "@/lib/menu-image";

const base =
  "https://abc.supabase.co/storage/v1/object/public/menu-images/rest-1";

describe("thumbnailUrl", () => {
  it("points a stored photo at its small version", () => {
    expect(thumbnailUrl(`${base}/p1.webp`)).toBe(`${base}/p1-thumb.webp`);
    expect(thumbnailUrl(`${base}/p1.jpg`)).toBe(`${base}/p1-thumb.jpg`);
  });

  it("keeps a cache-busting query string", () => {
    expect(thumbnailUrl(`${base}/p1.webp?v=3`)).toBe(
      `${base}/p1-thumb.webp?v=3`,
    );
  });

  it("does not change a photo that is already a thumbnail", () => {
    expect(thumbnailUrl(`${base}/p1-thumb.webp`)).toBe(`${base}/p1-thumb.webp`);
  });

  it("leaves photos from anywhere else alone", () => {
    expect(thumbnailUrl("https://example.com/pic.webp")).toBe(
      "https://example.com/pic.webp",
    );
    expect(isMenuStorageUrl("https://example.com/pic.webp")).toBe(false);
    expect(isMenuStorageUrl(`${base}/p1.webp`)).toBe(true);
  });
});

describe("photoPaths", () => {
  it("keeps every photo inside the café's own folder", () => {
    expect(photoPaths("rest-1", "p1", "webp")).toEqual({
      full: "rest-1/p1.webp",
      thumb: "rest-1/p1-thumb.webp",
    });
  });
});
