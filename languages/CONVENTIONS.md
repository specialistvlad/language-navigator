# Conventions

Rules for all language data. They keep the library consistent for readers, for the build
scripts and for the web app. `npm run check` enforces them.

**The data names meaning; the renderer decides how it looks.** Every field, block, mark and
attribute says what a piece of content is: a paradigm cell, a helper verb, an ending, a typical
error. The renderer lays it out for every view: wide and narrow screens, Cheatsheet and Extended,
every level. §12 holds the vocabulary and the move to it.

## 1. Languages and variants

- English (`en`) is the language being learned and the explanation language: one learning
  track, English explained in English.
- Every topic exists in every explanation language.
- Explanations use short sentences, present tense and plain words.
- **English** topics use British spelling and British IPA. US differences appear inline, prefixed
  `US:`, for example *at the weekend (US: on the weekend)*.

## 2. Data files

Structured YAML is the source; the web pages are rendered from it.

```
languages/
├── site.yaml                       product name, URLs, explanation languages
├── levels.yaml                     level scale: names, descriptions, colours
├── interface.yaml                  interface wording of the site
├── curriculum.yaml                 every planned topic, in study order
├── concepts.yaml                   concept keys that pair topics across languages
├── schema/                         JSON Schemas for every file type
├── templates/topic.yaml            skeleton for a new topic
└── en/05-tenses/simple-tenses/topic.yaml
```

| File | Schema | Holds |
|---|---|---|
| `site.yaml` | `schema/site.schema.json` | product name, URLs, explanation languages with their names and `enabled` switch |
| `levels.yaml` | `schema/levels.schema.json` | the level scale: code, name, description, hue per level |
| `interface.yaml` | `schema/interface.schema.json` | interface wording by key, per explanation language; block headings and column titles the generator writes |
| `curriculum.yaml` | `schema/curriculum.schema.json` | languages (with an `enabled` switch) → sections → topics (slug, optional title, levels of a planned topic) |
| `concepts.yaml` | `schema/concepts.schema.json` | concept key → title, description |
| `{lang}/{NN-section}/{topic}/topic.yaml` | `schema/topic.schema.json` | one topic, all explanation languages |

`enabled: false` on a language being learned (`curriculum.yaml`) or an explanation language
(`site.yaml`) keeps it from readers; its data stays and `npm run check` still validates it.

- Each language has its own sections, following that language's learning path. The hardest
  foundation of a language gets its own early section.
- `NN-section`: a two-digit number plus a slug. The number sets the study order of sections
  within the language; the order of `topics` in `curriculum.yaml` sets the order inside a section.
- `topic`: kebab-case ASCII, meaning lowercase letters, digits and hyphens.
- **ID**: `{lang}.{section slug without number}.{topic}`, for example `en.tenses.simple-tenses`.
- A topic file starts with `# yaml-language-server: $schema=../../../schema/topic.schema.json`,
  which gives editors validation and completion.

## 3. Levels

`levels.yaml` defines the scale, lowest first; every app takes level codes, names, descriptions
and colours from it, and the schemas list exactly its codes (`npm run check` compares them).

| Level | Name |
|---|---|
| `A0` | Starter (pre-A1) |
| `A1` | Beginner |
| `A2` | Elementary |
| `B1` | Intermediate |
| `B2` | Upper intermediate |
| `C1` | Advanced |
| `C2` | Proficiency |

**Levels live on the leaves.** Every leaf carries its `level`: a table row, an errors row, a
bullet, a text block. Everything above a leaf takes its range from the leaves under it, from the
lowest level to the highest: a block, a section, the cheatsheet, the topic, and a curriculum
section in the menu.

- A written topic's range comes from its data. A planned topic's entry in `curriculum.yaml`
  gives `levels`, one level or a range such as `A1-B1`, until its topic file exists.
- The cheatsheet's range lies within the range of the sections.
- `npm run check` enforces these rules; `npm test` and `npm run e2e` test the pages built from them.

**Levels on the page.**

- Each level has a colour, and the levels run through the rainbow, lowest first: A0 red, A1
  orange, A2 yellow, B1 green, B2 blue, C1 indigo, C2 violet. `levels.yaml` gives each level its
  hue; each theme gives every level the same tones (`apps/web/level-colours.ts`): a lightness, and a
  saturation that takes the same share of the chroma sRGB holds at each hue. The light theme writes
  a deep code on a pale tint and the dark theme a bright code on a deep tint, so a level keeps its
  colour in both. Every level colour lies inside sRGB (`npm test` checks it), and a level's code
  reads on its tint at a contrast of at least 4.5:1 in both themes (`npm run e2e` measures it).
- A badge for one level is one pill, (A1). A badge for a range joins two halves, (A1][B1): the
  lowest level on the left, the highest on the right, each in its own level's colour.
- In a list (the menu, the rail, the track index, Up next) the halves share one width and the badges
  line up in two columns: lowest levels in the first, highest in the second. A single level sits in
  the first column and leaves the second empty.
- The level switcher writes each code in its level's colour and tints the levels from the lowest up
  to the chosen one: the levels the page shows.
- The topic title, section headings, the rail and the menu show their range. A block shows its
  range when it starts above its section; a leaf shows its level when it sits above its block's
  lowest level. A topic at a single level shows its level once, in the header.
- The level filter hides every element that starts above the chosen level, so a block hides with
  its last leaf and a menu entry with its topic. A badge keeps its range at every level; the half above
  the chosen level fades to an outline: at A2, (A1][B1) keeps its B1 half faded. The rail keeps every entry and greys out the ones the filter hides.

## 4. Text values

| Type | Form | Use |
|---|---|---|
| plain | `"I **live** in Madrid."` | same in every explanation language: examples, forms, symbols |
| localized | `{ en: "…" }` | explanation text |
| example | `{ ex: "I **live** here.", tr: { … } }` | an example with its translations (§6) |
| item | `{ level, text, ex, tr, for }` | a bullet: explanation, example or both, with its level |

- Inline formatting inside strings: `**bold**` marks the target form, `*italic*` marks a gloss.
  Bold also carries helpers, endings, stressed syllables, corrections and words under
  discussion, and italic carries phrases in the reader's language and respellings; §12 gives
  each meaning its own mark.
- Links point to topic IDs: `[To be](id:en.verbs.to-be)`. The renderer turns them into page
  links in the reader's explanation language.
- `for: [en]` limits an element to the listed explanation languages. Use it for notes,
  sections or error rows that serve one group of readers.
- A localized value carries every explanation language that renders it.

## 5. Topic structure

| Field | Content |
|---|---|
| `id`, `lang`, `kind`, `tags`, `concepts`, `related` | identity and links |
| `status` | `draft` or `approved`, per explanation language |
| `title`, `summary` | localized; the summary follows the rules below |
| `cheatsheet` | `content`: the whole topic in one table, section 00 (§8) |
| `sections` | the full guide, in order |

**The summary.** The page shows the summary above the guide; topic cards and the meta description
show its first sentence. It is two sentences, at most 50 words:

1. **The lead** names the forms and what they do, so it stands alone in a search result or on a
   card: "Can for ability, permission and requests; could for past ability, polite requests and
   possibility." It starts with a capital letter and has at most 160 characters.
2. **The rule to get right**: the one rule a learner most needs, with an example that marks the
   target form in bold: "Can and could never change and take the base verb without to: She **can**
   swim. **Can** she swim?"

Both sentences talk about the language itself. The rail lists the sections and the badges show the
levels, so each sentence opens with a form, a meaning or a rule. Each explanation language has its
own summary, written for its readers.
`npm run check` enforces the length, the capital letter, and sentences free of page tours, level
codes and openers such as "You need it to…".

**A language reference.** Every topic explains a part of the language system through its rules:
sounds, writing, numbers, dates and time, grammar. Words appear as examples of a rule.

**One subject per topic.** A topic answers the question its title asks. Material that answers
another question belongs to its own topic in `curriculum.yaml`: capital letters and spelling aloud
belong in topics of their own, outside "The Alphabet".

**Sections are a menu.** The sections below are the ones a topic may use, in this order. A topic
includes a section only when it has content of its own for it, Typical errors included; a short
topic with one strong section is complete.

Grammar sections:

| # | Title | Content |
|---|---|---|
| 1 | Overview | the rules that hold across the whole topic |
| 2 | Form: … | one section per form: affirmative, negative, questions… |
| 3 | Spelling: … | spelling rules for the forms |
| 4 | Pronunciation: … | sound rules, with IPA |
| 5 | Use | table: use, example, row levels |
| 6 | Signal words | time words, frequency words, typical companions |
| 7 | (topic-specific) | anything the topic needs (e.g. Stative verbs) |
| 8 | Compare: … | the closest related topic, side by side |
| 9 | Typical errors | an `errors` block, when the subject has characteristic errors |

`related` lists related topics by ID; guides carry no links section.

The section set for foundations topics is fixed by its pilot topics and is recorded here at that
point.

Block types inside `content`:

| Type | Fields | Renders as |
|---|---|---|
| `text` | `level`, `text`, `ex`, `tr` | a paragraph |
| `bullets` | `items`, each an item with its `level` | a bullet list |
| `table` | `columns` (`key`, `label`, `group`, `merge`, `center`, `for`), `rows` (cells by key, `level`, `tr`, `for`) | a table; `\n` in a cell starts a new line; a row without a key leaves that cell empty |
| `errors` | `rows` (`level`, `wrong`, `right`, `rule`, `for`) | a ✗ / ✓ / rule table |

§12 names the blocks the data moves to: each names its content, and the renderer picks its
layout.

## 6. Translations and readers

- When the explanation language differs from the language being learned, every example carries
  a translation into it: `tr` on a row adds a column named after the explanation language; `tr` on an item or an
  example cell renders as *— translation* after the example.
- When the two languages are the same, examples stand alone.
- A form grid or a slot table (§7) stands alone in every track: it shows the pattern, and the
  examples below it carry the translations.
- Typical errors match the readers. When the explanation language differs from the language
  being learned, rows list errors typical of speakers of the explanation language. Rows with
  `for` serve one group; rows without serve all.

## 7. Tables and writing style

- A rendered table has at most 4 columns, counting the generated translation column,
  so it fits A4 portrait, a tablet and a phone screen. A slot table has at most 10.

**Slot tables** lay a sentence out word by word, one column per slot, so a row reads across as
the sentence. The tense cheatsheets use one: Tense, then Question (Helper, Subject, Verb), Statement
(Subject, Helper, Verb) and Negative (Subject, Helper, Verb), one row per person.

- `group` titles neighbouring columns in a second header row: Question, Statement, Negative. An
  empty column separates two groups.
- `merge` joins a cell to the one above when both read the same and their rows share a level.
  A merged first column splits the table into blocks with an empty row between them; merges stay
  inside a block. A table with a `merge` column renders with compact rows.
- `center` centres a column's cells and title both ways; slot columns use it, Subject stays left.
- A slot with nothing in it, such as the helper of a present statement, is a key the row leaves out.
- `group`, `merge` and `center` move to the renderer: §12 holds a slot table as a `paradigm`
  whose sentences mark their slots, and the renderer builds the columns from the marks.
- Subjects are one per row, lowercase after a helper and capitalised at the start of a sentence.
- The first column holds the key: person, form, use or rule.
- Each fact appears once in the sections. A topic is a short path through its sections, not a
  set of overlapping views: regroupings, highlight lists and summaries of data shown in another
  section stay out of the guide. The summary of the whole topic is its cheatsheet (§8).
- Tables first. Use text only for a rule that a table cannot hold.
- One rule per bullet, at most 20 words.
- State the correct form. Incorrect forms appear only in `errors` blocks.
- Examples use everyday vocabulary at or below the section's level.
- Pronunciation is in IPA between slashes: /wɜːks/.
- Form placeholders: `V` = base verb, `V-s`, `V-ing`, `V-ed`.

| Symbol | Meaning |
|---|---|
| ✓ | correct |
| ✗ | incorrect |
| → | becomes / changes to |
| / | alternative |
| ( ) | optional part |
| … | the list continues |
| `US:` | variant note |

Where →, / or — joins two examples or forms, §12 writes the pair as a field: `mapping`,
`alternatives` or `exchange`.

## 8. Cheatsheets

Every topic has one `cheatsheet`: the whole topic in one table, on one screen. Each row carries its
`level`, and the cheatsheet's range runs from its lowest row to its highest (§3).

- Every fact in it appears in the sections.
- One table: forms and patterns, the key rules and the top traps. A topic built on a verb pattern
  uses a slot table (§7).
- On a topic page it is section **00 Cheatsheet**. The View switch shows it alone (**Cheatsheet**)
  or followed by sections 01 onwards (**Extended**).

**Generated sets** — for each track:

| Set | Content |
|---|---|
| Per level: A0, A1, … | the cheatsheets of the topics at that level, rows up to that level |
| Progressive: A0–A1, A0–A2, … | the cheatsheets of every topic up to the top level, rows up to that level |
| Per topic | one topic's cheatsheet |
| Per section | one section's cheatsheets, in topic order |

## 9. Concepts

Topics in different languages pair through shared `concepts` keys. Every key lives in
`concepts.yaml`; a new key is added there before a topic uses it.

## 10. URLs

Every page has a clean, stable, named URL.

```
/                                              home
/{explain}/{language}/                         track home
/{explain}/{language}/{section}/{topic}/       topic
/{explain}/{language}/cheatsheets/             cheatsheet index
/{explain}/{language}/cheatsheets/{sheet}/     cheatsheet
```

| Segment | Value | Example |
|---|---|---|
| `{explain}` | explanation language code | `en` |
| `{language}` | `slug` of the learned language in `curriculum.yaml` | `english` |
| `{section}` | section slug, without its number | `tenses`, `foundations` |
| `{topic}` | topic slug | `simple-tenses` |
| `{sheet}` | `a0`…`c2` (level), `a0-a1`…`a0-c2` (progressive), up to the highest level the topics reach; `{section}`, `{section}/{topic}` | `a0-b1` |

- URLs use lowercase ASCII letters, digits, hyphens and slashes, and end with `/`.
- URLs come from slugs, never from titles. A published slug stays fixed.
- A page carries the choice of each switch it has in query parameters, so a shared link opens the
  same state: `?level=a0`…`?level=c2` on topic and track pages, `?view=cheatsheet` or
  `?view=extended` on topic pages. A page opened without them takes the reader's last choice, and
  the highest level and Extended the first time. The theme lives in the browser.
- Page state never travels in percent-encoded text or fragments.
- Section slugs are unique within a language; topic slugs are unique within a section.

## 11. Workflow per topic

Topics are written one at a time. The next topic starts only after the current one is approved.

1. Copy `templates/topic.yaml` into the topic folder and write it in every explanation language,
   with its cheatsheet; set `status` to `draft` for each.
2. Run `npm run check` until it reports no problems.
3. Hand the topic to the owner for review in the web app (`npm start`).
4. Apply the requested changes; repeat until the owner approves.
5. Set `status` to `approved` for every explanation language.
6. Move to the next topic in `curriculum.yaml` order.

## 12. Semantic data

The data says what each piece of content is; the renderer decides how it looks. Topics move to the
vocabulary below one at a time (ROADMAP phase 4), and `npm run check` enforces each name once it
lands. A topic keeps the forms of §4–§8 until it moves.

**Rules**

1. Fields name content. The renderer picks the layout and the views that show it: merged cells,
   column groups, centring, line breaks, the Cheatsheet and Extended views, wide and narrow
   screens.
2. One name, one meaning. Every field, block, mark and attribute comes from this section.
3. A string holds one piece of text. Lists, alternatives, patterns, exchanges and mappings are
   fields of their own.
4. Each fact lives in one place, and the build derives what follows from it: the translation
   column, the cheatsheet sets.
5. Text in the language being learned keeps its written form: it is the lesson. A mark adds what
   the text means, such as the date "the third of July" names.
6. Grammar carries features from one list, after the UniMorph schema:

| Feature | Values |
|---|---|
| `person` | `1`, `2`, `3` |
| `number` | `sg`, `pl` |
| `tense` | `prs`, `pst`, `fut` |
| `aspect` | `prog`, `prf` |
| `mood` | `ind`, `imp`, `sbjv`, `cond` |
| `polarity` | `pos`, `neg` |
| `interrogativity` | `decl`, `int` |
| `politeness` | `infm`, `form` |

A question, a statement and a negative differ in interrogativity and polarity. *We* is person
`1`, number `pl`; *she* is person `3`, number `sg`.

**Topic and sections**

| Field | Holds | Replaces |
|---|---|---|
| `summary.lead`, `summary.rule` | the two sentences of the summary (§5), one field each | one string, the lead cut at its first full stop |
| section `role` | the section's place in the §5 menu: `overview`, `form`, `spelling`, `pronunciation`, `use`, `signals`, `own`, `compare`, `errors` | the role read from the title |

**Blocks**

| Block | Holds | Replaces |
|---|---|---|
| `paradigm` | cells labelled with features, each a form or a sentence | slot tables, form grids, principal parts |
| `usage` | uses or rules, each with its examples | `use · example`, `point · rule · example`, `pattern · example` tables |
| `comparison` | items side by side under named columns | the other tables |
| `list` | items typed `rule`, `note` or `example` | `bullets` |
| `prose` | a paragraph | `text` |
| `errors` | wrong, right, rule | `errors`, as it is |

**Examples**

| Field | Holds | Replaces |
|---|---|---|
| `ex`, `tr` | an example and its translations | `ex`, `tr`, as they are |
| `alternatives` | forms or examples that each work | " / " between them |
| `exchange` | a question and its answer | " — " between them |
| `mapping` | a form and what it becomes | "→" between them |
| `pattern` | the slots of a sentence pattern, in order | "wh-word + do / does + subject + verb" |

**Inline marks**

| Mark | Marks | Example | Marked part |
|---|---|---|---|
| `target` | the form the topic teaches; in an error, the corrected part | I used to play football. | used to play |
| `aux` | a helper verb | Does she work? | Does |
| `subj`, `verb` | the subject and the main verb of a pattern sentence | Does she work? | she, work |
| `ending` | an ending added to a stem | works | s |
| `stress` | the stressed syllable | photograph | pho |
| `term` | a word of the language being learned, discussed in an explanation | *yet* goes at the end | yet |
| `gloss` | a meaning in the reader's language | fortnight: two weeks | two weeks |
| `l1` | a phrase in the reader's first language | a note's phrase in the reader's language | the whole phrase |
| `sound` | a pronunciation respelling | used to sounds like use-ta | use-ta |
| `ipa` | an IPA transcription | /ˈjuːst tə/ | ˈjuːst tə |
| `date` | a date, with its ISO 8601 value: `2026-07-03`, `--07-03`, `2026` | the third of July | the third of July = `--07-03` |
| `weekday` | a day of the week, with its ISO 8601 number, Monday `1` | on Monday | Monday = `1` |
| `time` | a clock time, with its 24-hour value | half past ten | half past ten = `10:30` |
| `number` | a number, with its value in digits | two hundred | two hundred = `200` |
| `link` | another topic, by ID | see To be | To be = `en.verbs.to-be` |

The value of a `date`, `weekday`, `time` or `number` mark is the same in every language: the
renderer can show it in the reader's language beside the lesson's written form. The syntax of
every mark follows the source format the phase 4 spike settles.

**Attributes**

| Attribute | Holds | Replaces |
|---|---|---|
| `level` | the item's level (§3) | `level`, as it is |
| `readers` | the explanation languages an element serves | `for` on notes, sections and columns |
| `l1` | the speakers an error is typical for | `for` on error rows |
