// Level ranges come from the leaves: blocks, sections, cheatsheets, topics and curriculum entries.
import { describe, expect, test } from "bun:test";
import type { Block, Topic, TopicRef } from "./lib.ts";
import { blockRange, contains, contentRange, inside, join, parseRange, refRange, sectionRange, span, topicRange, upTo } from "./levels.ts";

const table: Block = {
  type: "table",
  columns: [{ key: "form", label: "Form" }],
  rows: [
    { level: "A1", form: "a" },
    { level: "B1", form: "b", for: ["en"] },
    { level: "A2", form: "c" },
  ],
};
const bullets: Block = { type: "bullets", items: [{ level: "B2", text: "x" }] };
const text: Block = { type: "text", level: "C1", text: { en: "only English" }, for: ["en"] };

const topic = {
  cheatsheet: { content: [table] },
  sections: [
    { title: { en: "One" }, content: [table, bullets] },
    { title: { en: "Two" }, content: [text] },
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
  test("contains and inside compare along the scale", () => {
    expect(contains({ from: "A1", to: "B1" }, "A2")).toBe(true);
    expect(contains({ from: "A1", to: "B1" }, "B2")).toBe(false);
    expect(inside({ from: "A2", to: "B1" }, { from: "A1", to: "C1" })).toBe(true);
    expect(inside({ from: "A0", to: "B1" }, { from: "A1", to: "C1" })).toBe(false);
  });
});

describe("leaves decide every range above them", () => {
  test("a block covers the leaves its reader sees", () => {
    expect(blockRange(table)).toEqual({ from: "A1", to: "B1" });
    expect(blockRange(table, "en")).toEqual({ from: "A1", to: "B1" });
    expect(blockRange(text, "en")).toEqual({ from: "C1", to: "C1" });
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
    const cut = upTo([table, bullets, text], "A2");
    expect(cut).toHaveLength(1);
    expect(cut[0]?.type === "table" ? cut[0].rows.map((r) => r.level) : []).toEqual(["A1", "A2"]);
    expect(upTo([bullets], "B1")).toEqual([]);
  });
});
