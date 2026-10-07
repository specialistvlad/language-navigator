# Language Navigator

A reference library for learners of **English** and **Spanish** from level **A0 to B1**.
Every topic is explained in English and in Spanish.

**Live site:** https://specialistvlad.github.io/language-navigator/

The source is structured data: one `topic.yaml` per topic holds a **cheatsheet** (the whole topic
in one table) and the full reference (tables, rules, examples, typical errors) in both explanation
languages. JSON Schemas define and validate every file. The web pages and cheatsheets are rendered
straight from the data.

**The data names meaning; the renderer decides how it looks.** Each field says what a piece of
content is: a paradigm, a helper verb, an ending, a date, a typical error. The renderer lays it out
for every view: wide and narrow screens, Cheatsheet and Extended, every level
([languages/CONVENTIONS.md](languages/CONVENTIONS.md) §12).

Each topic page opens with its cheatsheet as section 00; the View switch shows it alone or with the
full guide. Cheatsheet pages gather the cheatsheets per topic, per section, per level and up to a
level.

## Web requirements

- Every page is rendered to static HTML, so search engines index all content.
- Every page has a dynamic layout: below 860 px the sidebar becomes a slide-out menu and the
  controls stack; wide tables scroll inside their box, never the page.
- Every page has a clean, stable, named URL, for example `/es/english/tenses/simple-tenses/`
  (rules in [languages/CONVENTIONS.md](languages/CONVENTIONS.md) §10).
- `npm start` rebuilds on every change and reloads the browser.

## Levels

Defined in `languages/levels.yaml`, which the site reads.

| Level | Name | The learner can… |
|---|---|---|
| A0 | Starter (pre-A1) | recognise letters, numbers and a few fixed phrases |
| A1 | Beginner | introduce themselves, ask and answer simple everyday questions |
| A2 | Elementary | describe routines, past events and immediate needs |
| B1 | Intermediate | handle travel situations, describe experiences, give reasons and opinions |
| B2 | Upper intermediate | follow complex texts, talk fluently with native speakers and argue a point of view |
| C1 | Advanced | understand long, demanding texts and use the language flexibly at work and in study |
| C2 | Proficiency | understand virtually everything and express fine shades of meaning |

Every table row, bullet and paragraph carries its level; sections, topics and menu entries take
their range from what they hold. A badge shows one level as (A1) and a range as two joined halves,
(A1][B1), each in its own level's colour. The level filter shows what starts at or below the chosen
level ([languages/CONVENTIONS.md](languages/CONVENTIONS.md) §3).

## Layout

```
language-navigator/
├── README.md
├── ROADMAP.md                 project phases
├── languages/                 all language data
│   ├── CONVENTIONS.md         rules for the data
│   ├── site.yaml              product name, URLs, explanation languages
│   ├── levels.yaml            level scale: names, descriptions, colours
│   ├── interface.yaml         interface wording of the site
│   ├── curriculum.yaml        every planned topic, in study order
│   ├── concepts.yaml          concept keys that pair topics across languages
│   ├── schema/                JSON Schemas
│   ├── templates/topic.yaml   skeleton for a new topic
│   ├── en/                    English topics: {NN-section}/{topic}/topic.yaml
│   └── es/                    Spanish topics
├── apps/
│   └── web/                   web app
├── scripts/                   shared tooling: data loading, schema types, checks
└── build/                     generated output
```

## Commands

| Command | What it does |
|---|---|
| `bun install` | installs dependencies (Bun runs every script) |
| `npm start` | builds the site into `build/dev/`, serves it on port 47380 on every interface (open the printed network address on a phone), rebuilds and reloads on every change, and lists the same problems as `npm run check` |
| `npm run build` | builds the static site into `build/web/`; `SITE_URL=https://… npm run build` sets the public URL; its path prefixes every link |
| `npm run check` | validates all data against the schemas and conventions |
| `npm test` | unit tests, and checks on every built page that levels, badges and the filter agree with the data |
| `npm run e2e` | drives every topic and track page in Chromium at every level and view; `bunx playwright install chromium` installs the browser |
| `npm run typecheck` | type-checks the code under strict TypeScript (`tsconfig.json`) |
| `npm run lint` | lints the code with typescript-eslint's strict and stylistic type-checked rules (`eslint.config.js`) |
| `npm run format` | formats the code with Prettier; `npm run format:check` only reports |
| `npm run verify` | typecheck, lint, format check, data check, tests and browser tests together; CI runs it on every push and before publishing |

## Publishing

Pushing a tag publishes the site to GitHub Pages: the Publish workflow
(`.github/workflows/pages.yml`) takes the highest version tag, runs the checks, builds and
deploys it. Run workflow on the Actions tab redeploys the same tag.

```
git tag v0.2.0 && git push origin v0.2.0
```
