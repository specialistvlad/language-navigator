// The built site for the tests: one build into build/test/, shared by every test file of a run.
import { join } from "node:path";
import { ROOT } from "../../scripts/lib.ts";
import { build } from "./build.ts";

export const SITE_DIR = join(ROOT, "build/test");
let built: Promise<string[]> | undefined;

// Builds the site once and lists its pages, as paths under SITE_DIR.
export function testSite(): Promise<string[]> {
  built ??= (async () => {
    await build({ outDir: SITE_DIR, dev: false, siteUrl: "http://127.0.0.1" });
    return Array.fromAsync(new Bun.Glob("**/*.html").scan({ cwd: SITE_DIR }));
  })();
  return built;
}
