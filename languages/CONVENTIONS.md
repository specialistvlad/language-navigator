# Conventions

Rules for all language data. They keep the library consistent for readers, for the build
scripts and for the web app. `npm run check` enforces them.

## 1. Languages and variants

- Two languages are covered, each learned and each used for explanations: English (`en`) and
  Spanish (`es`).
- Every topic exists in every explanation language. With `en` and `es` that makes 4 learning
  tracks: en explained in en, en explained in es, es explained in en, es explained in es.
- Explanations use short sentences, present tense and plain words.
- **English** topics use British spelling and British IPA. US differences appear inline, prefixed
  `US:`, for example *at the weekend (US: on the weekend)*.
- **Spanish** topics use Peninsular Spanish, with `vosotros` in every verb table. Latin American
  differences appear inline, prefixed `LatAm:`.

## 2. Data files

Structured YAML is the source; Markdown and HTML are generated from it.

```
languages/
├── curriculum.yaml                 every planned topic, in study order
├── concepts.yaml                   concept keys that pair topics across languages
├── schema/                         JSON Schemas for the three file types
├── templates/topic.yaml            skeleton for a new topic
├── en/05-tenses/present-simple/topic.yaml
└── es/02-conjugation/presente-regular/topic.yaml
```

| File | Schema | Holds |
|---|---|---|
| `curriculum.yaml` | `schema/curriculum.schema.json` | languages → sections → topics (slug, levels, optional title) |
| `concepts.yaml` | `schema/concepts.schema.json` | concept key → title, description |
| `{lang}/{NN-section}/{topic}/topic.yaml` | `schema/topic.schema.json` | one topic, all explanation languages |

- Each language has its own sections, following that language's learning path. The hardest
  foundation of a language gets its own early section (Spanish: `02-conjugation`).
- `NN-section`: a two-digit number plus a slug. The number sets the study order of sections
  within the language; the order of `topics` in `curriculum.yaml` sets the order inside a section.
- `topic`: kebab-case ASCII, meaning lowercase letters, digits and hyphens. Spanish slugs drop
  accents and ñ: `preterito-indefinido`.
- **ID**: `{lang}.{section slug without number}.{topic}`, for example `en.tenses.present-simple`.
- A topic file starts with `# yaml-language-server: $schema=../../../schema/topic.schema.json`,
  which gives editors validation and completion.

## 3. Levels

| Level | Name |
|---|---|
| `A0` | Starter (pre-A1) |
| `A1` | Beginner |
| `A2` | Elementary |
| `B1` | Intermediate |

- A topic lists every level it covers in `levels`; it matches the range in `curriculum.yaml`.
- Every section has a `level`: one level or a range, `A1-A2`.
- A table row, bullet or text item above its section's level carries its own `level`.
- A table with row levels renders a `Level` / `Nivel` column.
- Level markers appear only where they inform. A topic at a single level shows its level once,
  in the header; a multi-level topic marks the headings, rows and bullets whose level differs.

## 4. Text values

| Type | Form | Use |
|---|---|---|
| plain | `"I **live** in Madrid."` | same in every explanation language: examples, forms, symbols |
| localized | `{ en: "…", es: "…" }` | explanation text |
| example | `{ ex: "Vivo aquí.", tr: { en: "I live here." } }` | an example with its translations |
| item | `{ text, ex, tr, level, for }` | a bullet or paragraph combining explanation and example |

- Inline formatting inside strings: `**bold**` marks the target form, `*italic*` marks a gloss.
- Bold opens at the start of a word or right after an apostrophe, and closes at the end of a word or
  after punctuation: `I'**m**`, `work**s**`, `**If it rains,** we'll…`.
- Links point to topic IDs: `[To be](id:en.verbs.to-be)`. The renderers turn them into
  page or file links in the reader's explanation language.
- `for: [es]` limits an element to the listed explanation languages. Use it for notes,
  sections or error rows that serve one group of readers.
- A localized value carries every explanation language that renders it.

## 5. Topic structure

| Field | Content |
|---|---|
| `id`, `lang`, `kind`, `levels`, `tags`, `concepts`, `related` | identity and links |
| `status` | `draft` or `approved`, per explanation language |
| `title`, `summary` | localized; the summary is 3–10 sentences, and its first sentence is a one-line description that stands alone |
| `sections` | the full guide, in order |
| `essentials` | one entry per level: the cheatsheet source (§8) |
| `reminders` | per level: the traps that persist at higher levels (§8) |

**A language reference.** Every topic explains a part of the language system through its rules:
sounds, writing, numbers, dates and time, grammar. Words appear as examples of a rule.

**One subject per topic.** A topic answers the question its title asks. Material that answers
another question belongs to its own topic in `curriculum.yaml`: capital letters and spelling aloud
belong in topics of their own, outside "The Alphabet".

**Sections are a menu.** The sections below are the ones a topic may use, in this order. A topic
includes a section only when it has content of its own for it, Typical errors included; a short
topic with one strong section is complete.

Grammar sections:

| # | Title `en` | Title `es` | Content |
|---|---|---|---|
| 1 | Overview | Resumen | one table showing the whole topic at once |
| 2 | Form: … | Forma: … | one section per form: affirmative, negative, questions… |
| 3 | Spelling: … | Ortografía: … | spelling rules for the forms |
| 4 | Pronunciation: … | Pronunciación: … | sound rules, with IPA |
| 5 | Use | Uso | table: use, example, row levels |
| 6 | Signal words | Palabras clave | time words, frequency words, typical companions |
| 7 | (topic-specific) | (topic-specific) | anything the topic needs (e.g. Stative verbs) |
| 8 | Compare: … | Comparación: … | the closest related topic, side by side |
| 9 | Typical errors | Errores típicos | an `errors` block with `audience: true`, when the subject has characteristic errors |

`related` lists related topics by ID; guides carry no links section.

The section set for foundations topics is fixed by its pilot topics and is recorded here at that
point.

Block types inside `content`:

| Type | Fields | Renders as |
|---|---|---|
| `text` | `text`, `ex`, `tr` | a paragraph |
| `bullets` | `items` | a bullet list |
| `table` | `columns` (`key`, `label`), `rows` (cells by key, `level`, `tr`, `for`) | a table; `\n` in a cell starts a new line |
| `errors` | `rows` (`wrong`, `right`, `rule`, `for`), `audience` | a ✗ / ✓ / rule table |

## 6. Translations and readers

- When the explanation language differs from the language being learned, every example carries
  a translation into it: `tr` on a row adds an `English` / `Español` column; `tr` on an item or an
  example cell renders as *— translation* after the example.
- When the two languages are the same, examples stand alone.
- A form grid (one cell lists the form for every person, one per line) stands alone in every track:
  it shows the pattern, and the examples below it carry the translations.
- Typical errors match the readers. When the explanation language differs from the language
  being learned, rows list errors typical of speakers of the explanation language, and the
  table opens with an audience line. Rows with `for` serve one group; rows without serve all.

## 7. Tables and writing style

- A rendered table has at most 4 columns, counting the generated translation and level columns,
  so it fits A4 portrait, a tablet and a phone screen.
- The first column holds the key: person, form, use or rule.
- Each fact appears once in the sections. A topic is a short path through its sections, not a
  set of overlapping views: regroupings, highlight lists and summaries of data shown in another
  section stay out of the guide. Summaries belong in Essentials and Reminders (§8).
- Tables first. Use text only for a rule that a table cannot hold.
- One rule per bullet, at most 20 words.
- State the correct form. Incorrect forms appear only in `errors` blocks.
- Examples use everyday vocabulary at or below the section's level.
- Pronunciation is in IPA between slashes: /wɜːks/.
- Form placeholders: `V` = base verb, `V-s`, `V-ing`, `V-ed`. Spanish: stem + ending, `habl-` + `-o`.

| Symbol | Meaning |
|---|---|
| ✓ | correct |
| ✗ | incorrect |
| → | becomes / changes to |
| / | alternative |
| ( ) | optional part |
| … | the list continues |
| `US:` `LatAm:` | variant note |

## 8. Essentials, reminders and cheatsheets

Cheatsheets are generated from the `essentials` and `reminders` of the topics. On the web, the
Guide view shows the sections; Essentials and Reminders appear in the Essentials view and in the
cheatsheets.

**Essentials** — one entry for each level in `levels`:

- Self-contained: it reads correctly on its own.
- `parts`, in this order: Form / Forma → Key rules / Reglas clave → Use / Uso →
  Top errors / Errores principales.
- A level that adds a few points uses `content` with one table instead: Point, Rule, Example.
- Every fact in it appears in the sections.

**Reminders** — for a level, the distilled essence: only the traps that still catch learners at
higher levels. A level with nothing that qualifies has no reminder.

**Generated sets** — for each of the 4 tracks:

| Set | Content |
|---|---|
| Per level: A0, A1, A2, B1 | that level's Essentials |
| Progressive: A0–A1, A0–A2, A0–B1 | the top level's Essentials + the Reminders of every level below |
| Per topic | one topic, all its levels |
| Per section | one section, in topic order |

The higher a progressive sheet reaches, the more material it covers and the more concentrated
it is; A0–B1 is the essence of all levels together.

## 9. Concepts

Topics in different languages pair through shared `concepts` keys. Every key lives in
`concepts.yaml`; a new key is added there before a topic uses it.

## 10. URLs

Every page has a clean, stable, named URL. This is a requirement for every app and output.

```
/                                              home
/{explain}/{language}/                         track home
/{explain}/{language}/{section}/{topic}/       topic
/{explain}/{language}/cheatsheets/             cheatsheet index
/{explain}/{language}/cheatsheets/{sheet}/     cheatsheet
```

| Segment | Value | Example |
|---|---|---|
| `{explain}` | explanation language code | `en`, `es` |
| `{language}` | `slug` of the learned language in `curriculum.yaml` | `english`, `spanish` |
| `{section}` | section slug, without its number | `tenses`, `conjugation` |
| `{topic}` | topic slug | `present-simple` |
| `{sheet}` | `a0`…`b1` (level), `a0-a1` / `a0-a2` / `a0-b1` (progressive), `{section}`, `{section}/{topic}` | `a0-b1` |

- URLs use lowercase ASCII letters, digits, hyphens and slashes, and end with `/`.
- URLs come from slugs, never from titles. A published slug stays fixed.
- Page state never travels in percent-encoded text, query strings or fragments. Viewer
  preferences (level filter, view, theme) live in the browser.
- Section slugs are unique within a language; topic slugs are unique within a section.

## 11. Workflow per topic

Topics are written one at a time. The next topic starts only after the current one is approved.

1. Copy `templates/topic.yaml` into the topic folder and write it in both explanation languages,
   with its essentials and reminders; set `status` to `draft` for both.
2. Run `npm run check` until it reports no problems.
3. Hand the topic to the owner for review in the web app (`npm start`).
4. Apply the requested changes; repeat until the owner approves.
5. Set `status` to `approved` for both explanation languages.
6. Move to the next topic in `curriculum.yaml` order.
