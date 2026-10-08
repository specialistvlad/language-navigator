# langs123

English grammar from **A0 to B1**, explained in English. Every topic opens with a cheatsheet of the
whole topic, then rules, examples and typical errors, each marked with its CEFR level.

**Site:** https://langs123.com

## How it works

- **The content is data.** One `topic.yaml` per topic holds the cheatsheet and the full reference;
  JSON Schemas define every file and `npm run check` validates it
  ([languages/CONVENTIONS.md](languages/CONVENTIONS.md)).
- **The data names meaning; the renderer decides how it looks.** Each field says what a piece of
  content is, such as a paradigm, a helper verb or a typical error, and the web app lays it out for
  every screen, view and level (CONVENTIONS.md §12).
- **Levels live on every line.** Each row, bullet and paragraph carries its level from A0 to C2
  (`languages/levels.yaml`); the level filter shows what starts at or below the chosen level, and
  badges show each range in its levels' colours (CONVENTIONS.md §3).
- **The site is static HTML.** Each topic page offers a Cheatsheet and an Extended view; cheatsheet
  pages gather the cheatsheets per topic, section and level. The menu groups the topics **by level**,
  following the study path, or by **category** (CONVENTIONS.md §2). Every page has a clean, stable
  URL (CONVENTIONS.md §10) and reads on screens of every width.

## Quick start

[Bun](https://bun.sh) runs every script.

```
bun install
npm start          # the site at http://127.0.0.1:47380, rebuilt and reloaded on every change
npm run verify     # every check CI runs
```

## Layout

```
language-navigator/
├── languages/                 all content: the CC BY 4.0 part of the project
│   ├── CONVENTIONS.md         rules for the data
│   ├── site.yaml              product name, URLs, credit and licences, explanation languages
│   ├── levels.yaml            level scale: names, descriptions, colours
│   ├── interface.yaml         interface wording
│   ├── curriculum.yaml        every planned topic: sections by category, and the study path
│   ├── concepts.yaml          concept keys that pair topics across languages
│   ├── schema/                JSON Schemas
│   ├── templates/topic.yaml   skeleton for a new topic
│   └── en/                    English topics: {NN-section}/{topic}/topic.yaml
├── apps/web/                  the web app
├── scripts/                   shared tooling: data loading, schema types, checks
├── ROADMAP.md                 project phases
└── build/                     generated output
```

## Commands

| Command | What it does |
|---|---|
| `npm start` | serves the site from `build/dev/` on port 47380 on every interface (open the printed network address on a phone), rebuilds and reloads on every change, and lists the problems `npm run check` finds |
| `npm run build` | builds the static site into `build/web/`; `SITE_URL=https://… npm run build` sets the public URL |
| `npm run check` | validates all data against the schemas and conventions |
| `npm test` | unit tests, and checks on every built page |
| `npm run e2e` | drives every topic and track page in Chromium at every level and view; `bunx playwright install chromium` installs the browser |
| `npm run typecheck` | strict TypeScript |
| `npm run lint` | typescript-eslint's strict and stylistic type-checked rules |
| `npm run format` | Prettier; `npm run format:check` only reports |
| `npm run verify` | all of the checks above; CI runs it on every push and pull request |

## Publishing

langs123.com is deployed by hand from a version tag or a commit:

```
git tag v0.3.0 && git push origin v0.3.0
```

A build with `UMAMI_WEBSITE_ID` set adds the Umami script to every page, counting visits on the site's
own host; `UMAMI_SCRIPT_URL` points it at a self-hosted script. The langs123.com deploy sets them.

## Contributing

Teachers, learners and native speakers keep the library correct and growing: report a mistake from
the [credits page](https://langs123.com/credits/), or change a topic with *Edit on GitHub* at the top
of its page. [CONTRIBUTING.md](CONTRIBUTING.md) holds the rules;
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) holds the rules for the community.

## Licence

| Part | Licence |
|---|---|
| Content: everything in `languages/` | [CC BY 4.0](languages/LICENSE) |
| Code: everything else | [MIT](LICENSE) |

Anyone may copy, adapt and sell the content, with this credit, naming any changes:

> langs123 contributors, https://langs123.com — CC BY 4.0

The site's [credits page](https://langs123.com/credits/) holds the same. The reference stays free:
everything rendered from this data stays open on langs123.com, and the data stays open here. The
name langs123 and its logo stay with the project, outside both licences.
