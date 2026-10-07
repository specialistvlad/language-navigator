// Level colours: every level's ink, tint and strong colour lies inside sRGB in both themes, keeps its
// level's hue, and levels.css sets them in each theme's block.
import { expect, test } from "bun:test";
import { LEVEL_INFO } from "../../scripts/lib.ts";
import { inSrgb, levelColours, levelColoursCss, TONES } from "./level-colours.ts";

const themes = Object.keys(TONES) as (keyof typeof TONES)[];

test.each(themes)("every level colour of the %s theme lies inside sRGB in its level's hue", (theme) => {
  const colours = levelColours(theme);
  for (const { code, hue } of LEVEL_INFO) {
    for (const [tone, colour] of Object.entries(colours[code] ?? {})) {
      expect({ code, tone, inside: inSrgb(colour), hue: colour[2] }).toEqual({ code, tone, inside: true, hue });
    }
  }
});

test("levels.css sets every level's colours in the light theme and in the dark theme", () => {
  const blocks = levelColoursCss().split("\n");
  const light = blocks.find((b) => b.startsWith(":root {")) ?? "";
  const dark = blocks.filter((b) => b.includes('data-theme="light"') || b.startsWith(':root[data-theme="dark"]'));
  expect(dark).toHaveLength(2);
  for (const [theme, texts] of [
    ["light", [light]],
    ["dark", dark],
  ] as const) {
    for (const [code, tones] of Object.entries(levelColours(theme))) {
      for (const [tone, [l, c, h]] of Object.entries(tones)) {
        for (const text of texts) expect(text).toContain(`--lvl-${code}-${tone}: oklch(${+(l * 100).toFixed(2)}% ${c} ${h});`);
      }
    }
  }
});
