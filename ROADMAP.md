# Roadmap

Project phases. The topic plan, in study order, lives in
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
| 4 | Internationalization | Spanish and Ukrainian as explanation languages: the interface and every topic in each | 3 | todo |
| 5 | Visual explanations | Diagrams rendered from the data, such as tense timelines and paradigm charts | semantic data | todo |
| 6 | Interactive explanations | Helpers to understand a rule by trying it: the reader changes a part of an example, such as the person, the tense or the polarity, and sees the form change with it | semantic data | todo |
| 7 | Lens | Tapping or hovering a marked word shows what it is, its meaning, its IPA and its level, translation | semantic data | todo |
| 8 | Themes | The reader picks a palette; every colour, level colours included, comes from the theme | 1 | todo |
| 9 | Drafts | A language keeps its published data and its drafts side by side; a draft is reviewed before it replaces the published version | 0 | todo |
| 10 | Pronunciation | IPA for words and examples, British and US where they differ, with audio | 7 | todo |
| 11 | My languages | The reader lists their languages in order of priority; explanations, translations and answers show in the first language on the list that has them, then the next | 4 | todo |

Semantic data is the vocabulary of [languages/CONVENTIONS.md](languages/CONVENTIONS.md) §12: blocks,
fields and inline marks that name what each piece of content is.
