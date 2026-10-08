// Level ranges come from the leaves: blocks, sections, cheatsheets, topics and curriculum entries.
import { describe, expect, test } from "bun:test";
import type { Block, Topic, TopicRef } from "./lib.ts";
import { blockRange, contains, contentRange, join, parseRange, refRange, sectionRange, span, topicRange, upTo } from "./levels.ts";

const table: Block = {
  type: "usage",
  columns: [{ key: "form", label: "Form" }],
  rows: [
    { level: "A1", form: "a" },
    { level: "B1", form: "b", readers: ["en"] },
    { level: "A2", form: "c" },
  ],
};
const list: Block = { type: "list", items: [{ type: "rule", level: "B2", text: { en: "x" } }] };
const prose: Block = { type: "prose", level: "C1", text: { en: "only English" }, readers: ["en"] };

const topic = {
  cheatsheet: { content: [table] },
  sections: [
    { title: { en: "One" }, role: "own", content: [table, list] },
    { title: { en: "Two" }, role: "own", content: [prose] },
  ],
} as unknown as Topic;

describe("ranges", () => {
  test("span runs from the lowest to the highest level", () => {
    expect(span(["B1", "A1", "A2"])).toEqual({ from: "A1", to: "B1" });
    expect(span([])).toBeNull();
  });
  test("join covers every range and skips empty ones", () => {
    expect(join([{ from: "A2", to: "B1" }, null, { from: "A0", to: "A1" }])).toEqual({ from: "A0", to: "B1" });
    expect(join([null])).toBeNull();
  });
  test("parseRange reads curriculum ranges and refuses reversed or unknown ones", () => {
    expect(parseRange("A1-C2")).toEqual({ from: "A1", to: "C2" });
    expect(parseRange("B2")).toEqual({ from: "B2", to: "B2" });
    expect(parseRange("B1-A1")).toBeNull();
    expect(parseRange("D1")).toBeNull();
    expect(parseRange(undefined)).toBeNull();
  });
  test("contains compares along the scale", () => {
    expect(contains({ from: "A1", to: "B1" }, "A2")).toBe(true);
    expect(contains({ from: "A1", to: "B1" }, "B2")).toBe(false);
  });
});

describe("leaves decide every range above them", () => {
  test("a block covers the leaves its reader sees", () => {
    expect(blockRange(table)).toEqual({ from: "A1", to: "B1" });
    expect(blockRange(table, "en")).toEqual({ from: "A1", to: "B1" });
    expect(blockRange(prose, "en")).toEqual({ from: "C1", to: "C1" });
  });
  test("a section and a topic cover their blocks", () => {
    const [one, two] = topic.sections;
    if (!one || !two) throw new Error("fixture");
    expect(sectionRange(one)).toEqual({ from: "A1", to: "B2" });
    expect(sectionRange(two, "en")).toEqual({ from: "C1", to: "C1" });
    expect(contentRange(topic.cheatsheet.content, "en")).toEqual({ from: "A1", to: "B1" });
    expect(topicRange(topic)).toEqual({ from: "A1", to: "C1" });
    expect(topicRange(topic, "en")).toEqual({ from: "A1", to: "C1" });
  });
  test("a written topic takes its range from its data, a planned one from its entry", () => {
    const written = { topic, entry: { slug: "x", levels: "A0" } } as unknown as TopicRef;
    const planned = { topic: null, entry: { slug: "y", levels: "B1-C2" } } as unknown as TopicRef;
    expect(refRange(written)).toEqual({ from: "A1", to: "C1" });
    expect(refRange(planned)).toEqual({ from: "B1", to: "C2" });
  });
});

describe("upTo", () => {
  test("leaves above the level drop out, and so does a block left empty", () => {
    const cut = upTo([table, list, prose], "A2");
    expect(cut).toHaveLength(1);
    expect(cut[0]?.type === "usage" ? cut[0].rows.map((r) => r.level) : []).toEqual(["A1", "A2"]);
    expect(upTo([list], "B1")).toEqual([]);
  });
});

describe("every block type has leaves", () => {
  const rows = [
    { level: "A1" as const, a: "x" },
    { level: "B1" as const, a: "y" },
  ];
  const columns = [{ key: "a", label: "a" }];
  const blocks: Block[] = [
    { type: "paradigm", columns: [{ key: "a", label: "a", features: { number: "sg" } }], rows },
    { type: "comparison", columns, rows },
    { type: "inventory", set: "letters", columns, rows: rows.map((r, n) => ({ ...r, value: n === 0 ? "a" : "b" })) },
    {
      type: "errors",
      rows: [
        { level: "A1", wrong: "a", right: "b" },
        { level: "B1", wrong: "c", right: "d" },
      ],
    },
  ];
  test.each(blocks.map((b) => [b.type, b] as const))("%s: its rows", (_type, b) => {
    expect(blockRange(b)).toEqual({ from: "A1", to: "B1" });
    const [cut] = upTo([b], "A2");
    expect(cut && "rows" in cut ? cut.rows.map((r) => r.level) : []).toEqual(["A1"]);
    expect(upTo([b], "A0")).toEqual([]);
  });
  test("a block of no known type fails", () => {
    const odd = { type: "table", rows: [] } as unknown as Block;
    expect(() => blockRange(odd)).toThrow("Unknown block");
    expect(() => upTo([odd], "A1")).toThrow("Unknown block");
  });
});
