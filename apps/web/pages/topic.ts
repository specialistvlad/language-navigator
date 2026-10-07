// Topic pages: the cheatsheet as section 00, the guide in numbered sections, and the rail beside them.
import { type Explain, say, topicTitle, type TopicRef } from "../../../scripts/lib.ts";
import { join, refRange } from "../../../scripts/levels.ts";
import { alternates, readChoices, type Track } from "../context.ts";
import { type GuideSection, guideSections } from "../guide.ts";
import { GITHUB_ICON, PRINT_ICON } from "../icons.ts";
import { controls, page } from "../layout.ts";
import { trackNav } from "../nav.ts";
import { lead } from "../../../scripts/content.ts";
import { badge, editUrl, levelAttrs, slugify } from "../parts.ts";
import { escapeHtml, inline } from "../render.ts";
import { topicUrl } from "../urls.ts";

// Anchor ids for the guide sections, unique within the page.
function anchors(parts: GuideSection[]): Map<GuideSection, string> {
  const ids = new Set<string>();
  return new Map(
    parts.map((s) => {
      let id = slugify(s.title);
      if (id === "") id = "section";
      while (ids.has(id)) id += "-";
      ids.add(id);
      return [s, id];
    }),
  );
}

// What a view shows when the level filter sits below everything in it: a note and a button that
// sets the level where the view starts. views.css shows it for its view below that level.
function filterEmpty(view: "cheatsheet" | "extended", level: string, explain: Explain): string {
  const note = escapeHtml(say("filterEmpty", explain, { level }));
  const show = escapeHtml(say("showLevel", explain, { level }));
  return `<div class="filter-empty ${view}" data-needs="${level}"><p>${note}</p><button type="button" data-set-level="${level}">${show}</button></div>`;
}

export function topicPages(track: Track): void {
  const { ctx, lang, explain, t, title: trackTitle, written } = track;
  const { o } = ctx;
  for (const [index, ref] of written.entries()) {
    const topic = ref.topic;
    if (topic === null) continue;
    const rctx = { ref, explain, refs: ctx.refs, link: ctx.link };
    const all = guideSections(rctx);
    const range = join(all.map((s) => s.range));
    if (range === null) continue;
    const sheetFrom = all.find((s) => s.kind === "cheatsheet")?.range.from ?? range.from;
    const empty = filterEmpty("cheatsheet", sheetFrom, explain) + filterEmpty("extended", range.from, explain);
    const idOf = anchors(all);
    const sections = all
      .map((s) => {
        const cls = s.kind === "cheatsheet" ? "part cheatsheet" : "part";
        const anchor = idOf.get(s);
        const id = anchor === undefined ? "" : ` id="${anchor}"`;
        return `<section class="${cls}"${id}${levelAttrs(s.range)}><h2>${inline(s.title, rctx)}${badge(s.range)}</h2>${s.html}</section>`;
      })
      .join("\n");

    // Rail: the cheatsheet, then the guide sections with their ranges, which the Extended view
    // lists, and the next topic.
    const tocItems = all.map((s) => {
      const guide = s.kind === "cheatsheet" ? "" : ' class="guide"';
      return `<li${guide}${levelAttrs(s.range)}><a href="#${idOf.get(s) ?? ""}"><span class="name">${escapeHtml(s.title)}</span>${badge(s.range)}</a></li>`;
    });
    const rail = `<h4>${escapeHtml(t.onThisPage)}</h4><ol class="toc">${tocItems.join("")}</ol>${upNext(track, written.slice(index + 1), ref)}`;
    const actions = [
      `<a class="tool edit" href="${editUrl(ref.path)}" rel="noopener" title="${escapeHtml(t.editTitle)}">${escapeHtml(t.editOn)}${GITHUB_ICON}<span class="sr-only">GitHub</span></a>`,
      `<button class="tool" id="print" type="button" title="${escapeHtml(t.print)}" aria-label="${escapeHtml(t.print)}">${PRINT_ICON}</button>`,
    ].join("");
    const title = topic.title[explain] ?? ref.entry.slug;
    const head = `<header class="doc-head"><h1>${escapeHtml(title)}${badge(range)}</h1><div class="actions">${actions}</div></header>`;
    const intro = `<blockquote><p>${inline(topic.summary[explain] ?? "", rctx)}</p></blockquote>`;
    ctx.add(
      topicUrl(explain, lang, ref),
      page({
        kind: "topic",
        lang: explain,
        title: `${title} — ${trackTitle}`,
        description: lead(topic.summary[explain] ?? ""),
        path: topicUrl(explain, lang, ref),
        alternates: alternates((e) => topicUrl(e, lang, ref)),
        controls: controls({
          explain,
          read: readChoices(explain, (e) => topicUrl(e, lang, ref)),
          level: true,
          view: true,
        }),
        nav: trackNav(ctx.refs, explain, lang, ref),
        rail,
        main: `<article class="doc${range.from === range.to ? " one-level" : ""}">${head}${intro}${empty}<div class="sections lanes">${sections}</div></article>`,
        dev: o.dev,
        siteUrl: o.siteUrl,
      }),
    );
  }
}

// Up next: the following written topic of the same language, with its first sentence and range.
function upNext(track: Track, after: TopicRef[], ref: TopicRef): string {
  const { lang, explain, t } = track;
  const next = after.find((r) => r.lang === ref.lang);
  const nextTopic = next?.topic;
  const nextRange = next ? refRange(next, explain) : null;
  return next && nextTopic
    ? `<h4>${escapeHtml(t.upNext)}</h4><a class="next" href="${topicUrl(explain, lang, next)}"><strong>${escapeHtml(topicTitle(next, explain))}</strong>` +
        `<span class="summary">${escapeHtml(lead(nextTopic.summary[explain] ?? ""))}</span>${badge(nextRange)}</a>`
    : "";
}
