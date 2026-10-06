// Page shell, controls and interface text for the static site.
import { EXPLAIN, type Explain, LEVELS } from "../../scripts/lib.ts";
import { escapeHtml } from "./render.ts";

export const UI = {
  en: {
    learn: "Learn",
    read: "Read in",
    level: "Level",
    view: "View",
    guide: "Guide",
    essentials: "Essentials",
    sheets: "Cheatsheets",
    sheet: "Cheatsheet",
    levels: "Levels",
    progressive: "Progressive",
    sections: "Sections",
    topics: "Topics",
    track: (name: string) => `Learn ${name}`,
    index: "Index",
    statusNames: { approved: "Approved", draft: "Draft", todo: "Planned" },
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
    learn: "Aprender",
    read: "Leer en",
    level: "Nivel",
    view: "Vista",
    guide: "Guía",
    essentials: "Lo esencial",
    sheets: "Chuletas",
    sheet: "Chuleta",
    levels: "Niveles",
    progressive: "Progresivas",
    sections: "Secciones",
    topics: "Temas",
    track: (name: string) => `Aprende ${name.toLowerCase()}`,
    index: "Índice",
    statusNames: { approved: "Aprobado", draft: "Borrador", todo: "Previsto" },
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
  learn: Choice[];
  read: Choice[];
  level?: boolean;
  view?: boolean;
  sheets?: Choice;
}

export function controls(o: ControlsOptions): string {
  const t = UI[o.explain];
  const parts = [linkSeg(t.learn, o.learn), linkSeg(t.read, o.read)];
  if (o.level) parts.push(seg(t.level, LEVELS.map((l) => `<button type="button" data-set-level="${l}">${l}</button>`).join("")));
  if (o.view) {
    parts.push(
      seg(
        t.view,
        `<button type="button" data-set-view="guide">${t.guide}</button><button type="button" data-set-view="essentials">${t.essentials}</button>`,
      ),
    );
  }
  if (o.sheets) parts.push(`<a class="pill${o.sheets.on ? " on" : ""}" href="${o.sheets.href}">${escapeHtml(o.sheets.label)}</a>`);
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
  main: string;
  dev: boolean;
  siteUrl: string;
}

// Applies saved viewer preferences before first paint.
const PREFS = `try{var d=document.documentElement,s=localStorage;d.dataset.level=s.getItem("ln-level")||"B1";d.dataset.view=s.getItem("ln-view")||"guide";var t=s.getItem("ln-theme");if(t&&t!=="auto")d.dataset.theme=t}catch(e){}`;

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
  <div class="layout${o.nav ? "" : " no-nav"}">
    ${o.nav ? `<nav class="sidebar" id="sidebar">${o.nav}</nav>` : ""}
    <main class="content">${o.main}</main>
  </div>
  <script src="/client.js" defer></script>
</body>
</html>
`;
}

export const explainName = (explain: Explain) => EXPLAIN[explain];
