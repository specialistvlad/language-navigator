// Page shell, controls and interface text for the static site.
import { EXPLAIN_CODES, type Explain, explainName, filled, LEVELS, SITE, say } from "../../scripts/lib.ts";
import { escapeHtml } from "./render.ts";

// Interface wording keys this app shows, all from languages/interface.yaml.
const TEXT_KEYS = [
  "read",
  "level",
  "view",
  "extended",
  "upTo",
  "index",
  "chooseLanguage",
  "trackIntro",
  "onThisPage",
  "upNext",
  "sheets",
  "sheet",
  "sheetsIntro",
  "levels",
  "progressive",
  "sections",
  "topics",
  "notFound",
  "backHome",
] as const;

// Web-only wording: actions this app offers.
interface WebText {
  print: string;
  editOn: string;
  editTitle: string;
}
const WEB: Partial<Record<Explain, WebText>> = {
  en: { print: "Print", editOn: "Edit on", editTitle: "Edit this topic on GitHub" },
  es: { print: "Imprimir", editOn: "Editar en", editTitle: "Editar este tema en GitHub" },
};

export type Ui = Record<(typeof TEXT_KEYS)[number], string> &
  WebText & {
    explained: string;
    track: (name: string) => string;
    written: (n: number, total: number) => string;
  };

function makeUi(e: Explain): Ui {
  const web = WEB[e];
  if (web === undefined) throw new Error(`apps/web/layout.ts has no web wording for "${e}"`);
  const text = Object.fromEntries(TEXT_KEYS.map((key) => [key, say(key, e)])) as Record<(typeof TEXT_KEYS)[number], string>;
  return {
    ...text,
    ...web,
    explained: say("explained", e, { name: explainName(e) }),
    track: (name: string) => say("track", e, { name }),
    written: (n: number, total: number) => say("written", e, { n, total }),
  };
}

// Interface wording per explanation language: languages/interface.yaml plus the web-only actions.
const UI = new Map(EXPLAIN_CODES.map((e) => [e, makeUi(e)]));
export function ui(explain: Explain): Ui {
  const t = UI.get(explain);
  if (t === undefined) throw new Error(`No interface wording for "${explain}"`);
  return t;
}

export interface Choice {
  label: string;
  href: string;
  on: boolean;
}

const seg = (label: string, inner: string): string =>
  `<div class="control"><span>${escapeHtml(label)}</span><div class="seg">${inner}</div></div>`;
const linkSeg = (label: string, choices: Choice[]): string =>
  seg(label, choices.map((c) => `<a href="${c.href}"${c.on ? ' class="on" aria-current="page"' : ""}>${escapeHtml(c.label)}</a>`).join(""));

export interface ControlsOptions {
  explain: Explain;
  read: Choice[];
  level?: boolean;
  view?: boolean;
}

export function controls(o: ControlsOptions): string {
  const t = ui(o.explain);
  // One explanation language leaves nothing to switch.
  const parts = o.read.length > 1 ? [linkSeg(t.read, o.read)] : [];
  if (o.level === true) parts.push(seg(t.level, LEVELS.map((l) => `<button type="button" data-set-level="${l}">${l}</button>`).join("")));
  if (o.view === true) {
    parts.push(
      seg(
        t.view,
        `<button type="button" data-set-view="cheatsheet">${t.sheet}</button><button type="button" data-set-view="extended">${t.extended}</button>`,
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
const PREFS = `try{var d=document.documentElement,p=new URLSearchParams(location.search),s=localStorage,l=(p.get("level")||"").toUpperCase(),v=p.get("view");if(${JSON.stringify(LEVELS)}.indexOf(l)>=0)s.setItem("ln-level",l);if(v==="cheatsheet"||v==="extended")s.setItem("ln-view",v);d.dataset.level=s.getItem("ln-level")||"${LEVELS.at(-1) ?? ""}";d.dataset.view=s.getItem("ln-view")==="cheatsheet"?"cheatsheet":"extended";var t=s.getItem("ln-theme");if(t&&t!=="auto")d.dataset.theme=t}catch(e){}`;

// Runs right after the sidebar, before first paint: restores the scroll position the same menu had on
// the previous page (client.ts saves it on leaving), then brings the current page's entry into view.
const NAV_SCROLL = `(function(){var n=document.getElementById("sidebar"),k=n.querySelector(".nav-track").getAttribute("href")+"#"+n.childElementCount;n.dataset.key=k;try{var v=JSON.parse(sessionStorage.getItem("ln-nav"));if(v&&v.k===k)n.scrollTop=v.t}catch(e){}var c=n.querySelector("[aria-current=page]");if(c){var r=c.getBoundingClientRect(),b=n.getBoundingClientRect();if(r.top<b.top||r.bottom>b.bottom)n.scrollTop+=r.top-b.top-(b.height-r.height)/2}})()`;

export function page(o: PageOptions): string {
  const url = (path: string): string => `${o.siteUrl}${path}`;
  const alternates = (o.alternates ?? []).map((a) => `<link rel="alternate" hreflang="${a.lang}" href="${url(a.path)}">`).join("\n  ");
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
    ${filled(o.nav) ? '<button class="menu" id="menu" type="button" aria-label="Menu">☰</button>' : ""}
    <a class="brand" href="/">${escapeHtml(SITE.name)}</a>
    <div class="controls">${o.controls ?? ""}</div>
    <div class="tools">
      <button class="tool" id="theme" type="button" title="Theme">◐</button>
    </div>
  </header>
  <div class="layout${filled(o.nav) ? "" : " no-nav"}${filled(o.rail) ? " has-rail" : ""}">
    ${filled(o.nav) ? `<nav class="sidebar" id="sidebar">${o.nav}</nav><script>${NAV_SCROLL}</script>` : ""}
    <main class="content">${o.main}</main>
    ${filled(o.rail) ? `<aside class="rail">${o.rail}</aside>` : ""}
  </div>
  <script src="/client.js" defer></script>
</body>
</html>
`;
}
