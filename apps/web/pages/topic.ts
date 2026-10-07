// Topic pages: the guide in numbered sections, the Key points view, and the rail beside them.
import { levelRange, topicTitle, type TopicRef } from "../../../scripts/lib.ts";
import { alternates, readChoices, type Track } from "../context.ts";
import { type GuideSection, guideSections } from "../guide.ts";
import { GITHUB_ICON, PRINT_ICON } from "../icons.ts";
import { controls, page } from "../layout.ts";
import { trackNav } from "../nav.ts";
import { lead } from "../../../scripts/content.ts";
import { chips, editUrl, rangeBadge, slugify } from "../parts.ts";
import { escapeHtml, inline, levelBadge } from "../render.ts";
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

export function topicPages(track: Track): void {
  const { ctx, lang, explain, t, title: trackTitle, written } = track;
  const { o } = ctx;
  for (const [index, ref] of written.entries()) {
    const topic = ref.topic;
    if (topic === null) continue;
    const rctx = { ref, explain, refs: ctx.refs, link: ctx.link };
    const all = guideSections(rctx);
    const parts = all.filter((s) => s.kind === "body");
    const idOf = anchors(parts);
    const sections = all
      .map((s) => {
        const cls = s.kind === "body" ? "part" : `block ${s.kind}`;
        const anchor = idOf.get(s);
        const id = anchor === undefined ? "" : ` id="${anchor}"`;
        return `<section class="${cls}"${id} data-level="${s.from}"><h2>${inline(s.title, rctx)}${levelBadge(s.from, s.to)}</h2>${s.html}</section>`;
      })
      .join("\n");

    // Rail: the guide sections with their levels, the Essentials view, and the next topic.
    const tocItems = parts.map((s) => {
      const levels = chips(levelRange(`${s.from}-${s.to}`));
      return `<li data-level="${s.from}"><a href="#${idOf.get(s) ?? ""}" data-view="guide"><span class="name">${escapeHtml(s.title)}</span>${levels}</a></li>`;
    });
    tocItems.push(
      `<li><button type="button" data-view="essentials"><span class="name">${escapeHtml(t.keyPoints)}</span>${chips(topic.levels)}</button></li>`,
    );
    const rail = `<h4>${escapeHtml(t.onThisPage)}</h4><ol class="toc">${tocItems.join("")}</ol>${upNext(track, written.slice(index + 1), ref)}`;
    const actions = [
      `<a class="tool edit" href="${editUrl(ref.path)}" rel="noopener" title="${escapeHtml(t.editTitle)}">${escapeHtml(t.editOn)}${GITHUB_ICON}<span class="sr-only">GitHub</span></a>`,
      `<button class="tool" id="print" type="button" title="${escapeHtml(t.print)}" aria-label="${escapeHtml(t.print)}">${PRINT_ICON}</button>`,
    ].join("");
    const title = topic.title[explain] ?? ref.entry.slug;
    const head = `<header class="doc-head"><h1>${escapeHtml(title)}${rangeBadge(ref.entry.levels)}</h1><div class="actions">${actions}</div></header>`;
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
        main: `<article class="doc${topic.levels.length === 1 ? " one-level" : ""}">${head}${intro}<div class="sections lanes">${sections}</div></article>`,
        dev: o.dev,
        siteUrl: o.siteUrl,
      }),
    );
  }
}

// Up next: the following written topic of the same language, with its first sentence and levels.
function upNext(track: Track, after: TopicRef[], ref: TopicRef): string {
  const { lang, explain, t } = track;
  const next = after.find((r) => r.lang === ref.lang);
  const nextTopic = next?.topic;
  return next && nextTopic
    ? `<h4>${escapeHtml(t.upNext)}</h4><a class="next" href="${topicUrl(explain, lang, next)}"><strong>${escapeHtml(topicTitle(next, explain))}</strong>` +
        `<span class="summary">${escapeHtml(lead(nextTopic.summary[explain] ?? ""))}</span>${chips(nextTopic.levels)}</a>`
    : "";
}
