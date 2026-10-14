import { describe, expect, it } from "vitest";
import { ItemSchema } from "../src";
import { makeItem } from "./helpers";

describe("ItemSchema", () => {
  it("accepts a valid item", () => {
    expect(ItemSchema.safeParse(makeItem("gru", 100)).success).toBe(true);
  });
  it("rejects a photo without author", () => {
    const item = makeItem("gru", 100);
    expect(ItemSchema.safeParse({ ...item, photo: { ...item.photo, author: "" } }).success).toBe(
      false,
    );
    const rest: Record<string, unknown> = { ...item.photo };
    delete rest.author;
    expect(ItemSchema.safeParse({ ...item, photo: rest }).success).toBe(false);
  });
  it("rejects a metric from another category", () => {
    const item = { ...makeItem("gru", 100), metrics: { destinations: 10 } };
    expect(ItemSchema.safeParse(item).success).toBe(false);
  });
  it("rejects non-positive values and empty metrics", () => {
    expect(ItemSchema.safeParse({ ...makeItem("a", 1), metrics: { passengers: 0 } }).success).toBe(
      false,
    );
    expect(ItemSchema.safeParse({ ...makeItem("a", 1), metrics: {} }).success).toBe(false);
  });
  it("rejects a fractional year", () => {
    const item = { ...makeItem("a", 1, "founded"), metrics: { founded: 1950.5 } };
    expect(ItemSchema.safeParse(item).success).toBe(false);
  });
});
