// Runs the checks of npm test, npm run e2e or npm run verify side by side, each in a process of its
// own, and prints each check as it ends with its time; a check that fails prints its output, and the
// run exits 1. Every test process builds the site into a folder of its own, build/test/<check>/.
// Run: npm test | npm run e2e | npm run verify
import { join } from "node:path";
import { ROOT } from "./lib.ts";

type Check = [name: string, command: string[]];
const test = (file: string): Check => [file, ["bun", "test", `./${file}`]];

// The unit test files that check every built page run in a process of their own, which parses each
// page once; the rest run in another, with coverage.
const PAGE_CHECKS = ["apps/web/path.test.ts", "apps/web/levels.test.ts", "apps/web/marks.test.ts", "apps/web/credits.test.ts"];
const UNIT: Check[] = [
  ["unit tests, with coverage", ["bun", "test", "--coverage", ...PAGE_CHECKS.map((file) => `--path-ignore-patterns=${file}`)]],
  ["checks on every built page", ["bun", "test", ...PAGE_CHECKS.map((file) => `./${file}`)]],
];
const E2E: Check[] = (await Array.fromAsync(new Bun.Glob("apps/web/*.e2e.ts").scan({ cwd: ROOT }))).sort().map(test);
const GROUPS: Record<string, Check[]> = {
  test: UNIT,
  e2e: E2E,
  verify: [
    ["generated types", ["bun", "run", "scripts/schema-types.ts", "--check"]],
    ...["typecheck", "lint", "format:check", "check"].map((script): Check => [script, ["bun", "run", script]]),
    ...UNIT,
    ...E2E,
  ],
};

const group = process.argv[2] ?? "";
const checks = GROUPS[group];
if (checks === undefined) {
  console.error(`usage: bun run scripts/verify.ts ${Object.keys(GROUPS).join(" | ")}`);
  process.exit(2);
}

const start = performance.now();
const seconds = (since: number): string => `${((performance.now() - since) / 1000).toFixed(1)}s`;
const results = await Promise.all(
  checks.map(async ([name, command]) => {
    const began = performance.now();
    const env: Record<string, string | undefined> = {
      ...process.env,
      TEST_SITE_DIR: join(ROOT, "build", "test", name.replace(/\W+/g, "-")),
      ...(process.stdout.isTTY && { FORCE_COLOR: "1" }),
    };
    const child = Bun.spawn(command, { cwd: ROOT, env, stdout: "pipe", stderr: "pipe" });
    const [out, err, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
    const output = out + err;
    // eslint-disable-next-line no-control-regex -- the colours a check prints
    const passed = /(\d+) pass\b/.exec(output.replace(/\x1b\[[0-9;]*m/g, ""))?.[1];
    console.log(`  ${code === 0 ? "✓" : "✗"} ${name}${passed === undefined ? "" : `, ${passed} tests`}  ${seconds(began)}`);
    if (code !== 0) console.log(output);
    return code === 0;
  }),
);
const failed = results.filter((ok) => !ok).length;
console.log(`${checks.length - failed} of ${checks.length} checks passed in ${seconds(start)}`);
process.exit(failed > 0 ? 1 : 0);
