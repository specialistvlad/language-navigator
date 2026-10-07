// Page shell, controls and interface text for the static site.
import { EXPLAIN, type Explain, LEVELS } from "../../scripts/lib.ts";
import { escapeHtml } from "./render.ts";

export const UI = {
  en: {
    read: "Read in",
    level: "Level",
    view: "View",
    full: "Full",
    keyPoints: "Key points",
    onThisPage: "On this page",
    upNext: "Up next",
    sheets: "Cheatsheets",
    sheet: "Cheatsheet",
    levels: "Levels",
    progressive: "Progressive",
    sections: "Sections",
    topics: "Topics",
    track: (name: string) => `Learn ${name}`,
    index: "Index",
    chooseLanguage: "Choose language",
    explained: "explained in English",
    trackIntro: "Topics in study order. Choose your level to hide what comes later.",
    sheetsIntro: "Level sheets hold one level; progressive sheets add the reminders of every level below.",
    print: "Print",
    github: "View on GitHub",
    upTo: "Up to",
    levelNames: { A0: "Starter", A1: "Beginner", A2: "Elementary", B1: "Intermediate" },
    written: (n: number, total: number) => `${n} of ${total} topics written`,
    notFound: "Page not found",
    backHome: "Go to the home page",
  },
  es: {
    read: "Leer en",
    level: "Nivel",
    view: "Vista",
    full: "Completo",
    keyPoints: "Puntos clave",
    onThisPage: "En esta página",
    upNext: "A continuación",
    sheets: "Chuletas",
    sheet: "Chuleta",
    levels: "Niveles",
    progressive: "Progresivas",
    sections: "Secciones",
    topics: "Temas",
    track: (name: string) => `Aprende ${name.toLowerCase()}`,
    index: "Índice",
    chooseLanguage: "Elegir idioma",
    explained: "explicado en español",
    trackIntro: "Temas en orden de estudio. Elige tu nivel para ocultar lo que viene después.",
    sheetsIntro: "Las chuletas por nivel recogen un nivel; las progresivas añaden los recordatorios de los niveles anteriores.",
    print: "Imprimir",
    github: "Ver en GitHub",
    upTo: "Hasta",
    levelNames: { A0: "Inicial", A1: "Principiante", A2: "Elemental", B1: "Intermedio" },
    written: (n: number, total: number) => `${n} de ${total} temas escritos`,
    notFound: "Página no encontrada",
    backHome: "Ir a la página principal",
  },
} as const;

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
  <script>${PREFS}</script>
</head>
<body>
  <header class="topbar">
    ${o.nav ? '<button class="menu" id="menu" type="button" aria-label="Menu">☰</button>' : ""}
    <a class="brand" href="/">Language Navigator</a>
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
