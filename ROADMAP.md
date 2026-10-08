# Roadmap

Project phases. The topic plan, by category and along the study path, lives in
[languages/curriculum.yaml](languages/curriculum.yaml); each topic's status lives in its
`topic.yaml` and shows in the web app.

Topics are written one at a time; each topic is approved before the next one starts.

## Phases

| # | Phase | Delivers | Builds on | Status |
|---|---|---|---|---|
| 0 | Foundations | Conventions, JSON Schemas, topic template | — | done |
| 1 | Web app | Static pages, cheatsheets, level filter, sitemap, publishing | 0 | done |
| 2 | Pilot topics | `en.tenses.simple-tenses` and `es.conjugation.presente-regular`, reviewed in the web app | 1 | done |
| 3 | English topics | Every English topic, by level: A0–A1, then A2, then B1 | 2 | done |
| 4 | Semantic data | The vocabulary of CONVENTIONS.md §12 in the schemas, the checks and the renderer: every topic names its blocks, marks, structures and features | 3 | todo |
| 5 | Internationalization | Spanish and Ukrainian as explanation languages: the interface and every topic in each | 4 | todo |
| 6 | Visual explanations | Diagrams rendered from the data, such as tense timelines and paradigm charts | 4 | todo |
| 7 | Interactive explanations | Helpers to understand a rule by trying it: the reader changes a part of an example, such as the person, the tense or the polarity, and sees the form change with it | 4 | todo |
| 8 | Lens | Tapping or hovering a marked word shows what it is, its meaning, its IPA and its level, translation | 4 | todo |
| 9 | Themes | The reader picks a palette; every colour, level colours included, comes from the theme | 1 | todo |
| 10 | Drafts | A language keeps its published data and its drafts side by side; a draft is reviewed before it replaces the published version | 0 | todo |
| 11 | Pronunciation | IPA for words and examples, British and US where they differ, with audio | 8 | todo |
| 12 | My languages | The reader lists their languages in order of priority; explanations, translations and answers show in the first language on the list that has them, then the next | 5 | todo |

Phase 4 delivers semantic data, the vocabulary of [languages/CONVENTIONS.md](languages/CONVENTIONS.md) §12:
blocks, structures, inline marks and grammar features that name what each piece of content is.
