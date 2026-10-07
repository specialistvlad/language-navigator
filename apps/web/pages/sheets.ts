// Cheatsheet pages: the index of a track's sheets and one page per sheet.
import type { Explain } from "../../../scripts/lib.ts";
import { alternates, readChoices, type Track } from "../context.ts";
import { controls, page } from "../layout.ts";
import { navHome } from "../nav.ts";
import { rangeBadge } from "../parts.ts";
import { escapeHtml } from "../render.ts";
import { sheetsUrl, sheetUrl, trackUrl } from "../urls.ts";
import { type Sheet, sheetHtml, sheetsOf } from "./sheet-content.ts";

export function sheetPages(track: Track): void {
  const { ctx, lang, explain, t, title: trackTitle } = track;
  const { o } = ctx;
  const sheets = sheetsOf(track);
  const groups = { levels: t.levels, progressive: t.progressive, sections: t.sections, topics: t.topics } as const;
  const groupKeys = Object.keys(groups) as (keyof typeof groups)[];
  const sheetNav = (current?: Sheet): string =>
    [
      navHome(explain),
      `<a class="nav-track" href="${trackUrl(explain, lang)}">${escapeHtml(t.index)}</a>`,
      ...groupKeys.flatMap((g) => {
        const list = sheets.filter((s) => s.group === g);
        if (list.length === 0) return [];
        return [
          `<h4>${escapeHtml(groups[g])}</h4>`,
          ...list.map(
            (s) =>
              `<a href="${sheetUrl(explain, lang, s.id)}"${s === current ? ' class="on" aria-current="page"' : ""}><span class="name">${escapeHtml(s.label)}</span></a>`,
          ),
        ];
      }),
    ].join("\n");

  const sheetControls = (pathFor: (e: Explain) => string): string => controls({ explain, read: readChoices(explain, pathFor) });

  const indexHtml = groupKeys
    .map((g) => {
      const list = sheets.filter((s) => s.group === g);
      if (list.length === 0) return "";
      return `<section class="part"><h2>${escapeHtml(groups[g])}</h2><ul class="topic-list">${list
        .map((s) => `<li><a href="${sheetUrl(explain, lang, s.id)}">${escapeHtml(s.label)}</a> ${rangeBadge(s.range)}</li>`)
        .join("")}</ul></section>`;
    })
    .join("");
  ctx.add(
    sheetsUrl(explain, lang),
    page({
      kind: "sheets",
      lang: explain,
      title: `${t.sheets} — ${trackTitle}`,
      description: `${t.sheets}: ${trackTitle}, ${t.explained}.`,
      path: sheetsUrl(explain, lang),
      alternates: alternates((e) => sheetsUrl(e, lang)),
      controls: sheetControls((e) => sheetsUrl(e, lang)),
      nav: sheetNav(),
      main: `<article class="doc"><h1>${escapeHtml(t.sheets)}</h1><blockquote><p>${escapeHtml(t.sheetsIntro)}</p></blockquote><div class="sheet-index lanes">${indexHtml}</div></article>`,
      dev: o.dev,
      siteUrl: o.siteUrl,
    }),
  );

  for (const s of sheets) {
    ctx.add(
      sheetUrl(explain, lang, s.id),
      page({
        kind: "sheet",
        lang: explain,
        title: `${s.title} — ${trackTitle}`,
        description: `${s.title}: ${trackTitle}, ${t.explained}.`,
        path: sheetUrl(explain, lang, s.id),
        alternates: alternates((e) => sheetUrl(e, lang, s.id)),
        controls: sheetControls((e) => sheetUrl(e, lang, s.id)),
        nav: sheetNav(s),
        main: `<article class="doc sheet">${sheetHtml(s.markdown)}</article>`,
        dev: o.dev,
        siteUrl: o.siteUrl,
      }),
    );
  }
}
