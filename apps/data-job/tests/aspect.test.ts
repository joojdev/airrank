import { describe, expect, it } from "vitest";
import { parsePhotos, type CommonsResponse } from "../src/sources/commons";

const page = (title: string, width: number, height: number) => ({
  title: `File:${title}`,
  imageinfo: [
    {
      url: "https://x/y.jpg",
      width,
      height,
      descriptionurl: "https://commons.wikimedia.org/wiki/File:x",
      extmetadata: {
        Artist: { value: "Someone" },
        LicenseShortName: { value: "CC BY 4.0" },
      },
    },
  ],
});
const response = (...pages: ReturnType<typeof page>[]): CommonsResponse => ({
  query: { pages: Object.fromEntries(pages.map((p, i) => [String(i), p])) },
});

describe("photo aspect ratio", () => {
  const photos = parsePhotos(
    ["wide.jpg", "tall.jpg", "ok.jpg"],
    response(
      page("wide.jpg", 4800, 1200),
      page("tall.jpg", 1000, 2300),
      page("ok.jpg", 1600, 1067),
    ),
  );
  it("rejects panoramas and tall shots", () => {
    expect(photos.get("wide.jpg")).toEqual({ ok: false, reason: "bad-aspect" });
    expect(photos.get("tall.jpg")).toEqual({ ok: false, reason: "bad-aspect" });
  });
  it("keeps ordinary photos", () => expect(photos.get("ok.jpg")?.ok).toBe(true));
});
