// Page shell, controls and interface text for the static site.
import { EXPLAIN, type Explain, INTERFACE, LEVELS, SITE, say } from "../../scripts/lib.ts";
import { escapeHtml } from "./render.ts";

// Web-only wording: actions this app offers.
const WEB: Record<Explain, { print: string; editOn: string; editTitle: string }> = {
  en: { print: "Print", editOn: "Edit on", editTitle: "Edit this topic on GitHub" },
  es: { print: "Imprimir", editOn: "Editar en", editTitle: "Editar este tema en GitHub" },
};

// Interface wording per explanation language: languages/interface.yaml plus the web-only actions.
export const UI = Object.fromEntries(
  Object.keys(EXPLAIN).map((e) => {
    const text = Object.fromEntries(Object.keys(INTERFACE.text).map((key) => [key, say(key, e)]));
    return [
      e,
      {
        ...text,
        ...WEB[e],
        explained: say("explained", e, { name: EXPLAIN[e] }),
        track: (name: string) => say("track", e, { name }),
        written: (n: number, total: number) => say("written", e, { n, total }),
      },
    ];
  }),
) as Record<Explain, Record<string, string> & (typeof WEB)[Explain] & { track: (name: string) => string; written: (n: number, total: number) => string }>;

export interface Choice {
  label: string;
  href: string;
  on: boolean;
}

const seg = (label: string, inner: string) => `<div class="control"><span>${escapeHtml(label)}</span><div class="seg">${inner}</div></div>`;
const linkSeg = (label: string, choices: Choice[]) =>
  seg(label, choices.map((c) => `<a href="${c.href}"${c.on ? ' class="on" aria-current="page"' : ""}>${escapeHtml(c.label)}</a>`).join(""));

export interface ControlsOptions {
  explain: Explain;
  read: Choice[];
  level?: boolean;
  view?: boolean;
}

export function controls(o: ControlsOptions): string {
  const t = UI[o.explain];
  const parts = [linkSeg(t.read, o.read)];
  if (o.level) parts.push(seg(t.level, LEVELS.map((l) => `<button type="button" data-set-level="${l}">${l}</button>`).join("")));
  if (o.view) {
    parts.push(
      seg(
        t.view,
        `<button type="button" data-set-view="guide">${t.full}</button><button type="button" data-set-view="essentials">${t.keyPoints}</button>`,
      ),
    );
  }
  return parts.join("");
}

export interface PageOptions {
  kind: "home" | "track" | "topic" | "sheets" | "sheet" | "404";
  lang: Explain;
  title: string;
  description: string;
  path: string;
  alternates?: { lang: Explain; path: string }[];
  controls?: string;
  nav?: string;
  rail?: string;
  main: string;
  dev: boolean;
  siteUrl: string;
}

// Applies saved viewer preferences before first paint.
const PREFS = `try{var d=document.documentElement,s=localStorage;d.dataset.level=s.getItem("ln-level")||"B1";d.dataset.view=s.getItem("ln-view")||"guide";var t=s.getItem("ln-theme");if(t&&t!=="auto")d.dataset.theme=t}catch(e){}`;

// Runs right after the sidebar, before first paint: restores the scroll position the same menu had on
// the previous page (client.js saves it on leaving), then brings the current page's entry into view.
const NAV_SCROLL = `(function(){var n=document.getElementById("sidebar"),k=n.querySelector(".nav-track").getAttribute("href")+"#"+n.childElementCount;n.dataset.key=k;try{var v=JSON.parse(sessionStorage.getItem("ln-nav"));if(v&&v.k===k)n.scrollTop=v.t}catch(e){}var c=n.querySelector("[aria-current=page]");if(c){var r=c.getBoundingClientRect(),b=n.getBoundingClientRect();if(r.top<b.top||r.bottom>b.bottom)n.scrollTop+=r.top-b.top-(b.height-r.height)/2}})()`;

export function page(o: PageOptions): string {
  const url = (path: string) => `${o.siteUrl}${path}`;
  const alternates = (o.alternates ?? [])
    .map((a) => `<link rel="alternate" hreflang="${a.lang}" href="${url(a.path)}">`)
    .join("\n  ");
  return `<!doctype html>
<html lang="${o.lang}" data-page="${o.kind}" data-dev="${o.dev ? 1 : 0}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(o.title)}</title>
  <meta name="description" content="${escapeHtml(o.description)}">
  ${o.kind === "404" ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${url(o.path)}">`}
  ${alternates}
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(o.title)}">
  <meta property="og:description" content="${escapeHtml(o.description)}">
  <meta property="og:url" content="${url(o.path)}">
  <link rel="stylesheet" href="/style.css">
  <link rel="stylesheet" href="/levels.css">
  <script>${PREFS}</script>
</head>
<body>
  <header class="topbar">
    ${o.nav ? '<button class="menu" id="menu" type="button" aria-label="Menu">☰</button>' : ""}
    <a class="brand" href="/">${escapeHtml(SITE.name)}</a>
    <div class="controls">${o.controls ?? ""}</div>
    <div class="tools">
      <button class="tool" id="theme" type="button" title="Theme">◐</button>
    </div>
  </header>
  <div class="layout${o.nav ? "" : " no-nav"}${o.rail ? " has-rail" : ""}">
    ${o.nav ? `<nav class="sidebar" id="sidebar">${o.nav}</nav><script>${NAV_SCROLL}</script>` : ""}
    <main class="content">${o.main}</main>
    ${o.rail ? `<aside class="rail">${o.rail}</aside>` : ""}
  </div>
  <script src="/client.js" defer></script>
</body>
</html>
`;
}

export const explainName = (explain: Explain) => EXPLAIN[explain];
