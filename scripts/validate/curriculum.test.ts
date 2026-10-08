// The study path holds one step for every level of every written topic, inside the curriculum and
// lowest level first.
import { describe, expect, test } from "bun:test";
import { type CurriculumLanguage, loadCurriculum, loadTopics } from "../lib.ts";
import { checkPath } from "./curriculum.ts";

const curriculum = await loadCurriculum();
const refs = await loadTopics(curriculum);
const english = curriculum.languages[0];
if (!english) throw new Error("curriculum.yaml has no language");
const source: CurriculumLanguage = english;

// The path problems after changing a copy of the English path.
function messagesOf(change: (path: Record<string, string[]>) => void): string[] {
  const language = structuredClone(source);
  change(language.path);
  const messages: string[] = [];
  checkPath(language, refs, (_, message) => messages.push(message));
  return messages;
}
const steps = (path: Record<string, string[]>, level: string): string[] => path[level] ?? [];

describe("the study path", () => {
  test("the path as it is passes", () => {
    expect(messagesOf(() => undefined)).toEqual([]);
  });
  test("a step names a topic in the curriculum", () => {
    expect(messagesOf((p) => steps(p, "A1").push("en.verbs.no-such-topic"))).toContain(
      "path A1: en.verbs.no-such-topic is not a topic of this language in the curriculum",
    );
  });
  test("a step sits at a level its topic holds", () => {
    expect(messagesOf((p) => steps(p, "A0").push("en.tenses.perfect-tenses"))).toContain(
      "path A0: en.tenses.perfect-tenses has nothing at A0",
    );
  });
  test("every level of a topic has a step", () => {
    const messages = messagesOf((p) => {
      p["A2"] = steps(p, "A2").filter((id) => id !== "en.verbs.to-be");
    });
    expect(messages).toContain("path A2: en.verbs.to-be holds A2 and needs a step there");
  });
  test("levels run lowest first", () => {
    const messages = messagesOf((p) => {
      const a0 = steps(p, "A0");
      delete p["A0"];
      p["A0"] = a0;
    });
    expect(messages).toContain("path en: levels run lowest first (A1, A2, B1, A0)");
  });
});
