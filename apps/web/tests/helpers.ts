import { vi } from "vitest";

export function stubStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  });
  return data;
}

export function stubBrokenStorage() {
  const boom = () => {
    throw new Error("blocked");
  };
  vi.stubGlobal("localStorage", { getItem: boom, setItem: boom, removeItem: boom });
}
