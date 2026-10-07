// Files every page loads besides style.css: the browser script and the level colours.
import { join } from "node:path";
import { LEVEL_INFO } from "../../scripts/lib.ts";

const APP = import.meta.dir;

// The browser script: client.ts with its types stripped.
export async function clientJs(): Promise<string> {
  const source = await Bun.file(join(APP, "client.ts")).text();
  return new Bun.Transpiler({ loader: "ts", target: "browser" }).transformSync(source);
}

// Level colours from languages/levels.yaml in both themes, with each level's badge and chip.
export function levelsCss(): string {
  const vars = (theme: "light" | "dark"): string => LEVEL_INFO.map((l) => `--lvl-${l.code}: ${l.color[theme]};`).join(" ");
  const rules = LEVEL_INFO.map(
    ({ code }) =>
      `.lvl-${code} { background: var(--lvl-${code}); }\n.c-${code} { background: color-mix(in srgb, var(--lvl-${code}) 16%, transparent); color: var(--lvl-${code}); }`,
  );
  return (
    [
      `:root { ${vars("light")} }`,
      `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ${vars("dark")} } }`,
      `:root[data-theme="dark"] { ${vars("dark")} }`,
      ...rules,
    ].join("\n") + "\n"
  );
}
