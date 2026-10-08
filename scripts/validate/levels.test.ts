// npm run check catches every level problem: a leaf without a level, a stored range, a curriculum
// entry that disagrees with the data, a cheatsheet whose levels differ from its sections', and a
// scale out of step.
import { describe, expect, test } from "bun:test";
import { loadConcepts, loadTopics, type Topic, type TopicRef } from "../lib.ts";
import { checkRef, type Problem, validate } from "./index.ts";

const refs = await loadTopics();
const concepts = await loadConcepts();
const ids = new Set(refs.map((r) => r.id));
const found = refs.find((r) => r.id === "en.tenses.simple-tenses");
if (!found?.topic) throw new Error("en.tenses.simple-tenses has no data");
const original: TopicRef = found;
const source: Topic = found.topic;

// The problems of one curriculum entry, after changing a copy of simple-tenses or its entry.
async function problemsOf(change: (topic: Record<string, unknown>, ref: TopicRef) => void, planned = false): Promise<Problem[]> {
  const topic = structuredClone(source) as unknown as Record<string, unknown>;
  const ref: TopicRef = { ...original, entry: { ...original.entry }, topic: planned ? null : (topic as unknown as Topic) };
  change(topic, ref);
  const problems: Problem[] = [];
  await checkRef(ref, ids, concepts, (where, message) => problems.push({ where, message }));
  return problems;
}
const messages = (problems: Problem[]): string => problems.map((p) => p.message).join("\n");
const content = (topic: Record<string, unknown>, section: number): Record<string, unknown>[] =>
  (topic["sections"] as { content: Record<string, unknown>[] }[])[section]?.content ?? [];
// The rows of the first table in the sections.
function rows(topic: Record<string, unknown>): Record<string, unknown>[] {
  const blocks = (topic["sections"] as { content: { type: string; columns?: unknown[]; rows?: Record<string, unknown>[] }[] }[]).flatMap(
    (s) => s.content,
  );
  return blocks.find((b) => b.columns !== undefined)?.rows ?? [];
}

describe("the data as it is", () => {
  test("validates with no problems", async () => {
    expect(await validate()).toEqual([]);
  });
  test("an unchanged topic passes", async () => {
    expect(await problemsOf(() => undefined)).toEqual([]);
  });
});

describe("every leaf carries its level", () => {
  test("a table row without a level", async () => {
    const problems = await problemsOf((t) => {
      delete rows(t)[0]?.["level"];
    });
    expect(messages(problems)).toContain("must have required property 'level'");
  });
  test("a list item without a level", async () => {
    const problems = await problemsOf((t) => {
      content(t, 0).push({ type: "list", items: [{ type: "rule", text: { en: "No level." } }] });
    });
    expect(messages(problems)).toContain("must have required property 'level'");
  });
  test("a paragraph without a level", async () => {
    const problems = await problemsOf((t) => {
      content(t, 0).push({ type: "prose", text: { en: "No level." } });
    });
    expect(messages(problems)).toContain("must have required property 'level'");
  });
  test("an errors row without a level", async () => {
    const problems = await problemsOf((t) => {
      content(t, 0).push({ type: "errors", rows: [{ wrong: "a", right: "b" }] });
    });
    expect(messages(problems)).toContain("must have required property 'level'");
  });
  test("a level outside the scale", async () => {
    const problems = await problemsOf((t) => {
      const [row] = rows(t);
      if (row) row["level"] = "D1";
    });
    expect(messages(problems)).toContain("must be equal to one of the allowed values");
  });
  test("the new levels B2, C1 and C2 are allowed", async () => {
    const problems = await problemsOf((t) => {
      const levels = ["B2", "C1", "C2"];
      for (const [n, row] of rows(t).slice(0, 3).entries()) row["level"] = levels[n];
      // The cheatsheet sums them up too.
      const sheet = (t["cheatsheet"] as { content: { rows: Record<string, unknown>[] }[] }).content[0]?.rows ?? [];
      for (const [n, row] of sheet.slice(0, 3).entries()) row["level"] = levels[n];
    });
    expect(problems).toEqual([]);
  });
});

describe("nothing above a leaf stores a level", () => {
  test("a section range", async () => {
    const problems = await problemsOf((t) => {
      (t["sections"] as Record<string, unknown>[])[0] = { ...(t["sections"] as Record<string, unknown>[])[0], level: "A1" };
    });
    expect(messages(problems)).toContain("must NOT have additional properties");
  });
  test("a cheatsheet range", async () => {
    const problems = await problemsOf((t) => {
      (t["cheatsheet"] as Record<string, unknown>)["level"] = "A1-A2";
    });
    expect(messages(problems)).toContain("must NOT have additional properties");
  });
  test("a topic's levels", async () => {
    const problems = await problemsOf((t) => {
      t["levels"] = ["A1", "A2"];
    });
    expect(messages(problems)).toContain("must NOT have additional properties");
  });
  test("a written topic's curriculum entry", async () => {
    const problems = await problemsOf((_t, ref) => {
      ref.entry.levels = "A1-A2";
    });
    expect(messages(problems)).toContain("takes its levels from its data");
  });
});

describe("ranges agree", () => {
  // The rows of the cheatsheet's table.
  const sheetRows = (t: Record<string, unknown>): Record<string, unknown>[] =>
    (t["cheatsheet"] as { content: { rows: Record<string, unknown>[] }[] }).content[0]?.rows ?? [];
  test("a cheatsheet row at a level no section holds", async () => {
    const problems = await problemsOf((t) => {
      const [row] = sheetRows(t);
      if (row) row["level"] = "C2";
    });
    expect(messages(problems)).toContain("the cheatsheet has a row at C2, which no section holds");
  });
  test("a cheatsheet without a row at a level the sections hold", async () => {
    const problems = await problemsOf((t) => {
      for (const row of sheetRows(t)) row["level"] = "A1";
    });
    expect(messages(problems)).toContain("the cheatsheet has no row at A2, which the sections hold");
  });
  test("a planned topic names its levels", async () => {
    const missing = await problemsOf((_t, ref) => {
      delete ref.entry.levels;
    }, true);
    expect(messages(missing)).toContain("a planned topic needs");
    const reversed = await problemsOf((_t, ref) => {
      ref.entry.levels = "B1-A1";
    }, true);
    expect(messages(reversed)).toContain("a planned topic needs");
  });
});
