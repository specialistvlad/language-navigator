// The built pages carry levels the filter can trust: every element's range covers exactly the leaves
// inside it, so a block hides with its last leaf and no table or list is left empty at any level;
// every badge reads the range of what it labels, and shows only where the level changes.
import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { LEVEL_INFO, LEVELS, lv } from "../../scripts/lib.ts";
import { readPage, SITE_DIR, testSite } from "./test-site.ts";

const pages = await testSite();
const topicPages = pages.filter((p) => /^en\/\w+\/[\w-]+\/[\w-]+\/index\.html$/.test(p) && !p.includes("/cheatsheets/"));
const levelled = (el: Element): Element[] => [...el.querySelectorAll("[data-level]")];
const from = (el: Element): string => el.getAttribute("data-level") ?? "";
const to = (el: Element): string => el.getAttribute("data-to") ?? "";
const label = (a: string, b: string): string => (a === b ? a : `${a}–${b}`);
// The range of some elements: lowest data-level to highest data-to.
function rangeOf(els: Element[]): string {
  const lows = els.map(from).sort((a, b) => lv(a) - lv(b));
  const highs = els.map(to).sort((a, b) => lv(b) - lv(a));
  return label(lows[0] ?? "", highs[0] ?? "");
}
// The badge an element shows itself, outside any element inside it that carries a level.
const ownBadge = (el: Element, selector: string): Element | null => el.querySelector(`:scope > ${selector} .lvl, :scope > ${selector}.lvl`);

test("the site builds with topic pages", () => {
  expect(topicPages.length).toBeGreaterThan(40);
});

describe.each(topicPages)("%s", (path) => {
  test("every level attribute is on the scale, lowest first", async () => {
    const doc = await readPage(path);
    for (const el of levelled(doc.body)) {
      if (el.matches("[data-set-level]")) continue;
      expect(LEVELS).toContain(from(el) as never);
      expect(lv(to(el))).toBeGreaterThanOrEqual(lv(from(el)));
    }
  });

  test("blocks and sections cover exactly their leaves", async () => {
    const doc = await readPage(path);
    for (const blk of doc.querySelectorAll(".blk")) {
      const leaves = [...blk.querySelectorAll("tr[data-level]:not(.gap-row), li[data-level]")];
      if (leaves.length > 0) expect(`${label(from(blk), to(blk))} ${rangeOf(leaves)}`).toBe(`${rangeOf(leaves)} ${rangeOf(leaves)}`);
    }
    for (const section of doc.querySelectorAll("section.part")) {
      const blocks = [...section.querySelectorAll(":scope > .blk")];
      expect(blocks.length).toBeGreaterThan(0);
      expect(label(from(section), to(section))).toBe(rangeOf(blocks));
    }
  });

  test("at every level, a visible block has a visible leaf", async () => {
    const doc = await readPage(path);
    // An element shows at a level when it and every element around it with a level start at or below it.
    const shows = (el: Element, level: string): boolean => {
      for (let e: Element | null = el; e && e !== doc.documentElement; e = e.parentElement) if (lv(from(e)) > lv(level)) return false;
      return true;
    };
    for (const level of LEVELS) {
      for (const blk of doc.querySelectorAll(".blk")) {
        if (!shows(blk, level)) continue;
        const leaves = [...blk.querySelectorAll("tbody tr:not(.gap-row), li")];
        if (leaves.length > 0) expect(leaves.some((l) => shows(l, level))).toBe(true);
      }
      for (const section of doc.querySelectorAll("section.part")) {
        if (shows(section, level)) expect([...section.querySelectorAll(".blk")].some((b) => shows(b, level))).toBe(true);
      }
    }
  });

  test("badges read the range they label and show where the level changes", async () => {
    const doc = await readPage(path);
    for (const badge of doc.querySelectorAll(".lvl")) {
      expect(badge.textContent).toBe(label(badge.getAttribute("data-from") ?? "", badge.getAttribute("data-to") ?? ""));
      // One level is one half in its colour; a range is two halves, lowest left, highest right.
      const [a, b] = [badge.getAttribute("data-from") ?? "", badge.getAttribute("data-to") ?? ""];
      const halves = [...badge.querySelectorAll(":scope > .half")].map((h) => `${h.className}:${h.textContent}`);
      expect(halves).toEqual(a === b ? [`half lvl-${a}:${a}`] : [`half lvl-${a}:${a}`, `half lvl-${b}:${b}`]);
    }
    for (const section of doc.querySelectorAll("section.part")) {
      expect(ownBadge(section, "h2")?.textContent).toBe(label(from(section), to(section)));
      for (const blk of section.querySelectorAll(":scope > .blk")) {
        const own = ownBadge(blk, ".blk-level");
        expect(own === null ? "none" : own.textContent).toBe(lv(from(blk)) > lv(from(section)) ? label(from(blk), to(blk)) : "none");
        for (const leaf of blk.querySelectorAll("tr[data-level]:not(.gap-row), li[data-level]")) {
          // A row whose first cell is merged into the one above shares that cell's badge.
          if (leaf.tagName === "TR" && leaf.querySelector(":scope > td.key") === null) continue;
          const mark = leaf.querySelector(":scope > td.key > .lvl, :scope > .lvl");
          expect(mark === null ? "none" : mark.textContent).toBe(lv(from(leaf)) > lv(from(blk)) ? from(leaf) : "none");
        }
      }
    }
  });

  test("the header, the rail and the menu agree with the sections", async () => {
    const doc = await readPage(path);
    const sections = [...doc.querySelectorAll("section.part")];
    expect(doc.querySelector(".doc-head h1 .lvl")?.textContent).toBe(rangeOf(sections));
    for (const li of doc.querySelectorAll(".toc > li")) {
      const target = doc.getElementById(li.querySelector("a")?.getAttribute("href")?.slice(1) ?? "");
      expect(target === null ? "missing" : label(from(li), to(li))).toBe(target === null ? "missing" : label(from(target), to(target)));
      expect(li.querySelector(".lvl")?.textContent).toBe(label(from(li), to(li)));
      expect(li.querySelector(".lvl.pair")).not.toBeNull();
    }
    const current = doc.querySelector('.nav-list[data-order="categories"] a.on');
    expect(current === null ? "" : label(from(current), to(current))).toBe(rangeOf(sections));
    // A menu section covers the topics listed under it.
    let heading: Element | null = null;
    let under: Element[] = [];
    const close = (): void => {
      if (heading) expect(label(from(heading), to(heading))).toBe(rangeOf(under));
    };
    const menu = '.nav-list[data-order="categories"]';
    for (const el of doc.querySelectorAll(`${menu} h4, ${menu} a[data-level], ${menu} .todo`)) {
      if (el.tagName === "H4") {
        close();
        [heading, under] = [el, []];
      } else under.push(el);
    }
    close();
  });
});

test("levels.css hides each level above the filter, fades the badge halves above it, gives every level its colours, and tints the switcher up to the chosen level", async () => {
  await testSite();
  const css = await Bun.file(join(SITE_DIR, "levels.css")).text();
  for (const [i, { code }] of LEVEL_INFO.entries()) {
    expect(css).toContain(
      `.lvl-${code} { --lvl: var(--lvl-${code}-ink); --level-tint: var(--lvl-${code}-tint); --level-strong: var(--lvl-${code}-strong); }`,
    );
    expect(css).toContain(
      `html[data-level="${code}"] .seg :is(${LEVELS.slice(0, i + 1)
        .map((c) => `[data-set-level="${c}"]`)
        .join(", ")}) { background: var(--level-tint); }`,
    );
    const above = LEVELS.slice(i + 1);
    if (above.length === 0) continue;
    expect(css).toContain(
      `html[data-level="${code}"]:is([data-page="topic"], [data-page="track"]) :is(${above.map((c) => `[data-level="${c}"]`).join(", ")})`,
    );
    // Badge halves above the filter fade.
    expect(css).toContain(
      `html[data-level="${code}"]:is([data-page="topic"], [data-page="track"]) .lvl > .half:is(${above.map((c) => `.lvl-${c}`).join(", ")}) {`,
    );
  }
});
