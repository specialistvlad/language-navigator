// The study path of a track (curriculum.yaml `path`): per level, the steps to study, each a topic at a
// level. A step links to its topic with its level, ?step=a1, so the page marks the step being read, and
// to the place its level starts: the top at the topic's lowest level, else the first guide section
// holding that level, under the anchor the topic page gives it.
import { type CurriculumLanguage, type Explain, type Level, LEVELS, levelName, topicTitle, type TopicRef } from "../../scripts/lib.ts";
import { leaves, topicLevels } from "../../scripts/levels.ts";
import { guideParts } from "./guide.ts";
import { anchorIds, levelAttrs, listBadge, single } from "./parts.ts";
import { escapeHtml } from "./render.ts";
import { topicUrl } from "./urls.ts";

export interface Step {
  level: Level;
  ref: TopicRef;
  href: string;
}

export interface Stage {
  level: Level;
  steps: Step[];
}

function stepHref(ref: TopicRef, level: Level, explain: Explain, lang: CurriculumLanguage): string | null {
  const topic = ref.topic;
  if (!topic) return null;
  const held = topicLevels(topic, explain);
  if (!held.includes(level)) return null;
  const url = `${topicUrl(explain, lang, ref)}?step=${level.toLowerCase()}`;
  if (level === held[0]) return url;
  const parts = guideParts(topic, explain);
  const ids = anchorIds(parts.map((p) => p.title));
  const at = parts.findIndex((p) => p.kind === "body" && p.content.some((b) => leaves(b, explain).some((l) => l.level === level)));
  return at < 0 ? url : `${url}#${ids[at] ?? ""}`;
}

// The path's levels, lowest first, with the steps a reader of this explanation language can take.
export function studyPath(lang: CurriculumLanguage, explain: Explain, refs: TopicRef[]): Stage[] {
  const byId = new Map(refs.map((r) => [r.id, r]));
  return LEVELS.flatMap((level) => {
    const steps = (lang.path[level] ?? []).flatMap((id): Step[] => {
      const ref = byId.get(id);
      const href = ref ? stepHref(ref, level, explain, lang) : null;
      return ref && href !== null ? [{ level, ref, href }] : [];
    });
    return steps.length > 0 ? [{ level, steps }] : [];
  });
}

// A level's heading in a list: its name and its badge; the level filter hides it with its steps.
export const stageHead = (stage: Stage, explain: Explain): string =>
  `<span class="name">${escapeHtml(levelName(stage.level, explain))}</span>${listBadge(single(stage.level))}`;

// The menu in study order: each level, then its steps; every step of the current topic is on.
export function pathMenu(path: Stage[], explain: Explain, current?: TopicRef): string {
  return path
    .flatMap((stage) => [
      `<h4${levelAttrs(single(stage.level))}>${stageHead(stage, explain)}</h4>`,
      ...stage.steps.map(
        (s) =>
          `<a href="${s.href}"${levelAttrs(single(s.level))}${s.ref === current ? ' class="on"' : ""}><span class="name">${escapeHtml(topicTitle(s.ref, explain))}</span></a>`,
      ),
    ])
    .join("\n");
}

// The track index in study order: one card per level.
export function pathCards(path: Stage[], explain: Explain): string {
  return path
    .map((stage) => {
      const items = stage.steps
        .map(
          (s) =>
            `<li${levelAttrs(single(s.level))}><a href="${s.href}"><span class="name">${escapeHtml(topicTitle(s.ref, explain))}</span></a></li>`,
        )
        .join("");
      const head = `<header><span class="num">${stage.level}</span><h2>${escapeHtml(levelName(stage.level, explain))}</h2><span class="count">${String(stage.steps.length)}</span></header>`;
      return `<section class="index-card"${levelAttrs(single(stage.level))}>${head}<ol class="index-list">${items}</ol></section>`;
    })
    .join("");
}
