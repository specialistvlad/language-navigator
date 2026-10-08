// npm run check catches a table that does not hold what its type names.
import { describe, expect, test } from "bun:test";
import type { Row, Topic } from "../lib.ts";
import { problemsAfter, sampleBlocks } from "../sample-topic.ts";
import { checkText } from "./topic-text.ts";

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
// The sample's table as a paradigm: its rows lose their translations, which a paradigm leaves to its examples.
const paradigm = (t: Topic): void => {
  table(t).type = "paradigm";
  for (const r of table(t).rows) delete r.tr;
};

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
  test("a paradigm's rows or columns carry features: every row, or some column", () => {
    expect(
      problems((t) => {
        paradigm(t);
        table(t).rows.push({ level: "A1", features: { number: "sg" } });
      }).join("\n"),
    ).toContain("its rows or its columns carry features");
    expect(
      problems((t) => {
        paradigm(t);
      }).join("\n"),
    ).toContain("its rows or its columns carry features");
    expect(
      problems((t) => {
        paradigm(t);
        firstRow(t).features = { number: "sg" };
      }),
    ).toEqual([]);
  });
  test("slot columns belong to a paradigm, and their features name the sentence", () => {
    const slot =
      (type: string, features?: object) =>
      (t: Topic): void => {
        if (type === "paradigm") paradigm(t);
        else table(t).type = type;
        table(t).columns[0] = { key: "a", slot: "aux", ...(features && { features }) };
      };
    expect(problems(slot("usage", { interrogativity: "int" })).join("\n")).toContain("only a paradigm has slot columns");
    const sentence = "its features name one sentence";
    expect(problems(slot("paradigm")).join("\n")).toContain(sentence);
    expect(problems(slot("paradigm", { interrogativity: "int", polarity: "neg" })).join("\n")).toContain(sentence);
    expect(problems(slot("paradigm", { interrogativity: ["int", "decl"], polarity: "pos" })).join("\n")).toContain(sentence);
    expect(problems(slot("paradigm", [{ interrogativity: "int", polarity: "pos" }, { polarity: "neg" }])).join("\n")).toContain(sentence);
    for (const f of [
      { interrogativity: "int", polarity: "pos" },
      { interrogativity: "decl", polarity: "pos" },
      { interrogativity: "decl", polarity: "neg" },
    ]) {
      expect(problems(slot("paradigm", f))).toEqual([]);
    }
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
    expect(problems(wide).join("\n")).toContain('renders 5 columns in "en" (max 4)');
    const slots =
      (n: number) =>
      (t: Topic): void => {
        table(t).type = "paradigm";
        table(t).columns = Array.from({ length: n }, (_, k) => ({
          key: `s${String(k)}`,
          slot: "aux",
          features: { interrogativity: "int", polarity: "pos" },
        }));
        table(t).rows = [{ level: "A1" }];
      };
    expect(problems(slots(10))).toEqual([]);
    expect(problems(slots(11)).join("\n")).toContain('renders 11 columns in "en" (max 10)');
  });
  test("a paradigm stands alone: its examples carry the translations", () => {
    expect(
      problems((t) => {
        table(t).type = "paradigm";
        firstRow(t).features = { number: "sg" };
      }).join("\n"),
    ).toContain("translates a paradigm row");
  });
});
