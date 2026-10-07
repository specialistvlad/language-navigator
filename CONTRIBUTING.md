# Contributing to langs123

langs123 grows through corrections and examples from teachers, learners and native speakers. There
are two ways in: report a mistake, or change a topic yourself.

## Report a mistake

*Report a mistake* at the foot of every page opens a short GitHub form, filled in with the page.
Quote what is wrong and, when you know it, give the correct version.

## Change a topic

Each topic lives in one file: `languages/en/{NN-section}/{topic}/topic.yaml`.

**In the browser.** *Edit on GitHub* at the top of a topic page opens its file in GitHub's editor.
Saving proposes the change as a pull request, and CI checks it.

**On your computer.** [Bun](https://bun.sh) runs every script:

```
bun install
npm start          # the site at http://127.0.0.1:47380, rebuilt on every change
npm run verify     # every check CI runs
```

## Content rules

- Every example is your own wording, written for this project. Text from textbooks, dictionaries
  and other sites stays with its authors.
- [languages/CONVENTIONS.md](languages/CONVENTIONS.md) holds the rules for the data: a level on
  every leaf, British spelling with US differences marked, short sentences in plain words.
- `npm run check` validates the data against the schemas and the conventions; a pull request passes
  it before review.
- One topic per pull request keeps review quick.

## What a contribution certifies

Opening a pull request certifies the [Developer Certificate of Origin 1.1](https://developercertificate.org/)
for its changes: you wrote them, or you have the right to submit them under the project's licences.
The pull request form asks you to confirm it.

Your contribution stays yours and comes in under the licence of the part it changes:

| Part | Licence |
|---|---|
| Content in `languages/` | [CC BY 4.0](languages/LICENSE), credited as *langs123 contributors* |
| Code everywhere else | [MIT](LICENSE) |

Both licences let anyone reuse the work, the project included, in free and paid products alike,
with credit; [README → Licence](README.md#licence) describes how. The reference built from the
data stays free on langs123.com.

## Review

The maintainer reviews every change in the web app and checks the language: a change lands once it
is correct at its level. A topic carries `status: draft` until it is approved
([CONVENTIONS.md §11](languages/CONVENTIONS.md#11-workflow-per-topic)).

Everyone here follows the [code of conduct](CODE_OF_CONDUCT.md).
