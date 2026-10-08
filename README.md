# langs123

The foundations of languages as open data: sounds, writing, numbers, dates, time and grammar, every
line marked with its CEFR level. Each language being learned is explained in each explanation
language, so the library grows as N languages, each explained in N languages. It holds English from
A0 to B1, explained in English.

**Site:** https://langs123.com

## The library

- **Tracks.** A track is one language being learned, explained in one explanation language. One
  topic file holds a topic for every explanation language, and concept keys pair the same subject
  across languages ([languages/CONVENTIONS.md](languages/CONVENTIONS.md) §1, §9).
- **Topics.** Each topic explains one part of the language system: a summary, a cheatsheet of the
  whole topic, then rules, examples and typical errors (§5, §8).
- **Levels on every line.** Each row, list item and paragraph carries its level from A0 to C2, and
  everything above it takes its range from them (§3).
- **Semantic data.** Each field names what a piece of content is, such as a paradigm, a helper verb or
  a typical error, with grammar features after UniMorph; the renderer decides how it looks (§12).
- **Checked.** JSON Schemas define every file, and `npm run check` validates the data against them and
  the conventions.

The web app in `apps/web/` renders the library as a static site.

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
├── languages/                 the library: the CC BY 4.0 part of the project
│   ├── CONVENTIONS.md         rules for the data
│   ├── site.yaml              name, URLs, credit and licences, explanation languages
│   ├── levels.yaml            level scale: names, descriptions, colours
│   ├── interface.yaml         interface wording
│   ├── curriculum.yaml        languages being learned: topics by category, and the study path
│   ├── concepts.yaml          concept keys that pair topics across languages
│   ├── schema/                JSON Schemas
│   ├── templates/topic.yaml   skeleton for a new topic
│   └── {lang}/                topics of a language being learned: {NN-section}/{topic}/topic.yaml
├── apps/web/                  the web app
├── scripts/                   shared tooling: data loading, schema types, checks
├── ROADMAP.md                 project phases
└── build/                     generated output
```

## Commands

| Command | What it does |
|---|---|
| `npm start` | serves the site from `build/dev/` on port 47380 on every interface (open the printed network address on a phone), rebuilds and reloads on every change, and lists the problems `npm run check` finds |
| `npm run build` | builds the static site into `build/web/`; `SITE_URL=https://…` sets the public URL, `UMAMI_WEBSITE_ID` adds Umami analytics |
| `npm run check` | validates all data against the schemas and conventions |
| `npm test` | unit tests, and checks on every built page, side by side; fails below full line and function coverage of the modules `bunfig.toml` holds to it; `bun test <file>` runs one file |
| `npm run e2e` | drives every topic and track page in Chromium at every level and view, each test file side by side; `bunx playwright install chromium` installs the browser |
| `npm run typecheck` | strict TypeScript |
| `npm run lint` | typescript-eslint's strict and stylistic type-checked rules |
| `npm run format` | Prettier; `npm run format:check` only reports |
| `npm run verify` | all of the checks above, side by side, each in a process of its own (`scripts/verify.ts`); CI runs it on every push and pull request |

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

The site's [credits page](https://langs123.com/credits/) holds the same. The data stays open here,
and the reference built from it stays free on langs123.com. The name langs123 and its logo stay with
the project, outside both licences.
