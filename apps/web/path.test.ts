// The study path on the built pages: the menu and the track index list curriculum.yaml's path level by
// level; every step leads to the place its level starts in its topic; Up next follows each step of a
// topic to the step after it.
import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { parseHTML } from "linkedom";
import { loadCurriculum, LEVELS, lv } from "../../scripts/lib.ts";
import { SITE_DIR, testSite } from "./test-site.ts";

const pages = await testSite();
const read = async (path: string): Promise<Document> => parseHTML(await Bun.file(join(SITE_DIR, path)).text()).document;
const english = (await loadCurriculum()).languages[0];
if (!english) throw new Error("curriculum.yaml has no language");
const path = english.path;
const index = await read("en/english/index.html");
const menu = '.nav-list[data-order="path"]';
const steps = [...index.querySelectorAll<HTMLAnchorElement>(`${menu} a`)];
// The page a step link opens, and the section its anchor names.
const pageOf = (href: string): string => `${href.split(/[?#]/)[0]?.replace(/^\//, "") ?? ""}index.html`;
const levelOf = (el: Element): string => el.getAttribute("data-level") ?? "";

describe("the menu and the index", () => {
  test("list the levels of the path, lowest first, each with its steps", () => {
    const levels = Object.keys(path);
    expect([...index.querySelectorAll(`${menu} h4`)].map(levelOf)).toEqual(levels);
    expect([...index.querySelectorAll('.index-grid[data-order="path"] .index-card')].map(levelOf)).toEqual(levels);
    for (const level of levels) {
      expect(steps.filter((a) => levelOf(a) === level).length).toBe(path[level]?.length ?? 0);
      expect(index.querySelectorAll(`.index-grid[data-order="path"] li[data-level="${level}"]`).length).toBe(path[level]?.length ?? 0);
    }
    expect(LEVELS.slice(0, levels.length)).toEqual(levels as never);
  });

  test("give both orders a switch, the menu and the index each", () => {
    expect(index.querySelectorAll('.nav-order [data-set-order="categories"], .nav-order [data-set-order="path"]').length).toBe(2);
    expect(index.querySelectorAll('.index-order [data-set-order="categories"], .index-order [data-set-order="path"]').length).toBe(2);
  });
});

describe.each(steps.map((a) => [`${levelOf(a)} ${a.getAttribute("href") ?? ""}`, a] as const))("step %s", (_, a) => {
  test("opens its topic where its level starts and names its step", async () => {
    const href = a.getAttribute("href") ?? "";
    expect(new URL(href, "http://x").searchParams.get("step")).toBe(levelOf(a).toLowerCase());
    expect(pages).toContain(pageOf(href));
    const doc = await read(pageOf(href));
    const level = levelOf(a);
    const anchor = href.split("#")[1];
    if (anchor === undefined) {
      // The topic's lowest level: the page opens at the top.
      expect(doc.querySelector(".doc-head h1 .lvl")?.getAttribute("data-from")).toBe(level);
      return;
    }
    const section = doc.querySelector(`[id="${anchor}"]`);
    if (section === null) throw new Error(`${href}: no section #${anchor}`);
    expect(section.matches("section.part:not(.cheatsheet)")).toBe(true);
    expect(section.querySelector(`[data-level="${level}"]`) !== null || levelOf(section) === level).toBe(true);
    // No earlier section holds the level.
    const earlier = [...doc.querySelectorAll("section.part:not(.cheatsheet)")];
    for (const part of earlier.slice(0, earlier.indexOf(section))) {
      expect(part.querySelector(`[data-level="${level}"]`) === null && levelOf(part) !== level).toBe(true);
    }
  });
});

describe("a topic page", () => {
  const all = steps.map((a) => ({ level: levelOf(a), href: a.getAttribute("href") ?? "" }));
  const topicsOnPath = [...new Set(all.map((s) => pageOf(s.href)))];
  const written = [...index.querySelectorAll('.index-grid[data-order="categories"] li[data-level]')].flatMap((li) => {
    const href = li.querySelector("a")?.getAttribute("href");
    return href !== null && href !== undefined ? [{ level: levelOf(li), href }] : [];
  });

  interface Lead {
    prev: string | undefined;
    next: string | undefined;
    restart: boolean;
  }
  // Where a page at position i leads at a level of the filter: the shown pages around it, and from the
  // last shown page back to the first.
  function expected(list: { level: string; href: string }[], i: number, level: string): Lead {
    const shown = (e: { level: string }): boolean => lv(e.level) <= lv(level);
    const prev = list.slice(0, i).filter(shown).pop();
    const after = list.slice(i + 1).find(shown);
    const first = list.find(shown);
    const restart = after === undefined && first !== undefined && first !== list[i];
    return { prev: prev?.href, next: after?.href ?? (restart ? first.href : undefined), restart };
  }
  // The rows of a page for one grouping (and one step) at a level, above the title, below the guide and in the rail.
  function seen(doc: Document, rows: string, level: string): (Lead & { upNext: string | undefined })[] {
    const at = `[data-at~="${level}"]`;
    const out = ["top", "bottom"].map((where) => {
      const row = doc.querySelectorAll(`.pagers.${where} .pager${rows}${at}`);
      expect(row.length).toBe(1);
      const prev = doc.querySelector(`.pagers.${where} .pager${rows}${at} .pager-prev`);
      const next = doc.querySelector(`.pagers.${where} .pager${rows}${at} .pager-next`);
      expect(prev?.matches("a") ?? false).not.toBe(prev?.matches(".off") ?? false);
      return {
        prev: prev?.getAttribute("href") ?? undefined,
        next: next?.getAttribute("href") ?? undefined,
        restart: next?.textContent.includes("Start over") ?? false,
        upNext: doc.querySelector(`.up-next${rows}${at} a.next`)?.getAttribute("href") ?? undefined,
      };
    });
    return out;
  }

  test.each(topicsOnPath)("%s marks its steps; at every level each step leads to the shown steps around it", async (file) => {
    const doc = await read(file);
    const own = all.flatMap((s, i) => (pageOf(s.href) === file ? [{ ...s, i }] : []));
    expect([...doc.querySelectorAll(`${menu} a.on`)].map(levelOf)).toEqual(own.map((s) => s.level));
    for (const s of own) {
      for (const level of LEVELS) {
        const want = expected(all, s.i, level);
        for (const got of seen(doc, `[data-order="path"][data-step="${s.level}"]`, level)) {
          expect(got).toEqual({ ...want, upNext: want.next });
        }
      }
    }
  });

  test.each(written.map((w, i) => [w.href, i] as const))(
    "%s, by category, leads at every level to the shown topics around it",
    async (href, i) => {
      const doc = await read(pageOf(href));
      for (const level of LEVELS) {
        const want = expected(written, i, level);
        for (const got of seen(doc, '[data-order="categories"]', level)) expect(got).toEqual({ ...want, upNext: want.next });
      }
    },
  );

  test("at A0, by category: To be sits between Personal Pronouns and Word Order, Word Order starts over at The Alphabet, The Alphabet has no previous", async () => {
    const at = (doc: Document, side: string): string | null | undefined =>
      doc.querySelector(`.pagers.top .pager[data-order="categories"][data-at~="A0"] .${side}`)?.getAttribute("href");
    const toBe = await read("en/english/verbs/to-be/index.html");
    expect(at(toBe, "pager-prev")).toBe("/en/english/pronouns/personal-pronouns/");
    expect(at(toBe, "pager-next")).toBe("/en/english/sentence-building/word-order/");
    const wordOrder = await read("en/english/sentence-building/word-order/index.html");
    expect(at(wordOrder, "pager-next")).toBe("/en/english/foundations/alphabet-spelling/");
    const alphabet = await read("en/english/foundations/alphabet-spelling/index.html");
    expect(alphabet.querySelector('.pagers.top .pager[data-order="categories"][data-at~="A0"] .pager-prev.off')).not.toBeNull();
  });

  test("To be at A0 leads to Word Order", async () => {
    const doc = await read("en/english/verbs/to-be/index.html");
    expect(doc.querySelector('.up-next[data-step="A0"][data-at~="A0"] a.next')?.getAttribute("href")).toBe(
      "/en/english/sentence-building/word-order/?step=a0",
    );
  });
});
