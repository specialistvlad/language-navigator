// Topic pages: the cheatsheet as section 00, the guide in numbered sections, and the rail beside them.
import { type Explain, say } from "../../../scripts/lib.ts";
import { join } from "../../../scripts/levels.ts";
import { alternates, readChoices, type Track } from "../context.ts";
import { guideSections } from "../guide.ts";
import { GITHUB_ICON, PRINT_ICON } from "../icons.ts";
import { controls, page } from "../layout.ts";
import { trackNav } from "../nav.ts";
import { pagers, upNext } from "../sequence.ts";
import { plainText, reading, textIn } from "../../../scripts/text.ts";
import { anchorIds, badge, editUrl, levelAttrs, listBadge } from "../parts.ts";
import { escapeHtml, explained, inline } from "../html.ts";
import { topicUrl } from "../urls.ts";

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
  for (const ref of written) {
    const topic = ref.topic;
    if (topic === null) continue;
    const rctx = { ref, explain, refs: ctx.refs, link: ctx.link };
    const all = guideSections(rctx);
    const range = join(all.map((s) => s.range));
    if (range === null) continue;
    const sheetFrom = all.find((s) => s.kind === "cheatsheet")?.range.from ?? range.from;
    const empty = filterEmpty("cheatsheet", sheetFrom, explain) + filterEmpty("extended", range.from, explain);
    const ids = anchorIds(all.map((s) => s.title));
    const idOf = new Map(all.map((s, i) => [s, ids[i] ?? ""]));
    const sections = all
      .map((s) => {
        const cls = s.kind === "cheatsheet" ? "part cheatsheet" : "part";
        const anchor = idOf.get(s);
        const id = anchor === undefined ? "" : ` id="${anchor}"`;
        return `<section class="${cls}"${id}${levelAttrs(s.range)}><h2>${s.heading}${badge(s.range)}</h2>${s.html}</section>`;
      })
      .join("\n");

    // Rail: the cheatsheet, then the guide sections with their ranges, which the Extended view
    // lists, and the next topic.
    const tocItems = all.map((s) => {
      const guide = s.kind === "cheatsheet" ? "" : ' class="guide"';
      return `<li${guide}${levelAttrs(s.range)}><a href="#${idOf.get(s) ?? ""}"><span class="name">${s.heading}</span>${listBadge(s.range)}</a></li>`;
    });
    const rail = `<h4>${escapeHtml(t.onThisPage)}</h4><ol class="toc">${tocItems.join("")}</ol>${upNext(track, ref)}`;
    const actions = [
      `<a class="tool edit" href="${editUrl(ref.path)}" rel="noopener" title="${escapeHtml(t.editTitle)}" aria-label="${escapeHtml(`${t.editOn} GitHub`)}">${escapeHtml(t.editOn)}${GITHUB_ICON}</a>`,
      `<button class="tool" id="print" type="button" title="${escapeHtml(t.print)}" aria-label="${escapeHtml(t.print)}">${PRINT_ICON}</button>`,
    ].join("");
    const title = plainText(textIn(topic.title, explain), reading(explain, false));
    const head = `<header class="doc-head"><h1>${inline(textIn(topic.title, explain), rctx, false)}${badge(range)}</h1><div class="actions">${actions}</div></header>`;
    // The summary: its lead, its rule and the rule's examples, read as one paragraph.
    const { summary } = topic;
    const example = summary.ex === undefined ? "" : ` ${inline(summary.ex, rctx, true, true)}`;
    const intro = `<blockquote><p>${explained(summary.lead, rctx)} ${explained(summary.rule, rctx)}${example}</p></blockquote>`;
    ctx.add(
      topicUrl(explain, lang, ref),
      page({
        kind: "topic",
        lang: explain,
        title: `${title} — ${trackTitle}`,
        description: plainText(textIn(summary.lead, explain), reading(explain, false)),
        path: topicUrl(explain, lang, ref),
        alternates: alternates((e) => topicUrl(e, lang, ref)),
        controls: controls({
          explain,
          read: readChoices(explain, (e) => topicUrl(e, lang, ref)),
          level: true,
          view: true,
        }),
        nav: trackNav(track, ref),
        rail,
        main: `<article class="doc${range.from === range.to ? " one-level" : ""}">${pagers(track, ref, "top")}${head}${intro}${empty}<div class="sections lanes">${sections}</div>${pagers(track, ref, "bottom")}</article>`,
        dev: o.dev,
        siteUrl: o.siteUrl,
      }),
    );
  }
}
