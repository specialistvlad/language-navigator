// Validates curriculum, concepts and every topic: JSON Schema first, then content rules.
// Run: npm run check
import Ajv, { type ValidateFunction } from "ajv";
import { join } from "node:path";
import {
  type Block,
  CONTENT,
  EXPLAIN,
  type Explain,
  type Item,
  LEVELS,
  type Localized,
  loadConcepts,
  loadCurriculum,
  loadTopics,
  readYaml,
  ROOT,
  type Topic,
} from "./lib.ts";
import { isLocalized, tableShape } from "./markdown.ts";

const ajv = new Ajv({ allErrors: true, strict: false });
const schema = async (name: string) => ajv.compile(await readYaml<object>(join(CONTENT, "schema", `${name}.schema.json`)));
const ALL: Explain[] = Object.keys(EXPLAIN) as Explain[];
const lv = (level: string) => LEVELS.indexOf(level as (typeof LEVELS)[number]);
const range = (r: string) => {
  const [from, to = from] = r.split("-");
  return LEVELS.filter((l) => lv(l) >= lv(from) && lv(l) <= lv(to));
};

let problems = 0;
const fail = (where: string, message: string) => {
  problems++;
  console.log(`  ✗ ${where}: ${message}`);
};

function schemaErrors(validate: ValidateFunction, data: unknown, where: string) {
  if (validate(data)) return;
  for (const e of validate.errors ?? []) fail(where, `${e.instancePath || "/"} ${e.message}`);
}

const curriculum = await loadCurriculum();
const concepts = await loadConcepts();
console.log("curriculum.yaml, concepts.yaml");
schemaErrors(await schema("curriculum"), curriculum, "curriculum.yaml");
schemaErrors(await schema("concepts"), concepts, "concepts.yaml");

const refs = await loadTopics(curriculum);
const ids = new Set(refs.map((r) => r.id));
const validateTopic = await schema("topic");

// Every topic.yaml on disk belongs to a curriculum entry.
const known = new Set(refs.map((r) => r.path));
for await (const path of new Bun.Glob("languages/*/*/*/topic.yaml").scan({ cwd: ROOT })) {
  if (!known.has(path)) fail(path, "not listed in curriculum.yaml");
}

for (const ref of refs) {
  if (!ref.topic) continue;
  const where = ref.path;
  console.log(where);
  const topic: Topic = ref.topic;
  const before = problems;
  schemaErrors(validateTopic, topic, where);
  if (problems > before) continue;

  if (topic.id !== ref.id) fail(where, `id ${topic.id} differs from path id ${ref.id}`);
  if (topic.lang !== ref.lang) fail(where, `lang ${topic.lang} differs from folder ${ref.lang}`);
  const planned = range(ref.entry.levels);
  if (planned.join() !== [...topic.levels].sort((a, b) => lv(a) - lv(b)).join()) {
    fail(where, `levels [${topic.levels}] differ from curriculum ${ref.entry.levels}`);
  }
  for (const level of topic.levels) {
    if (!topic.essentials.some((e) => e.level === level)) fail(where, `no essentials for ${level}`);
  }
  for (const e of [...topic.essentials, ...(topic.reminders ?? [])]) {
    if (!topic.levels.includes(e.level)) fail(where, `essentials / reminder level ${e.level} outside topic levels`);
  }
  for (const section of topic.sections) {
    for (const level of range(section.level)) {
      if (!topic.levels.includes(level)) fail(where, `section "${section.title.en ?? section.title.es}" level ${section.level} outside topic levels`);
    }
  }
  for (const c of topic.concepts) if (!(c in concepts)) fail(where, `concept "${c}" missing from concepts.yaml`);
  for (const id of topic.related) if (!ids.has(id)) fail(where, `related "${id}" missing from curriculum.yaml`);
  for (const [, id] of JSON.stringify(topic).matchAll(/\]\(id:([^)]+)\)/g)) {
    if (!ids.has(id)) fail(where, `link id:${id} missing from curriculum.yaml`);
  }

  // Every localized text carries each explanation language that renders it.
  const need = (value: unknown, path: string, langs: Explain[]) => {
    if (!value || typeof value !== "object" || !isLocalized(value)) return;
    for (const l of langs) if (!(value as Localized)[l]) fail(where, `${path} has no "${l}" text`);
  };
  const scope = (el: { for?: Explain[] }, langs: Explain[]) => (el.for ? langs.filter((l) => el.for!.includes(l)) : langs);
  const item = (it: Item, path: string, langs: Explain[]) => {
    if (typeof it === "string") return;
    if (isLocalized(it)) return need(it, path, langs);
    const inner = scope(it, langs);
    need(it.text, `${path}.text`, inner);
  };
  const blocks = (list: Block[], path: string, langs: Explain[]) =>
    list.forEach((block, i) => {
      const p = `${path}[${i}]`;
      const inner = scope(block, langs);
      if (block.type === "text") need(block.text, `${p}.text`, inner);
      if (block.type === "bullets") block.items.forEach((it, k) => item(it, `${p}.items[${k}]`, inner));
      if (block.type === "table") {
        block.columns.forEach((c) => need(c.label, `${p}.columns.${c.key}`, scope(c, inner)));
        block.rows.forEach((row, k) => {
          const rowLangs = scope(row, inner);
          for (const c of block.columns) need(row[c.key], `${p}.rows[${k}].${c.key}`, scope(c, rowLangs));
        });
        for (const l of inner) {
          const shape = tableShape(block, l, topic.lang);
          if (shape.width > 4) fail(where, `${p} renders ${shape.width} columns in "${l}" (max 4)`);
        }
      }
      if (block.type === "errors") block.rows.forEach((row, k) => need(row.rule, `${p}.rows[${k}].rule`, scope(row, inner)));
    });

  need(topic.title, "title", ALL);
  need(topic.summary, "summary", ALL);
  topic.sections.forEach((s, i) => {
    const langs = scope(s, ALL);
    need(s.title, `sections[${i}].title`, langs);
    blocks(s.content, `sections[${i}].content`, langs);
  });
  topic.essentials.forEach((e, i) => {
    e.parts?.forEach((part, k) => {
      need(part.title, `essentials[${i}].parts[${k}].title`, ALL);
      blocks(part.content, `essentials[${i}].parts[${k}].content`, ALL);
    });
    if (e.content) blocks(e.content, `essentials[${i}].content`, ALL);
  });
  topic.reminders?.forEach((r, i) => r.items.forEach((it, k) => item(it, `reminders[${i}].items[${k}]`, ALL)));
}

console.log(`problems: ${problems}`);
process.exit(problems ? 1 : 0);
