// Level colours: each level's hue from levels.yaml in each theme's tones. A tone is a lightness and a
// saturation: the share of the most chroma sRGB holds at that lightness and hue, up to a cap. Every
// colour lies inside sRGB, so browsers show it as written, and every hue takes the same share of its
// own range, so the levels look equally clean.
import { LEVEL_INFO } from "../../scripts/lib.ts";

interface Tone {
  l: number;
  s: number;
  cap: number;
}
// ink writes a level's code; tint lies behind it in a badge and behind the levels the switcher shows;
// strong lies behind the chosen level in the switcher.
type Tones = Record<"ink" | "tint" | "strong", Tone>;
export type Oklch = [l: number, c: number, h: number];

export const TONES: Record<"light" | "dark", Tones> = {
  light: { ink: { l: 0.5, s: 0.9, cap: 0.17 }, tint: { l: 0.945, s: 0.85, cap: 0.065 }, strong: { l: 0.87, s: 0.8, cap: 0.11 } },
  dark: { ink: { l: 0.81, s: 0.9, cap: 0.15 }, tint: { l: 0.29, s: 0.7, cap: 0.065 }, strong: { l: 0.4, s: 0.7, cap: 0.09 } },
};

// An OKLCH colour as linear sRGB channels; inside sRGB each lies in 0..1.
export function linearRgb([l, c, h]: Oklch): number[] {
  const [a, b] = [c * Math.cos((h * Math.PI) / 180), c * Math.sin((h * Math.PI) / 180)];
  const lms = [l + 0.3963377774 * a + 0.2158037573 * b, l - 0.1055613458 * a - 0.0638541728 * b, l - 0.0894841775 * a - 1.291485548 * b];
  const [L = 0, M = 0, S = 0] = lms.map((v) => v ** 3);
  return [
    4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S,
    -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S,
    -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S,
  ];
}

export const inSrgb = (colour: Oklch): boolean => linearRgb(colour).every((v) => v >= 0 && v <= 1);

// The most chroma sRGB holds at a lightness and hue, to three decimals, rounded down.
function maxChroma(l: number, h: number): number {
  let [lo, hi] = [0, 0.4];
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (inSrgb([l, mid, h])) lo = mid;
    else hi = mid;
  }
  return Math.floor(lo * 1000) / 1000;
}

const inTone = (t: Tone, h: number): Oklch => [t.l, Math.floor(Math.min(t.cap, t.s * maxChroma(t.l, h)) * 1000) / 1000, h];

// Every level's ink, tint and strong colour in a theme.
export function levelColours(theme: keyof typeof TONES): Record<string, Record<keyof Tones, Oklch>> {
  const tones = TONES[theme];
  return Object.fromEntries(
    LEVEL_INFO.map((l) => [
      l.code,
      { ink: inTone(tones.ink, l.hue), tint: inTone(tones.tint, l.hue), strong: inTone(tones.strong, l.hue) },
    ]),
  );
}

const css = ([l, c, h]: Oklch): string => `oklch(${+(l * 100).toFixed(2)}% ${c} ${h})`;

// The theme blocks of base.css, each setting every level's colours, and the rule that hands a
// level's colours to its elements: --lvl (ink), --level-tint and --level-strong.
export function levelColoursCss(): string {
  const vars = (theme: keyof typeof TONES): string =>
    Object.entries(levelColours(theme))
      .flatMap(([code, tones]) => Object.entries(tones).map(([tone, colour]) => `--lvl-${code}-${tone}: ${css(colour)};`))
      .join(" ");
  const uses = LEVEL_INFO.map(
    ({ code }) =>
      `.lvl-${code} { --lvl: var(--lvl-${code}-ink); --level-tint: var(--lvl-${code}-tint); --level-strong: var(--lvl-${code}-strong); }`,
  );
  return [
    `:root { ${vars("light")} }`,
    `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ${vars("dark")} } }`,
    `:root[data-theme="dark"] { ${vars("dark")} }`,
    ...uses,
  ].join("\n");
}
