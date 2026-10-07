# Language Navigator

A reference library for learners of **English** and **Spanish** from level **A0 to B1**.
Every topic is explained in English and in Spanish.

**Live site:** https://specialistvlad.github.io/language-navigator/

The source is structured data: one `topic.yaml` per topic holds the full reference (tables,
rules, examples, typical errors) in both explanation languages, plus an **Essentials** block and
a **Reminder** block for each level. JSON Schemas define and validate every file. Markdown guides,
web pages and cheatsheets are generated from the data.

Cheatsheets come per topic, per section, per level and progressive across levels. The higher a
progressive sheet reaches, the more material it covers and the more concentrated it is.

## Web requirements

- Every page is rendered to static HTML, so search engines index all content.
- Every page has a dynamic layout: below 860 px the sidebar becomes a slide-out menu and the
  controls stack; wide tables scroll inside their box, never the page.
- Every page has a clean, stable, named URL, for example `/es/english/tenses/present-simple/`
  (rules in [languages/CONVENTIONS.md](languages/CONVENTIONS.md) §10).
- `npm start` rebuilds on every change and reloads the browser.

## Levels

| Level | Name | The learner can… |
|---|---|---|
| A0 | Starter (pre-A1) | recognise letters, numbers and a few fixed phrases |
| A1 | Beginner | introduce themselves, ask and answer simple everyday questions |
| A2 | Elementary | describe routines, past events and immediate needs |
| B1 | Intermediate | handle travel situations, describe experiences, give reasons and opinions |

## Layout

```
language-navigator/
├── README.md
├── ROADMAP.md                 project phases
├── languages/                 all language data
│   ├── CONVENTIONS.md         rules for the data
│   ├── curriculum.yaml        every planned topic, in study order
│   ├── concepts.yaml          concept keys that pair topics across languages
│   ├── schema/                JSON Schemas
│   ├── templates/topic.yaml   skeleton for a new topic
│   ├── en/                    English topics: {NN-section}/{topic}/topic.yaml
│   └── es/                    Spanish topics
├── apps/
│   └── web/                   web app
├── scripts/                   shared tooling: data loading, Markdown rendering, checks
└── build/                     generated output
```

## Commands

| Command | What it does |
|---|---|
| `bun install` | installs dependencies (Bun runs every script) |
| `npm start` | builds the site into `build/dev/`, serves it on port 47380 on every interface (open the printed network address on a phone), rebuilds and reloads on every change |
| `npm run build` | builds the static site into `build/web/`; `SITE_URL=https://… npm run build` sets the public URL; its path prefixes every link |
| `npm run check` | validates all data against the schemas and conventions |
| `npm run md` | writes every guide as Markdown to `build/md/` |

## Publishing

Pushing a tag publishes the site to GitHub Pages: the Publish workflow
(`.github/workflows/pages.yml`) takes the highest version tag, runs the checks, builds and
deploys it. Run workflow on the Actions tab redeploys the same tag.

```
git tag v0.2.0 && git push origin v0.2.0
```
