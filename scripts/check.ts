// Validates configuration, curriculum, concepts and every topic (scripts/validate/) and lists the problems.
// Run: npm run check
import { validate } from "./validate/index.ts";

const problems = await validate();
for (const p of problems) console.log(`  ✗ ${p.where}: ${p.message}`);
console.log(`problems: ${problems.length}`);
process.exit(problems.length > 0 ? 1 : 0);
