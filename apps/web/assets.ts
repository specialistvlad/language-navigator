// Files every page loads: the stylesheet, the browser script and the level colours.
import { join } from "node:path";
import { LEVEL_INFO } from "../../scripts/lib.ts";
import { levelColoursCss } from "./level-colours.ts";

const APP = import.meta.dir;

// The stylesheet's parts in cascade order; each stays under 200 lines (npm run lint).
const STYLES = ["base", "topbar", "layout", "document", "tables", "media", "static-pages", "views", "rail", "index"];

// style.css: the parts of apps/web/styles/ joined in order.
export async function styleCss(): Promise<string> {
  const parts = await Promise.all(STYLES.map((name) => Bun.file(join(APP, "styles", `${name}.css`)).text()));
  return parts.join("\n");
}

// The browser script: client.ts and its modules bundled, types stripped.
export async function clientJs(): Promise<string> {
  const out = await Bun.build({ entrypoints: [join(APP, "client.ts")], target: "browser", format: "iife" });
  const [file] = out.outputs;
  if (!out.success || file === undefined) throw new Error(`client.ts does not build: ${out.logs.map((l) => l.message).join("\n")}`);
  return file.text();
}

// Everything about levels that depends on the scale in languages/levels.yaml: each level's colours,
// its hue from levels.yaml in each theme's tones (level-colours.ts), the level switcher tinted from
// the lowest level up to the chosen one, and the level filter. An element's data-level is its lowest level; it
// hides while the filter (data-level on <html>) sits below it. The rail keeps its entries and greys
// them out; a view whose content all sits above the filter shows its note instead. A badge keeps its
// range and fades the half above the filter (layout.css draws the faded half).
export function levelsCss(): string {
  const codes = LEVEL_INFO.map((l) => l.code);
  const switcher = codes.map(
    (code, i) =>
      `html[data-level="${code}"] .seg :is(${codes
        .slice(0, i + 1)
        .map((c) => `[data-set-level="${c}"]`)
        .join(", ")}) { background: var(--level-tint); }`,
  );
  const filter = codes.flatMap((code, i) => {
    const above = codes.slice(i + 1).map((c) => `[data-level="${c}"]`);
    if (above.length === 0) return [];
    const at = `html[data-level="${code}"]`;
    const list = `:is(${above.join(", ")})`;
    const needs = `:is(${codes
      .slice(i + 1)
      .map((c) => `[data-needs="${c}"]`)
      .join(", ")})`;
    const halves = `:is(${codes
      .slice(i + 1)
      .map((c) => `.lvl-${c}`)
      .join(", ")})`;
    return [
      `${at}:is([data-page="topic"], [data-page="track"]) ${list}:not(.toc > li) { display: none !important; }`,
      `${at}:is([data-page="topic"], [data-page="track"]) .lvl > .half${halves} { background: var(--beyond-bg); box-shadow: var(--beyond-edge); color: var(--beyond-ink); }`,
      `${at}[data-page="topic"] .toc > li${list} { opacity: 0.4; pointer-events: none; }`,
      `${at} .filter-empty${needs} { display: block; }`,
    ];
  });
  // Previous, next and Up next of the other levels (sequence.ts), at every level the top one included.
  const around = codes.map((code) => `html[data-level="${code}"] [data-at]:not([data-at~="${code}"]) { display: none !important; }`);
  return [levelColoursCss(), ...switcher, ...filter, ...around].join("\n") + "\n";
}
