// Files every page loads: the stylesheet, the browser script and the level colours.
import { join } from "node:path";
import { LEVEL_INFO } from "../../scripts/lib.ts";

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

// Everything about levels that depends on the scale in languages/levels.yaml: each level's colour,
// its hue from levels.yaml in the theme's tone (--level-l, --level-c in base.css), the level switcher
// tinted from the lowest level up to the chosen one, and the level filter. An element's data-level is its lowest level; it
// hides while the filter (data-level on <html>) sits below it. The rail keeps its entries and greys
// them out; a view whose content all sits above the filter shows its note instead.
export function levelsCss(): string {
  const codes = LEVEL_INFO.map((l) => l.code);
  const colours = LEVEL_INFO.map((l) => `.lvl-${l.code} { --lvl: oklch(var(--level-l) var(--level-c) ${l.hue}); }`);
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
    return [
      `${at}:is([data-page="topic"], [data-page="track"]) ${list}:not(.toc > li) { display: none !important; }`,
      `${at}[data-page="topic"] .toc > li${list} { opacity: 0.4; pointer-events: none; }`,
      `${at} .filter-empty${needs} { display: block; }`,
    ];
  });
  return [...colours, ...switcher, ...filter].join("\n") + "\n";
}
