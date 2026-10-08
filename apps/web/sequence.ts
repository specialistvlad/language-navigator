// Previous, next and Up next on a topic page, in each grouping and at each level of the filter. A
// grouping lists its pages in order: by category the written topics, by level the steps of the study
// path. At a level, the filter shows the pages that start at or below it, and a page leads to the
// shown pages around it: nothing before the first, and from the last back to the first, Start over.
// Each distinct result renders once, tagged with the levels it serves (data-at); levels.css shows the
// one of the chosen level, and client.ts the one of the step being read.
import { topicTitle } from "../../scripts/content.ts";
import { plainText, reading, textIn } from "../../scripts/text.ts";
import { type Level, LEVELS, lv, type TopicRef } from "../../scripts/lib.ts";
import { refRange } from "../../scripts/levels.ts";
import type { Track } from "./context.ts";
import { listBadge, single } from "./parts.ts";
import { escapeHtml } from "./html.ts";
import { topicUrl } from "./urls.ts";

interface Entry {
  ref: TopicRef;
  href: string;
  title: string;
  level: Level;
  badge: string;
  summary: string;
}

// Where a page leads at some levels of the filter.
interface Around {
  at: Level[];
  prev: Entry | undefined;
  next: Entry | undefined;
  restart: boolean;
}

// One grouping's pages around the page at position i, at every level of the filter.
function around(list: Entry[], i: number): Around[] {
  const out = new Map<string, Around>();
  for (const level of LEVELS) {
    const shown = (e: Entry): boolean => lv(e.level) <= lv(level);
    const prev = list.slice(0, i).filter(shown).pop();
    const after = list.slice(i + 1).find(shown);
    const first = list.find(shown);
    const restart = after === undefined && first !== undefined && first !== list[i];
    const next = after ?? (restart ? first : undefined);
    const key = `${prev?.href ?? ""} ${next?.href ?? ""} ${String(restart)}`;
    const known = out.get(key);
    if (known) known.at.push(level);
    else out.set(key, { at: [level], prev, next, restart });
  }
  return [...out.values()];
}

// A grouping's rows for this page: by category one position, by level one per step of this topic.
interface Placed {
  attrs: string;
  around: Around;
}

function placed(track: Track, ref: TopicRef): Placed[] {
  const { lang, explain } = track;
  const summary = (r: TopicRef): string => (r.topic ? plainText(textIn(r.topic.summary.lead, explain), reading(explain, false)) : "");
  const byCategory: Entry[] = track.written.flatMap((r) => {
    const range = refRange(r, explain);
    return range
      ? [
          {
            ref: r,
            href: topicUrl(explain, lang, r),
            title: topicTitle(r, explain),
            level: range.from,
            badge: listBadge(range),
            summary: summary(r),
          },
        ]
      : [];
  });
  const byLevel: Entry[] = track.path
    .flatMap((stage) => stage.steps)
    .map((s) => ({
      ref: s.ref,
      href: s.href,
      title: topicTitle(s.ref, explain),
      level: s.level,
      badge: listBadge(single(s.level)),
      summary: summary(s.ref),
    }));
  const at = (a: Around): string => ` data-at="${a.at.join(" ")}"`;
  const index = byCategory.findIndex((e) => e.ref === ref);
  return [
    ...(index < 0 ? [] : around(byCategory, index).map((a) => ({ attrs: ` data-order="categories"${at(a)}`, around: a }))),
    ...byLevel.flatMap((e, i) =>
      e.ref === ref
        ? around(byLevel, i).map((a) => ({ attrs: ` data-order="path" data-step="${e.level}"${at(a)} hidden`, around: a }))
        : [],
    ),
  ];
}

// Previous and next, above the title and below the guide. A side with nowhere to go stays, inactive.
export function pagers(track: Track, ref: TopicRef, where: "top" | "bottom"): string {
  const { t } = track;
  const off = (cls: string, label: string): string =>
    `<span class="${cls} off" aria-disabled="true"><span class="dir">${escapeHtml(label)}</span></span>`;
  const side = (cls: string, label: string, e: Entry | undefined): string =>
    e
      ? `<a class="${cls}" href="${e.href}"><span class="dir">${escapeHtml(label)}</span><span class="title">${escapeHtml(e.title)}</span></a>`
      : off(cls, label);
  const rows = placed(track, ref).map(({ attrs, around: a }) => {
    const nextLabel = a.restart ? `${t.startOver} ↺` : `${t.next} →`;
    return `<nav class="pager"${attrs} aria-label="${escapeHtml(t.topics)}">${side("pager-prev", `← ${t.previous}`, a.prev)}${side("pager-next", nextLabel, a.next)}</nav>`;
  });
  return `<div class="pagers ${where}">${rows.join("")}</div>`;
}

// Up next in the rail: the next page with its first sentence and range, or the first page to start over.
export function upNext(track: Track, ref: TopicRef): string {
  const { t } = track;
  return placed(track, ref)
    .flatMap(({ attrs, around: a }) => {
      const e = a.next;
      if (!e) return [];
      return [
        `<div class="up-next"${attrs}><h4>${escapeHtml(a.restart ? t.startOver : t.upNext)}</h4>` +
          `<a class="next" href="${e.href}"><strong>${escapeHtml(e.title)}</strong><span class="summary">${escapeHtml(e.summary)}</span>${e.badge}</a></div>`,
      ];
    })
    .join("");
}
