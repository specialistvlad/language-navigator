# Conventions

Rules for all language data. They keep the library consistent for readers, for the build
scripts and for the web app. `npm run check` enforces them.

**The data names meaning; the renderer decides how it looks.** Every field, block, mark and
attribute says what a piece of content is: a paradigm cell, a helper verb, an ending, a typical
error. The renderer lays it out for every view: wide and narrow screens, Cheatsheet and Extended,
every level. §12 holds the vocabulary.

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
├── LICENSE                         CC BY 4.0, the licence of everything in languages/
├── site.yaml                       product name, URLs, credit and licences, explanation languages
├── levels.yaml                     level scale: names, descriptions, colours
├── interface.yaml                  interface wording of the site
├── curriculum.yaml                 every planned topic: sections by category, and the study path
├── concepts.yaml                   concept keys that pair topics across languages
├── schema/                         JSON Schemas for every file type
├── templates/topic.yaml            skeleton for a new topic
└── en/05-tenses/simple-tenses/topic.yaml
```

| File | Schema | Holds |
|---|---|---|
| `site.yaml` | `schema/site.schema.json` | product name, URLs, the credit and licences every page shows, explanation languages with their names and `enabled` switch |
| `levels.yaml` | `schema/levels.schema.json` | the level scale: code, name, description, hue per level |
| `interface.yaml` | `schema/interface.schema.json` | interface wording by key, per explanation language; block headings and column titles the generator writes |
| `curriculum.yaml` | `schema/curriculum.schema.json` | languages (with an `enabled` switch) → sections → topics (slug, optional title, levels of a planned topic); the study path: levels → topic IDs |
| `concepts.yaml` | `schema/concepts.schema.json` | concept key → title, description |
| `{lang}/{NN-section}/{topic}/topic.yaml` | `schema/topic.schema.json` | one topic, all explanation languages |

`enabled: false` on a language being learned (`curriculum.yaml`) or an explanation language
(`site.yaml`) keeps it from readers; its data stays and `npm run check` still validates it.

- Each language has its own sections, which group its topics by category: the menu's
  **Categories** order. The hardest foundation of a language gets its own early section.
- `NN-section`: a two-digit number plus a slug. The number sets the order of sections within the
  language; the order of `topics` in `curriculum.yaml` sets the order inside a section.
- `topic`: kebab-case ASCII, meaning lowercase letters, digits and hyphens.
- **ID**: `{lang}.{section slug without number}.{topic}`, for example `en.tenses.simple-tenses`.
- A topic file starts with `# yaml-language-server: $schema=../../../schema/topic.schema.json`,
  which gives editors validation and completion.

**The study path.** `path` in `curriculum.yaml` orders a language's topics for study, level by
level: under each level, the IDs of the topics to study at that level. A step is a topic at a
level, so a topic comes back at each level it holds. The order follows what a learner needs at each
level: the sentence frame before the parts of speech, a topic after the topics it builds on, the
most frequent forms first, and an overview after its parts.

- A written topic has a step at every level its leaves hold, and at no other.
- A step opens its topic where its level starts: at the top for the topic's lowest level, else at
  the first section that holds the level. Its link names the step, `?step=a1`, and the menu marks
  that step as the one being read; a page opened without it marks the highest step the level filter
  shows.
- The menu, the track index and Up next follow the grouping the reader picks: **By level**, the
  study path, or **Categories**. By level, the menu groups the steps under their levels, and the level
  filter hides the levels above the chosen one.
- `npm run check` enforces the steps; `npm test` and `npm run e2e` test the pages built from them.

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

**Levels live on the leaves.** Every leaf carries its `level`: a table row, an errors row, a list
item, a paragraph. Everything above a leaf takes its range from the leaves under it, from the
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
- Previous, Next and Up next lead to the pages the filter shows, in the chosen grouping. The first
  shown page has an inactive Previous; the last one's Next becomes Start over, back to the first.

## 4. Text values

Text names what each of its pieces is with the marks of §12. A string without marks stays a string;
a string with marks is a list of its parts: plain text as strings, and each marked part as an object
named after its mark.

| Type | Form | Use |
|---|---|---|
| text | `"I live in Madrid."`, `["I ", { target: live }, " in Madrid."]`, `{ target: lives }` | text in the language being learned: examples, forms, words; the same in every explanation language |
| localized | `{ en: … }` | explanation text, one text per explanation language |
| example | `{ ex: …, tr: { en: … } }` | an example in a cell, with its translations (§6) |

- Marks name each piece the reader should notice: the form the topic teaches is a `target`, a helper
  verb an `aux`, an ending an `ending`, a word an explanation discusses a `term`. The renderer
  decides how each looks.
- A link names another topic by ID: `{ link: To be, to: en.verbs.to-be }`. The renderer turns it
  into a page link in the reader's explanation language.
- Joined pieces are structures: `{ alternatives: [am, is, are] }`, `{ mapping: [work, works] }`,
  `{ pattern: [be, { slot: V-ing }] }`. The renderer writes their joiners (§7).
- `readers: [en]` limits an element to the listed explanation languages. Use it for notes,
  sections, rows or columns that serve one group of readers.
- A localized value carries every explanation language that renders it.

## 5. Topic structure

| Field | Content |
|---|---|
| `id`, `lang`, `kind`, `tags`, `concepts`, `related` | identity and links |
| `status` | `draft` or `approved`, per explanation language |
| `title` | localized |
| `summary` | `lead` and `rule`, localized, and the rule's examples in `ex`; the rules below |
| `cheatsheet` | `content`: the whole topic in one table, section 00 (§8) |
| `sections` | the full guide, in order: each with its `title`, `role` and `content` |

**The summary.** The page shows the summary above the guide; topic cards and the meta description
show its lead. The lead and the rule are one sentence each, and the summary holds at most 50 words
with its examples:

1. **The lead** (`summary.lead`) names the forms and what they do, so it stands alone in a search
   result or on a card: "Can for ability, permission and requests; could for past ability, polite
   requests and possibility." It starts with a capital letter and has at most 160 characters.
2. **The rule to get right** (`summary.rule`): the one rule a learner most needs, "Can and could
   never change and take the base verb without to:", followed by its examples in `summary.ex` with
   the target form marked: `{ examples: [["She ", { target: can }, " swim."], [{ target: Can }, " she swim?"]] }`.
   The page joins them as they read: a comma after a phrase, a space after a sentence. A rule that
   shows its examples inside its own sentence keeps them there, their forms marked `target`.

Both sentences talk about the language itself. The rail lists the sections and the badges show the
levels, so each sentence opens with a form, a meaning or a rule. Each explanation language has its
own summary, written for its readers.
`npm run check` enforces the length, the capital letters, the one-sentence lead, and sentences free
of page tours, level codes and openers such as "You need it to…".

**A language reference.** Every topic explains a part of the language system through its rules:
sounds, writing, numbers, dates and time, grammar. Words appear as examples of a rule.

**One subject per topic.** A topic answers the question its title asks. Material that answers
another question belongs to its own topic in `curriculum.yaml`: capital letters and spelling aloud
belong in topics of their own, outside "The Alphabet".

**Sections are a menu.** The sections below are the ones a topic may use, each naming its place in
the menu with `role`; the table gives their usual order, and a topic orders them for its subject. A topic includes a section only when it has content of its own for
it, Typical errors included; a short topic with one strong section is complete.

Grammar sections:

| # | Title | `role` | Content |
|---|---|---|---|
| 1 | Overview | `overview` | the rules that hold across the whole topic |
| 2 | Form: … | `form` | one section per form: affirmative, negative, questions… |
| 3 | Spelling: … | `spelling` | spelling rules for the forms |
| 4 | Pronunciation: … | `pronunciation` | sound rules, with IPA |
| 5 | Use | `use` | table: use, example, row levels |
| 6 | Signal words | `signals` | time words, frequency words, typical companions |
| 7 | (topic-specific) | `own` | anything the topic needs (e.g. Stative verbs) |
| 8 | Compare: … | `compare` | the closest related topic, side by side |
| 9 | Typical errors | `errors` | an `errors` block, when the subject has characteristic errors |

A topic that holds several tenses gives each of its tense sections the tense, with its aspect, as
`features`: "Present simple: form" has role `form` and features `{ tense: prs }`, "Present
continuous: use" has `{ tense: prs, aspect: prog }`.

Foundations topics take one section per part of what they set out, with role `own`: the letters,
the sounds, the numbers by range, the days, the months, the times; then Typical errors.

`related` lists related topics by ID; guides carry no links section.

Block types inside `content`:

| Type | Fields | Renders as |
|---|---|---|
| `prose` | `level`, `text`, `ex`, `tr` | a paragraph |
| `list` | `items`, each with its `type` (`rule`, `note`, `example`), `level`, `text`, `ex`, `tr`, `variety` | a list |
| `paradigm` | `columns`, `rows`; its rows or its columns carry `features` | a table of forms |
| `usage` | `columns`, `rows` | a table of uses, rules or patterns with their examples |
| `comparison` | `columns`, `rows` | a table of items side by side |
| `inventory` | `set`, `columns`, `rows`, each row with its `value` | a table of the members of a closed set |
| `errors` | `rows` (`level`, `wrong`, `right`, `rule`, `speakers`) | a ✗ / ✓ / rule table |

A table's columns each have a `key`, and a `label` or the `slot` they hold (§7); its rows hold
their cells by key, beside their `level`, `features`, `value`, `variety`, `readers` and `tr`. A row
leaves out the key of a cell with nothing in it.

## 6. Translations and readers

- When the explanation language differs from the language being learned, every example carries
  a translation into it: `tr` on a row adds a column named after the explanation language; `tr` on
  an item, a paragraph or an example cell renders as *— translation* after the example.
- When the two languages are the same, examples stand alone.
- A paradigm stands alone in every track: it shows the pattern, and the examples below it carry the
  translations.
- Typical errors match the readers. When the explanation language differs from the language
  being learned, rows list errors typical of speakers of the explanation language and name them in
  `speakers`: the page shows such a row to readers of the explanation languages it names. Rows
  without `speakers` serve all.

## 7. Tables and writing style

- A rendered table has at most 4 columns, counting the generated translation column, so it fits
  A4 portrait, a tablet and a phone screen. A slot paradigm has at most 10.

**Slot paradigms** lay a sentence out word by word, one column per slot, so a row reads across as
the sentence. The tense cheatsheets use one: Tense, then Question (Helper, Subject, Verb), Statement
(Subject, Helper, Verb) and Negative (Subject, Helper, Verb), one row per person.

- A slot column names its slot, `aux`, `subj`, `verb` or `rest`, and its sentence by `features`:
  `{ interrogativity: int, polarity: pos }` is the question, `{ interrogativity: decl, polarity: pos }`
  the statement and `{ interrogativity: decl, polarity: neg }` the negative. Its row carries the tense and the
  person as `features`.
- The renderer writes the slot titles and the sentence titles above them, merges a cell into the one
  above when both read the same and their rows share a level, the subject excepted, and centres
  every cell both ways. A merged first column splits the table into blocks with an empty row between
  them; merges stay inside a block. A slot paradigm renders with compact rows.
- A slot with nothing in it, such as the helper of a present statement, is a key the row leaves
  out; any other table shows a dash where a row leaves a cell out.
- Subjects are one per row, lowercase after a helper and capitalised at the start of a sentence.
- The first column holds the key: person, form, use or rule.
- Each fact appears once in the sections. A topic is a short path through its sections, not a
  set of overlapping views: regroupings, highlight lists and summaries of data shown in another
  section stay out of the guide. The summary of the whole topic is its cheatsheet (§8).
- Tables first. Use text only for a rule that a table cannot hold.
- One rule per list item, at most 20 words.
- State the correct form. Incorrect forms appear only in `errors` blocks.
- Examples use everyday vocabulary at or below the section's level.
- Pronunciation is IPA in an `ipa` mark, `{ ipa: wɜːks }`, which renders /wɜːks/.
- Patterns name their slots from the slot list of §12: `V` = base verb, `V-s`, `V-ing`, `V-ed`,
  `subject`, `noun`, `clause`…

The renderer writes the symbols from the structures and marks of §12:

| Symbol | Written for |
|---|---|
| ✓, ✗ | the errors table |
| → | `mapping`, `takes` |
| / | `alternatives`, `examples`; · when a piece shows a slash of its own |
| — | `exchange`; before a translation; in a table cell a row leaves out |
| + | `pattern` |
| = | `equivalence` |
| ≠ | `contrast` |
| /…/ | `ipa` |
| ( ) | `optional`, `variant` and `gloss` in the language being learned |
| … | `gap` |
| US:, British: | `variant`, and an item with its `variety` |
| ↗ ↘ | `intonation` |

## 8. Cheatsheets

Every topic has one `cheatsheet`: the whole topic in one table, on one screen. Each row carries its
`level`, and the cheatsheet's range runs from its lowest row to its highest (§3).

- Every fact in it appears in the sections.
- One table: forms and patterns, the key rules and the top traps. A topic built on a verb pattern
  uses a slot paradigm (§7).
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
/credits/                                      credits: authors, licences, how to credit
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
  the highest level and Extended the first time. The theme and the grouping (By level or
  Categories) live in the browser.
- A study-path link carries its step, `?step=a0`…`?step=c2`, on topic pages (§2).
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
6. Move to the next topic on the study path.

## 12. Semantic data

The data says what each piece of content is; the renderer decides how it looks. The schema lists
exactly the names below, and `npm run check` rejects the inline notation they replace (§4, §7).

**Rules**

1. Fields name content. The renderer picks the layout and the views that show it: merged cells,
   column groups, centring, joiners, the Cheatsheet and Extended views, wide and narrow screens.
2. One name, one meaning. Every field, block, mark and attribute comes from this section.
3. A string holds one piece of text. Lists, alternatives, patterns, exchanges and mappings are
   structures of their own.
4. Each fact lives in one place, and the build derives what follows from it: the translation
   column, the slot and sentence titles, the cheatsheet sets.
5. Text in the language being learned keeps its written form: it is the lesson. A mark adds what
   the text means, such as the date "the third of July" names.
6. Grammar carries features from one list, after the UniMorph schema. A feature takes one value or
   a list; forms that serve several bundles list them.

**Features**

| Feature | Values |
|---|---|
| `person` | `1`, `2`, `3` |
| `number` | `sg`, `pl` |
| `gender` | `masc`, `fem`, `neut` |
| `case` | `nom`, `acc`, `gen` |
| `tense` | `prs`, `pst`, `fut` |
| `aspect` | `prog`, `prf`, `hab` |
| `mood` | `ind`, `imp`, `sbjv`, `cond` |
| `polarity` | `pos`, `neg` |
| `interrogativity` | `decl`, `int` |
| `politeness` | `infm`, `form` |
| `degree` | `pos`, `cmpr`, `sprl` |
| `definiteness` | `def`, `indf` |
| `deixis` | `prox`, `dist` |
| `voice` | `act`, `pass` |
| `verbform` | `inf`, `ptcp`, `ger` |
| `contraction` | `full`, `short` |
| `countability` | `count`, `mass` |
| `wordclass` | `det`, `pro` |

`person`, `number`, `gender`, `case`, `tense`, `mood`, `polarity`, `interrogativity`, `politeness`,
`definiteness` and `voice` take their names and values from UniMorph, and `aspect` adds `hab` to its
UniMorph values. `degree` (UniMorph's comparison, with `pos` for the plain form), `deixis` (`dist` for
UniMorph's remote), `verbform`, `contraction`, `countability` and `wordclass` (a determiner before a
noun, `my`, or a pronoun on its own, `mine`) are the project's own. A question, a
statement and a negative differ in interrogativity and polarity. *We* is person `1`, number `pl`;
*you* is person `2` with either number; "I / you / we / they" lists four bundles.

**Topic and sections**

| Field | Holds |
|---|---|
| `summary.lead`, `summary.rule`, `summary.ex` | the lead, the rule and the rule's examples (§5) |
| section `role` | the section's place in the §5 menu: `overview`, `form`, `spelling`, `pronunciation`, `use`, `signals`, `own`, `compare`, `errors` |
| section `features` | the tense a section of a topic with several tenses is about |

**Blocks**

| Block | Holds |
|---|---|
| `paradigm` | forms or sentences in cells labelled by features; slot columns lay a sentence out word by word (§7) |
| `usage` | uses, rules, patterns or words, each with its explanation and examples |
| `comparison` | items side by side under named columns |
| `inventory` | the members of a closed set, each row one member with its `value` |
| `list` | items typed `rule`, `note` or `example` |
| `prose` | a paragraph |
| `errors` | wrong, right, rule |

An inventory names its `set`, and each member's `value` follows it:

| Set | Value |
|---|---|
| `letters` | the letter: `a` |
| `sounds` | the IPA symbol: `ʃ` |
| `numbers` | the number: `1500` |
| `ordinals` | the number: `3` |
| `days` | the ISO 8601 weekday, Monday `1` |
| `months` | the ISO 8601 month: `--07` |
| `years` | the year: `"1999"` |
| `dates` | the ISO 8601 date without its year: `--07-03` |
| `times` | the 24-hour time: `07:05` |

**Structures**

| Structure | Holds | Joined with |
|---|---|---|
| `alternatives` | forms or examples that each work | / |
| `examples` | examples side by side | /, and a space in the summary |
| `mapping` | a form and what it becomes, in order | → |
| `takes` | a case and the form it calls for | → |
| `exchange` | a question and its answer | — |
| `pattern` | the slots of a sentence pattern, in order | + |
| `equivalence` | forms or sentences that mean the same | = |
| `contrast` | forms that differ, side by side | ≠ |

`follows: true` opens a `mapping`, `takes` or `pattern` with its joiner, continuing the form under
discussion: `{ pattern: [{ ending: es }], follows: true }` reads + es. Pieces that show a slash of
their own, IPA included, are joined with · instead of /. A list of parts holds at least one mark or
structure; text without marks is one string.

**Inline marks**

| Mark | Marks | Example | Marked part |
|---|---|---|---|
| `target` | the form the topic teaches; in an error, the corrected part | I used to play football. | used to play |
| `aux` | a helper verb | Does she work? | Does |
| `subj`, `verb` | the subject and the main verb of a pattern sentence | Does she work? | she, work |
| `ending` | an ending added to a stem | works | s |
| `stress` | the stressed syllable | photograph | pho |
| `term` | a word or part of a word of the language being learned, discussed in an explanation | *yet* goes at the end | yet |
| `letter` | the letters or symbols a rule is about: the spelling of a sound, a silent letter, a capital, a spelling change, an IPA symbol | the d in Wednesday is silent | d |
| `signal` | a signal word inside an example | I saw her yesterday. | yesterday |
| `gloss` | a meaning in the reader's language; localized inside text of the language being learned | What do you do? (= your job) | = your job |
| `l1` | a phrase in the reader's first language | a note's phrase in the reader's language | the whole phrase |
| `sound` | a pronunciation respelling | used to sounds like use-ta | use-ta |
| `ipa` | an IPA transcription, without its slashes | /ˈjuːst tə/ | ˈjuːst tə |
| `date` | a date, with its ISO 8601 value: `2026-07-03`, `--07-03`, `--07`, `2026` | the third of July | the third of July = `--07-03` |
| `weekday` | a day of the week, with its ISO 8601 number, Monday `1` | on Monday | Monday = `1` |
| `time` | a clock time, with its 24-hour value | at 9:30 | 9:30 = `09:30` |
| `numeral` | a number in words, with its value in digits | two hundred | two hundred = `200` |
| `ordinal` | an ordinal, with its value | the third | third = `3` |
| `link` | another topic, by ID in `to` | see To be | To be = `en.verbs.to-be` |
| `slot` | a slot of a pattern: a code from the slot list, or a localized description of what fills it | be + V-ing | V-ing |
| `optional` | an optional part | He said (that) he was tired. | that |
| `gap` | an open slot, or the gap in a split form | Could you…? | … |
| `intonation` | the voice rising or falling: `rise`, `fall` | Really? ↗ | ↗ |
| `variant` | the form in another variety, with its `variety` | at the weekend (US: on the weekend) | on the weekend |

The slot list: `V`, `V-s`, `V-ing`, `V-ed`, `-ing`, `subject`, `verb`, `base verb`, `noun`,
`plural noun`, `singular noun`, `uncountable noun`, `adjective`, `adverb`, `comparative`,
`superlative`, `wh-word`, `person`, `clause`, `past participle`, `infinitive`, `present`, `past`,
`past simple`, `number`, `unit`, `hyphen`, `result`, `agent`, `helper`, `consonant`, `vowel`,
`the time`, `day`, `date`, `month`, `year`.

Marks nest: `{ target: { ipa: θɜːˈtiːn } }` marks a transcription as the form taught. The text of
`target`, `aux`, `subj`, `verb`, `ending`, `stress`, `term`, `letter`, `signal`, `sound`, `optional`,
`variant` and the value marks is in the language being learned, wherever it stands; a `gloss` or a
`slot` description inside it is localized and carries each language its text serves. The value of
a `date`, `weekday`, `time`, `numeral` or `ordinal` mark is the same in every language: the renderer
can show it in the reader's language beside the lesson's written form.

**Fields**

| Field | Holds |
|---|---|
| `title`, `content` | a section's title and its blocks |
| `text`, `ex`, `tr` | explanation text, an example in the language being learned, its translations |
| `columns`, `rows` | a table's columns, each with its `key`, and its rows with their cells by key |
| column `label`, `slot` | a column's title, or the slot of a pattern sentence it holds: `aux`, `subj`, `verb`, `rest` |
| `items` | a list's items, each typed `rule`, `note` or `example` |
| `wrong`, `right`, `rule` | an error, its correction, and the rule it breaks |
| `set` | the closed set an inventory holds |

**Attributes**

| Attribute | Holds |
|---|---|
| `level` | the item's level (§3) |
| `readers` | the explanation languages an element serves |
| `speakers` | the first languages of the speakers an error row is typical for |
| `variety` | the variety of the language being learned an element or a variant belongs to, as a BCP 47 tag: `en-US`; `en-GB` when absent |
| `features` | the grammar features of a row, a column or a section |
| `value` | the value of an inventory member or of a value mark |
| `follows` | a `mapping`, `takes` or `pattern` that continues the form under discussion: `true` |
