// One topic against the curriculum and the other data files.
import type { Concepts, Topic, TopicRef } from "../lib.ts";
import type { Report } from "./report.ts";
import { checkLevels } from "./topic-levels.ts";
import { checkSummary } from "./topic-summary.ts";
import { checkLanguages } from "./topic-text.ts";

export function checkTopic(ref: TopicRef, topic: Topic, ids: Set<string>, concepts: Concepts, report: Report): void {
  const where = ref.path;
  if (topic.id !== ref.id) report(where, `id ${topic.id} differs from path id ${ref.id}`);
  if (topic.lang !== ref.lang) report(where, `lang ${topic.lang} differs from folder ${ref.lang}`);
  checkLevels(ref, topic, where, report);

  for (const c of topic.concepts) if (!(c in concepts)) report(where, `concept "${c}" missing from concepts.yaml`);
  for (const id of topic.related) if (!ids.has(id)) report(where, `related "${id}" missing from curriculum.yaml`);
  for (const [, id] of JSON.stringify(topic).matchAll(/\]\(id:([^)]+)\)/g)) {
    if (id !== undefined && !ids.has(id)) report(where, `link id:${id} missing from curriculum.yaml`);
  }
  checkLanguages(topic, where, report);
  checkSummary(topic, where, report);
}
