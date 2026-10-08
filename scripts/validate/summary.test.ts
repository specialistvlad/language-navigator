// npm run check catches a summary out of its form, a localized value without a language in any place
// it serves, and a link to a topic outside the curriculum; and the topic template is a valid topic.
import { describe, expect, test } from "bun:test";
import Ajv from "ajv";
import { join } from "node:path";
import { CONTENT, type Localized, type Text, type Topic } from "../lib.ts";
import { problemsAfter, SAMPLE, sampleBlocks } from "../sample-topic.ts";
import { links } from "./notation.ts";
import { checkSummary } from "./topic-summary.ts";
import { checkText } from "./topic-text.ts";

const problems = (change: (t: Topic) => void, check = checkText): string[] => problemsAfter(change, check);
const none = {} as Localized;

describe("the summary", () => {
  const summary =
    (field: "lead" | "rule" | "ex", value: Text | Localized) =>
    (t: Topic): void => {
      Object.assign(t.summary, { [field]: value });
    };
  const of = (change: (t: Topic) => void): string => problems(change, checkSummary).join("\n");
  test("the sample passes", () => {
    expect(problems(() => undefined, checkSummary)).toEqual([]);
  });
  test("a lead of one sentence, at most 160 characters, with a capital and a full stop", () => {
    expect(of(summary("lead", { en: "Lead without a full stop" }))).toContain("is one sentence");
    expect(of(summary("lead", { en: `${"Long ".repeat(40)}lead.` }))).toContain("characters (max 160)");
    expect(of(summary("lead", { en: "lead." }))).toContain("starts with a lowercase letter");
    expect(of(summary("lead", { en: "One. Two." }))).toContain("is one sentence");
    expect(of(summary("rule", { en: "rule:" }))).toContain("summary.rule.en starts with a lowercase letter");
  });
  test("at most 50 words, about the language itself", () => {
    expect(of(summary("ex", "word ".repeat(60).trim()))).toContain("words (max 50)");
    expect(of(summary("rule", { en: "This page lists the forms:" }))).toContain("describes the page");
    expect(of(summary("rule", { en: "Rule. You need it to talk:" }))).toContain('opens a sentence with "You need"');
    expect(of(summary("rule", { en: "At A1 the forms are:" }))).toContain("names level A1");
  });
  test("a summary without its text in a language is left to the language check", () => {
    expect(of(summary("lead", {}))).toBe("");
  });
});

describe("links", () => {
  test("every link of a topic, wherever it sits", () => {
    const topic = structuredClone(SAMPLE);
    topic.summary.rule = { en: ["See ", { link: "To be", to: "en.verbs.to-be" }, ":"] };
    expect(links(topic)).toEqual(["en.verbs.to-be"]);
  });
});

describe("the topic template", () => {
  test("is a valid topic once its placeholders are filled", async () => {
    const raw = await Bun.file(join(CONTENT, "templates", "topic.yaml")).text();
    const filled = raw
      .replaceAll('"{A1}"', "A1")
      .replaceAll('"{A2}"', "A2")
      .replace('"{lang}.{section}.{topic}"', "en.section.topic")
      .replace('"{en.section.topic}"', "en.section.topic");
    const schema = (await Bun.file(join(CONTENT, "schema", "topic.schema.json")).json()) as object;
    const validate = new Ajv({ allErrors: true, strict: true }).compile(schema);
    const topic = Bun.YAML.parse(filled) as Topic;
    expect(validate(topic)).toBe(true);
    const out: string[] = [];
    checkText(topic, "template", (_w, m) => out.push(m));
    expect(out).toEqual([]);
  });
});

describe("every place a localized value sits carries each explanation language it serves", () => {
  // The sample's blocks (prose, list, comparison, errors), and the n-th entry of a list in one of them.
  type Fields = Record<string, unknown>;
  const block = (t: Topic, n: number): Fields => sampleBlocks(t)[n] as unknown as Fields;
  const entry = (t: Topic, n: number, list: string, k = 0): Fields => (block(t, n)[list] as Fields[])[k] ?? {};
  const places: [string, (t: Topic) => void][] = [
    ["summary.rule", (t) => void Object.assign(t.summary, { rule: none })],
    [
      "cheatsheet.content[0].columns.use",
      (t) => void Object.assign(t.cheatsheet.content[0] as object, { columns: [{ key: "use", label: none }] }),
    ],
    ["sections[0].content[0].tr", (t) => void Object.assign(block(t, 0), { tr: none })],
    ["sections[0].content[1].items[0].tr", (t) => void Object.assign(entry(t, 1, "items"), { tr: none })],
    ["sections[0].content[2].columns.b", (t) => void Object.assign(entry(t, 2, "columns", 1), { label: none })],
    ["sections[0].content[2].rows[0].tr", (t) => void Object.assign(entry(t, 2, "rows"), { tr: none })],
  ];
  test.each(places)("%s", (path, change) => {
    expect(problems(change)).toContain(`${path} has no "en" text`);
  });
  test("a section, a row or an error row for other readers needs only theirs", () => {
    expect(problems((t) => void Object.assign(t.sections[0] as object, { readers: [], title: none }))).toEqual([]);
    expect(problems((t) => void Object.assign(entry(t, 2, "rows"), { readers: [], tr: none }))).toEqual([]);
    expect(problems((t) => void Object.assign(entry(t, 3, "rows"), { speakers: [], rule: none }))).toEqual([]);
  });
});
