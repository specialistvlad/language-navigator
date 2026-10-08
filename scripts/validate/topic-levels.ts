// Levels inside a topic. Every leaf carries its level (topic.schema.json requires it); a section,
// the cheatsheet and the topic take their ranges from their leaves, the cheatsheet holds the levels
// the sections hold, and the curriculum entry of a written topic leaves its levels to the data.
import { type Block, LEVELS, type Topic, type TopicRef } from "../lib.ts";
import { leaves } from "../levels.ts";
import type { Report } from "./report.ts";

const levelsOf = (blocks: Block[]): Set<string> => new Set(blocks.flatMap((b) => leaves(b).map((l) => l.level)));

export function checkLevels(ref: TopicRef, topic: Topic, where: string, report: Report): void {
  if (ref.entry.levels !== undefined) {
    report("curriculum.yaml", `${ref.id}: a written topic takes its levels from its data; remove "levels"`);
  }
  // The cheatsheet sums up the whole topic: a row at every level the sections hold, each row at the
  // level of the facts it sums up.
  const sheet = levelsOf(topic.cheatsheet.content);
  const sections = levelsOf(topic.sections.flatMap((s) => s.content));
  for (const level of LEVELS) {
    if (sections.has(level) && !sheet.has(level)) report(where, `the cheatsheet has no row at ${level}, which the sections hold`);
    if (sheet.has(level) && !sections.has(level)) report(where, `the cheatsheet has a row at ${level}, which no section holds`);
  }
}
