// A track's index in both orders: one card per section, or one card per level of the study path.
import { topicTitle } from "../../../scripts/content.ts";
import { localize, SITE } from "../../../scripts/lib.ts";
import { alternates, readChoices, type Track } from "../context.ts";
import { controls, page } from "../layout.ts";
import { orderSwitch, trackNav } from "../nav.ts";
import { pathCards } from "../path.ts";
import { refRange } from "../../../scripts/levels.ts";
import { levelAttrs, listBadge, refsRange } from "../parts.ts";
import { escapeHtml } from "../html.ts";
import { topicUrl, trackUrl } from "../urls.ts";

export function trackIndex(track: Track): void {
  const { ctx, lang, explain, t, title: trackTitle, langRefs, written } = track;
  const { o } = ctx;
  const sectionsHtml = lang.sections
    .map((section) => {
      const sectionRefs = langRefs.filter((r) => r.section === section);
      const items = sectionRefs
        .map((ref) => {
          const range = refRange(ref, explain);
          const row = `<span class="name">${escapeHtml(topicTitle(ref, explain))}</span>${listBadge(range)}`;
          return ref.topic
            ? `<li${levelAttrs(range)}><a href="${topicUrl(explain, lang, ref)}">${row}</a></li>`
            : `<li${levelAttrs(range)} class="todo"><span class="row">${row}</span></li>`;
        })
        .join("");
      const count = String(sectionRefs.length);
      const head = `<header><span class="num">${section.dir.slice(0, 2)}</span><h2>${escapeHtml(localize(section.title, explain))}</h2><span class="count">${count}</span></header>`;
      return `<section class="index-card"${levelAttrs(refsRange(sectionRefs, explain))}>${head}<ol class="index-list">${items}</ol></section>`;
    })
    .join("");
  const indexHead =
    `<header class="index-head"><p class="eyebrow">${escapeHtml(localize(lang.name, explain))} · ${escapeHtml(t.explained)}</p>` +
    `<h1>${escapeHtml(t.index)}</h1><p class="lead" data-order="categories">${escapeHtml(t.trackIntro)}</p>` +
    `<p class="lead" data-order="path">${escapeHtml(t.pathIntro)}</p><div class="index-order">${orderSwitch(explain)}</div></header>`;
  ctx.add(
    trackUrl(explain, lang),
    page({
      kind: "track",
      lang: explain,
      title: `${trackTitle} — ${SITE.name}`,
      description: `${trackTitle}, ${t.explained}: ${t.written(written.length, langRefs.length)}.`,
      path: trackUrl(explain, lang),
      alternates: alternates((e) => trackUrl(e, lang)),
      controls: controls({
        explain,
        read: readChoices(explain, (e) => trackUrl(e, lang)),
        level: true,
      }),
      nav: trackNav(track),
      main: `<article class="doc index">${indexHead}<div class="index-grid lanes" data-order="categories">${sectionsHtml}</div><div class="index-grid lanes" data-order="path">${pathCards(track.path, explain)}</div></article>`,
      dev: o.dev,
      siteUrl: o.siteUrl,
    }),
  );
}
