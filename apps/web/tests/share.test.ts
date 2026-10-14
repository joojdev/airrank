import { describe, expect, it, vi } from "vitest";
import { buildShareText, share } from "../src/share/share";

const sel = { category: "airport", metric: "passengers", difficulty: "hard" } as const;

describe("share text", () => {
  it("builds both languages", () => {
    expect(buildShareText(12, sel, "pt-BR", "https://x.test")).toBe(
      "Fiz 12 pontos em Aeroporto / Passageiros por ano / Difícil. Você consegue mais? https://x.test",
    );
    expect(buildShareText(12, sel, "en", "https://x.test")).toBe(
      "I scored 12 in Airport / Passengers per year / Hard. Can you beat it? https://x.test",
    );
  });
});

describe("share fallback chain", () => {
  it("uses native share first", async () => {
    const nav = { share: vi.fn().mockResolvedValue(undefined), clipboard: { writeText: vi.fn() } };
    expect(await share("t", nav as never)).toBe("shared");
    expect(nav.clipboard.writeText).not.toHaveBeenCalled();
  });
  it("falls back to the clipboard", async () => {
    const nav = { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } };
    expect(await share("t", nav as never)).toBe("copied");
  });
  it("falls back to the clipboard when native share fails", async () => {
    const nav = {
      share: vi.fn().mockRejectedValue(new Error("x")),
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    };
    expect(await share("t", nav as never)).toBe("copied");
  });
  it("treats a closed share sheet as cancelled, without touching the clipboard", async () => {
    const nav = {
      share: vi.fn().mockRejectedValue(new DOMException("closed", "AbortError")),
      clipboard: { writeText: vi.fn() },
    };
    expect(await share("t", nav as never)).toBe("cancelled");
    expect(nav.clipboard.writeText).not.toHaveBeenCalled();
  });
  it("reports failure when nothing works", async () => {
    expect(await share("t", {} as never)).toBe("failed");
    expect(await share("t", undefined)).toBe("failed");
  });
});
