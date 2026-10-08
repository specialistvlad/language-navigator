// The built site for the tests: one build per test process, shared by every test file it runs, into
// TEST_SITE_DIR or build/test/site/. scripts/verify.ts gives each process it runs a folder of its own
// in build/test/.
import { join } from "node:path";
import { parseHTML } from "linkedom";
import { ROOT } from "../../scripts/lib.ts";
import { build } from "./build.ts";

export const SITE_DIR = process.env["TEST_SITE_DIR"] ?? join(ROOT, "build/test/site");
let built: Promise<string[]> | undefined;

// Builds the site once and lists its pages, as paths under SITE_DIR.
export function testSite(): Promise<string[]> {
  built ??= (async () => {
    await build({ outDir: SITE_DIR, dev: false, siteUrl: "http://127.0.0.1" });
    return Array.fromAsync(new Bun.Glob("**/*.html").scan({ cwd: SITE_DIR }));
  })();
  return built;
}

const parsed = new Map<string, Promise<Document>>();
// A built page, parsed once per process: the tests read it and leave it as it is.
export function readPage(path: string): Promise<Document> {
  let doc = parsed.get(path);
  if (doc === undefined) {
    doc = testSite().then(async () => parseHTML(await Bun.file(join(SITE_DIR, path)).text()).document);
    parsed.set(path, doc);
  }
  return doc;
}
