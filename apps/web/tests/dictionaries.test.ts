import { describe, expect, it } from "vitest";
import { en } from "../src/i18n/en";
import { ptBR } from "../src/i18n/pt-BR";

describe("dictionaries", () => {
  it("have exactly the same keys", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(ptBR).sort());
  });
  it("have no empty strings", () => {
    for (const v of [...Object.values(en), ...Object.values(ptBR)])
      expect(v.length).toBeGreaterThan(0);
  });
});
