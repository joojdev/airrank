import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/styles/tokens.css", import.meta.url), "utf8");
const darkStart = css.indexOf("@media");
const parse = (block: string): Record<string, string> =>
  Object.fromEntries(
    [...block.matchAll(/--(fj-[\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1]!, m[2]!]),
  );

const light = parse(css.slice(0, darkStart));
const dark = { ...light, ...parse(css.slice(darkStart)) };

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
const ratio = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

// [text token, background token]
const PAIRS: [string, string][] = [
  ["fj-ink", "fj-paper"],
  ["fj-ink", "fj-card"],
  ["fj-ink-soft", "fj-paper"],
  ["fj-ink-soft", "fj-card"],
  ["fj-sage-text", "fj-paper"],
  ["fj-amber-text", "fj-paper"],
  ["fj-on-accent", "fj-amber"],
  ["fj-paper", "fj-sage-text"],
];

let failed = false;
for (const [name, theme] of [
  ["light", light],
  ["dark", dark],
] as const) {
  for (const [fg, bg] of PAIRS) {
    const value = ratio(theme[fg]!, theme[bg]!);
    const ok = value >= 4.5;
    if (!ok) failed = true;
    console.log(`${ok ? "ok  " : "FAIL"} ${name} ${fg} on ${bg}: ${value.toFixed(2)}`);
  }
}
if (failed) process.exit(1);
