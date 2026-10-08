// The sidebar menu: back to the home page, the track index, the order switch, and every topic of the
// track in both orders: by category (sections, each topic with its range) and the study path (levels,
// each with its steps). The switch shows one; the level filter hides what starts above it.
import { topicTitle } from "../../scripts/content.ts";
import { type Explain, localize, SITE, type TopicRef } from "../../scripts/lib.ts";
import { refRange } from "../../scripts/levels.ts";
import type { Track } from "./context.ts";
import { seg, ui } from "./layout.ts";
import { pathMenu } from "./path.ts";
import { levelAttrs, listBadge, refsRange } from "./parts.ts";
import { escapeHtml } from "./html.ts";
import { homeUrl, topicUrl, trackUrl } from "./urls.ts";

// Grouping of the topic lists: by level, along the study path, or by category. The choice lives in the browser,
// like the theme (client.ts); views.css shows the lists of the chosen order.
export function orderSwitch(explain: Explain): string {
  const t = ui(explain);
  const buttons = `<button type="button" data-set-order="path">${escapeHtml(t.byLevel)}</button><button type="button" data-set-order="categories">${escapeHtml(t.categories)}</button>`;
  return seg(t.grouping, buttons);
}

// Sidebar head: the logo, which small screens show here in place of the top bar's (media.css), and
// back to the home page, where the language is chosen.
export const navHome = (explain: Explain): string =>
  `<a class="nav-brand" href="${homeUrl()}">${escapeHtml(SITE.name)}</a>` +
  `<a class="nav-home" href="${homeUrl()}">${escapeHtml(ui(explain).chooseLanguage)}</a>`;

export function trackNav(track: Track, current?: TopicRef): string {
  const { ctx, explain, lang } = track;
  const refs = ctx.refs;
  const out: string[] = [];
  for (const section of lang.sections) {
    const inSection = refs.filter((r) => r.lang === lang.code && r.section === section);
    const range = refsRange(inSection, explain);
    out.push(`<h4${levelAttrs(range)}><span class="name">${escapeHtml(localize(section.title, explain))}</span>${listBadge(range)}</h4>`);
    for (const ref of inSection) {
      const own = refRange(ref, explain);
      const name = `<span class="name">${escapeHtml(topicTitle(ref, explain))}</span>${listBadge(own)}`;
      if (ref.topic) {
        const on = current === ref ? ' class="on" aria-current="page"' : "";
        out.push(`<a href="${topicUrl(explain, lang, ref)}"${levelAttrs(own)}${on}>${name}</a>`);
      } else {
        out.push(`<div class="todo"${levelAttrs(own)}>${name}</div>`);
      }
    }
  }
  return [
    navHome(explain),
    `<a class="nav-track" href="${trackUrl(explain, lang)}">${escapeHtml(ui(explain).index)}</a>`,
    `<div class="nav-order">${orderSwitch(explain)}</div>`,
    `<div class="nav-list" data-order="categories">${out.join("\n")}</div>`,
    `<div class="nav-list" data-order="path">${pathMenu(track.path, explain, current)}</div>`,
  ].join("\n");
}
