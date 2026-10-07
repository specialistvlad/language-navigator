// Generates TypeScript types from the JSON Schemas into scripts/generated/: schemas and code share one source.
// Run: npm run types   (--check fails when a generated file is out of date)
import { compileFromFile } from "json-schema-to-typescript";
import { join } from "node:path";

const SCHEMAS = join(import.meta.dir, "..", "languages", "schema");
const OUT = join(import.meta.dir, "generated");
const NAMES = ["site", "levels", "interface", "curriculum", "concepts", "topic"];
const check = process.argv.includes("--check");

let stale = 0;
for (const name of NAMES) {
  const types = await compileFromFile(join(SCHEMAS, `${name}.schema.json`), {
    bannerComment: `// Generated from languages/schema/${name}.schema.json by npm run types. Edit the schema, then regenerate.`,
    cwd: SCHEMAS,
    additionalProperties: false,
    ignoreMinAndMaxItems: true,
    style: { printWidth: 140 },
  });
  const file = join(OUT, `${name}.ts`);
  if (!check) {
    await Bun.write(file, types);
    continue;
  }
  const current = (await Bun.file(file).exists()) ? await Bun.file(file).text() : "";
  if (current !== types) {
    console.log(`  ✗ scripts/generated/${name}.ts is out of date: run npm run types`);
    stale++;
  }
}
console.log(check ? `stale type files: ${stale}` : `generated ${NAMES.length} type files into scripts/generated/`);
process.exit(stale > 0 ? 1 : 0);
