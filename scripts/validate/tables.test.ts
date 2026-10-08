// npm run check catches a table that does not hold what its type names, a summary out of its form, a
// link to a topic outside the curriculum; and the topic template is a valid topic.
import { describe, expect, test } from "bun:test";
import Ajv from "ajv";
import { join } from "node:path";
import { CONTENT, type Localized, type Row, type Text, type Topic } from "../lib.ts";
import { problemsAfter, SAMPLE, sampleBlocks } from "../sample-topic.ts";
import { checkSummary } from "./topic-summary.ts";
import { checkText, links } from "./topic-text.ts";

const problems = (change: (t: Topic) => void, check = checkText): string[] => problemsAfter(change, check);

// The sample's comparison table, open to any change of its type or shape.
interface AnyTable {
  type: string;
  set?: string;
  columns: Record<string, unknown>[];
  rows: Row[];
}
const table = (t: Topic): AnyTable => sampleBlocks(t)[2] as unknown as AnyTable;
const firstRow = (t: Topic): Row => table(t).rows[0] ?? { level: "A1" };

describe("a table holds what its type names", () => {
  test("each column key once, and each row key a column", () => {
    expect(
      problems((t) => {
        table(t).columns.push({ key: "a", label: "again" });
      }).join("\n"),
    ).toContain('two columns with key "a"');
    expect(
      problems((t) => {
        firstRow(t)["c"] = "x";
      }).join("\n"),
    ).toContain('has "c", which no column holds');
  });
  test("a paradigm's rows or columns carry features", () => {
    expect(
      problems((t) => {
        table(t).type = "paradigm";
      }).join("\n"),
    ).toContain("its rows or its columns carry features");
    expect(
      problems((t) => {
        table(t).type = "paradigm";
        firstRow(t).features = { number: "sg" };
      }),
    ).toEqual([]);
  });
  test("slot columns belong to a paradigm, and their features name the sentence", () => {
    const slot =
      (type: string, features?: object) =>
      (t: Topic): void => {
        table(t).type = type;
        table(t).columns[0] = { key: "a", slot: "aux", ...(features && { features }) };
      };
    expect(problems(slot("usage", { interrogativity: "int" })).join("\n")).toContain("only a paradigm has slot columns");
    expect(problems(slot("paradigm")).join("\n")).toContain("its features name its sentence");
    expect(problems(slot("paradigm", { interrogativity: "int" }))).toEqual([]);
  });
  test("an inventory gives every member its value", () => {
    const members: Record<string, [unknown, unknown]> = {
      letters: ["a", "A"],
      sounds: ["p", ""],
      numbers: [7, "7"],
      ordinals: [3, 0],
      days: [1, 8],
      months: ["--07", "--13"],
      years: ["1999", 1999],
      dates: ["--07-03", "--07"],
      times: ["07:05", "7:05"],
    };
    for (const [set, [good, bad]] of Object.entries(members)) {
      const inventory =
        (value: unknown) =>
        (t: Topic): void => {
          Object.assign(table(t), { type: "inventory", set });
          firstRow(t).value = value as string;
        };
      expect(problems(inventory(good))).toEqual([]);
      expect(problems(inventory(bad)).join("\n")).toContain(`no ${set} value`);
    }
  });
  test("a table fits four columns, a slot paradigm ten", () => {
    const wide = (t: Topic): void => {
      table(t).columns = ["a", "b", "c", "d", "e"].map((key) => ({ key, label: key }));
    };
    expect(problems(wide).join("\n")).toContain("renders 5 columns");
  });
});

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
  test("a lead of one sentence, at most 160 characters, with a capital", () => {
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
