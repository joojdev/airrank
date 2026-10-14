import { describe, expect, it } from "vitest";
import { detectLanguage } from "../src/i18n/detect";

describe("detectLanguage", () => {
  it.each(["pt", "pt-BR", "pt-PT", "PT-br"])("%s maps to pt-BR", (tag) => {
    expect(detectLanguage([tag], null)).toBe("pt-BR");
  });
  it("anything else maps to en", () => {
    expect(detectLanguage(["fr-FR"], null)).toBe("en");
    expect(detectLanguage([], null)).toBe("en");
  });
  it("stored choice wins", () => {
    expect(detectLanguage(["pt-BR"], "en")).toBe("en");
    expect(detectLanguage(["en-US"], "pt-BR")).toBe("pt-BR");
  });
});
