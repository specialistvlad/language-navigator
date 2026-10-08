// The study path of a language being learned: per level, lowest first, the topics to study at that
// level. A step is a topic at a level, so a written topic has a step at every level its leaves hold
// and at no other; a planned topic's steps sit inside its planned range.
import { type CurriculumLanguage, type Level, lv, type TopicRef } from "../lib.ts";
import { contains, refRange, topicLevels } from "../levels.ts";
import type { Report } from "./report.ts";

const held = (ref: TopicRef): Level[] => (ref.topic ? topicLevels(ref.topic) : []);

export function checkPath(language: CurriculumLanguage, refs: TopicRef[], report: Report): void {
  const own = new Map(refs.filter((r) => r.lang === language.code).map((r) => [r.id, r]));
  const levels = Object.keys(language.path);
  if (levels.some((l, i) => i > 0 && lv(l) <= lv(levels[i - 1] ?? null))) {
    report("curriculum.yaml", `path ${language.code}: levels run lowest first (${levels.join(", ")})`);
  }
  const steps = new Set<string>();
  for (const [level, ids] of Object.entries(language.path)) {
    for (const id of ids) {
      const ref = own.get(id);
      if (!ref) {
        report("curriculum.yaml", `path ${level}: ${id} is not a topic of this language in the curriculum`);
        continue;
      }
      steps.add(`${level} ${id}`);
      const range = refRange(ref);
      const holds = ref.topic ? held(ref).includes(level as Level) : range !== null && contains(range, level);
      if (!holds) report("curriculum.yaml", `path ${level}: ${id} has nothing at ${level}`);
    }
  }
  for (const ref of own.values()) {
    for (const level of held(ref)) {
      if (!steps.has(`${level} ${ref.id}`)) report("curriculum.yaml", `path ${level}: ${ref.id} holds ${level} and needs a step there`);
    }
  }
}
