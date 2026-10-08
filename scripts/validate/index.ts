// Validates configuration, curriculum, concepts and every topic: JSON Schema first, then content rules.
// npm run check prints the problems; the dev server reports them on every rebuild.
import Ajv, { type ValidateFunction } from "ajv";
import { join } from "node:path";
import { type Concepts, CONTENT, loadConcepts, loadCurriculum, loadTopics, readYaml, ROOT, type TopicRef } from "../lib.ts";
import { parseRange } from "../levels.ts";
import { checkConfig } from "./config.ts";
import { checkPath } from "./curriculum.ts";
import { type Problem, type Report, schemaErrors } from "./report.ts";
import { checkTopic } from "./topic.ts";

export type { Problem } from "./report.ts";

const ajv = new Ajv({ allErrors: true, strict: true });
const compiled = new Map<string, ValidateFunction>();
async function schema(name: string): Promise<ValidateFunction> {
  const known = compiled.get(name);
  if (known) return known;
  const compiledSchema = ajv.compile(await readYaml<object>(join(CONTENT, "schema", `${name}.schema.json`)));
  compiled.set(name, compiledSchema);
  return compiledSchema;
}

export async function validate(): Promise<Problem[]> {
  const problems: Problem[] = [];
  const report = (where: string, message: string): void => {
    problems.push({ where, message });
  };

  await checkConfig(schema, report);

  const curriculum = await loadCurriculum();
  if (!curriculum.languages.some((l) => l.enabled)) report("curriculum.yaml", "no language is enabled");
  const concepts = await loadConcepts();
  const curriculumValid = schemaErrors(await schema("curriculum"), curriculum, "curriculum.yaml", report);
  schemaErrors(await schema("concepts"), concepts, "concepts.yaml", report);

  const refs = await loadTopics(curriculum);
  const ids = new Set(refs.map((r) => r.id));
  // Every topic.yaml on disk belongs to a curriculum entry.
  const known = new Set(refs.map((r) => r.path));
  for await (const path of new Bun.Glob("languages/*/*/*/topic.yaml").scan({ cwd: ROOT })) {
    if (!known.has(path)) report(path, "not listed in curriculum.yaml");
  }

  for (const ref of refs) await checkRef(ref, ids, concepts, report);
  if (curriculumValid) for (const language of curriculum.languages) checkPath(language, refs, report);
  return problems;
}

// One curriculum entry: a planned topic names the levels it will cover; a written topic matches its
// schema first, then the content rules.
export async function checkRef(ref: TopicRef, ids: Set<string>, concepts: Concepts, report: Report): Promise<void> {
  if (!ref.topic) {
    if (parseRange(ref.entry.levels) === null) report("curriculum.yaml", `${ref.id}: a planned topic needs "levels", such as A1 or A1-B1`);
    return;
  }
  if (schemaErrors(await schema("topic"), ref.topic, ref.path, report)) checkTopic(ref, ref.topic, ids, concepts, report);
}
