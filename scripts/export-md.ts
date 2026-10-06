// Writes every topic as Markdown guides, one per explanation language, to build/md/.
// Run: npm run md
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { EXPLAIN, type Explain, loadTopics, ROOT } from "./lib.ts";
import { renderGuide } from "./markdown.ts";

const OUT = join(ROOT, "build/md");
await rm(OUT, { recursive: true, force: true });

const refs = await loadTopics();
let count = 0;
for (const ref of refs) {
  if (!ref.topic) continue;
  for (const explain of Object.keys(EXPLAIN) as Explain[]) {
    await Bun.write(join(OUT, ref.lang, ref.section.dir, ref.entry.slug, `guide.${explain}.md`), renderGuide(ref, explain, refs));
    count++;
  }
}
console.log(`wrote ${count} guides to build/md/`);
