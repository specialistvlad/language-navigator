// The home page, where the language is chosen, and the missing page.
import { listOf, localize, say, SITE } from "../../../scripts/lib.ts";
import { join, refRange } from "../../../scripts/levels.ts";
import { type Context, EXPLAINS, homeLanguage } from "../context.ts";
import { page, ui } from "../layout.ts";
import { escapeHtml } from "../render.ts";
import { homeUrl, trackUrl } from "../urls.ts";

// The home page names every language in the first explanation language.
export function homePage(ctx: Context): void {
  const { o, refs } = ctx;
  const home = homeLanguage();
  // The levels the curriculum covers: written topics by their data, planned ones by their entry.
  const range = join(refs.filter((r) => ctx.languages.some((l) => l.code === r.lang)).map((r) => refRange(r)));
  const homeValues = {
    site: SITE.name,
    languages: listOf(
      ctx.languages.map((l) => localize(l.name, home)),
      home,
    ),
    from: range?.from ?? "",
    to: range?.to ?? "",
    explain: listOf(
      SITE.explain.filter((e) => e.enabled).map((e) => say("explainedIn", home, { name: localize(e.name, home) })),
      home,
    ),
  };
  const cards = ctx.languages
    .map((lang) => {
      const total = refs.filter((r) => r.lang === lang.code).length;
      const written = refs.filter((r) => r.lang === lang.code && r.topic !== null).length;
      const links = EXPLAINS.map(
        (e) =>
          `<a class="track-link" href="${trackUrl(e, lang)}" hreflang="${e}"><strong>${escapeHtml(ui(e).track(localize(lang.name, e)))}</strong><span>${escapeHtml(ui(e).explained)}</span></a>`,
      ).join("");
      return `<section class="card"><h2>${EXPLAINS.map((e) => escapeHtml(localize(lang.name, e))).join(" · ")}</h2><p class="muted">${ui(home).written(written, total)}</p>${links}</section>`;
    })
    .join("");
  ctx.add(
    homeUrl(),
    page({
      kind: "home",
      lang: home,
      title: say("homeTitle", home, homeValues),
      description: say("homeDescription", home, homeValues),
      path: homeUrl(),
      main: `<article class="doc home"><h1>${escapeHtml(SITE.name)}</h1><blockquote><p>${escapeHtml(say("tagline", home, homeValues))}</p></blockquote><div class="cards">${cards}</div></article>`,
      dev: o.dev,
      siteUrl: o.siteUrl,
    }),
  );
}

export function notFoundPage(ctx: Context): void {
  const { o } = ctx;
  const home = homeLanguage();
  ctx.add(
    "/404.html",
    page({
      kind: "404",
      lang: home,
      title: `${ui(home).notFound} — ${SITE.name}`,
      description: ui(home).notFound,
      path: "/404.html",
      main: `<article class="doc"><h1>${EXPLAINS.map((e) => ui(e).notFound).join(" · ")}</h1><p>${EXPLAINS.map((e) => `<a href="/">${ui(e).backHome}</a>`).join(" · ")}</p></article>`,
      dev: o.dev,
      siteUrl: o.siteUrl,
    }),
    false,
  );
}
