// Keeps every stylesheet part under 200 lines, the same limit lint sets for TypeScript.
// Run: npm run lint
const MAX = 200;
let long = 0;
for await (const path of new Bun.Glob("apps/**/*.css").scan()) {
  const lines = (await Bun.file(path).text()).split("\n").length - 1;
  if (lines > MAX) {
    console.log(`  ✗ ${path}: ${lines} lines (max ${MAX})`);
    long++;
  }
}
process.exit(long > 0 ? 1 : 0);
