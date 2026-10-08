// The level filter in a browser: on every topic and track page, each level button shows exactly what
// starts at or below it, leaves no table or list empty, greys out the rail entries above it, keeps
// every badge's range and fades the badge halves above it, and shows the empty-view note only when
// nothing is left.
// Run: npm run e2e (Chromium from Playwright: bunx playwright install chromium)
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { type Browser, chromium, type Page } from "playwright";
import { LEVELS } from "../../scripts/lib.ts";
import { SITE_DIR, testSite } from "./test-site.ts";

const pages = (await testSite()).filter(
  (p) => /^en\/\w+\/(index\.html|[\w-]+\/[\w-]+\/index\.html)$/.test(p) && !p.includes("cheatsheets"),
);
const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch: (req) => {
    const path = decodeURIComponent(new URL(req.url).pathname);
    return new Response(Bun.file(join(SITE_DIR, path.endsWith("/") ? `${path}index.html` : path)));
  },
});
let browser: Browser;
let page: Page;
beforeAll(async () => {
  browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
});
afterAll(async () => {
  await browser.close();
  await server.stop();
});

// What the page shows at the level in force, measured in the browser.
interface Seen {
  wrongly: string[];
  empty: string[];
  rail: string[];
  badges: string[];
  note: boolean;
  anything: boolean;
}
async function look(levels: readonly string[]): Promise<Seen> {
  return page.evaluate((order) => {
    const at = order.indexOf(document.documentElement.dataset["level"] ?? "");
    const rank = (el: Element): number => order.indexOf(el.getAttribute("data-level") ?? "");
    // The Cheatsheet view shows section 00 alone.
    const viewed = (el: Element): boolean =>
      document.documentElement.dataset["view"] !== "cheatsheet" || el.closest("section.part:not(.cheatsheet)") === null;
    // The order switch shows the lists of one order: by category or along the study path.
    const ordered = (el: Element): boolean =>
      (el.closest("body [data-order]")?.getAttribute("data-order") ?? "categories") ===
      (document.documentElement.dataset["order"] ?? "categories");
    const fits = (el: Element): boolean => {
      if (!viewed(el) || !ordered(el)) return false;
      for (let e: Element | null = el; e && e !== document.documentElement; e = e.parentElement) if (rank(e) > at) return false;
      return true;
    };
    const visible = (el: Element): boolean => el.checkVisibility();
    const name = (el: Element): string =>
      `${el.tagName.toLowerCase()} ${el.getAttribute("data-level") ?? ""} "${el.textContent.slice(0, 40)}"`;
    const levelled = [...document.querySelectorAll("[data-level]")].filter(
      (el) => el !== document.documentElement && !el.matches("[data-set-level], .toc > li, .toc > li *"),
    );
    const wrongly = levelled.filter((el) => visible(el) !== fits(el)).map((el) => `${visible(el) ? "shown" : "hidden"}: ${name(el)}`);
    const containers = [...document.querySelectorAll(".blk table, .blk ul")].filter(visible);
    const empty = containers.filter((c) => ![...c.querySelectorAll("tbody tr:not(.gap-row), li")].some(visible)).map(name);
    const rail = [...document.querySelectorAll(".toc > li")]
      .filter(
        (li) =>
          (getComputedStyle(li).opacity === "1") ===
          (rank(li) > at || (li.matches(".guide") && document.documentElement.dataset["view"] === "cheatsheet")),
      )
      .map(name);
    const badges = [...document.querySelectorAll<HTMLElement>(".lvl[data-from][data-to]")]
      .filter((b) => {
        const from = b.dataset["from"] ?? "";
        const to = b.dataset["to"] ?? "";
        const want = from === to ? [from] : [from, to];
        const halves = [...b.querySelectorAll<HTMLElement>(":scope > .half")];
        // A half above the filter fades: it loses its tint and keeps its code.
        const faded = (h: HTMLElement): boolean => getComputedStyle(h).backgroundColor === "rgba(0, 0, 0, 0)";
        const above = (h: HTMLElement): boolean => order.indexOf(h.textContent) > at;
        const tints = halves.filter((h) => !faded(h)).map((h) => getComputedStyle(h).backgroundColor);
        return (
          b.textContent !== want.join("–") ||
          halves.map((h) => `${h.className}:${h.textContent}`).join() !== want.map((l) => `half lvl-${l}:${l}`).join() ||
          halves.some((h) => faded(h) !== above(h)) ||
          // Each tinted half shows its own level's colour.
          new Set(tints).size !== tints.length
        );
      })
      .map(name);
    const note = [...document.querySelectorAll(".filter-empty")].some(visible);
    const anything = [...document.querySelectorAll("section.part, .index-card")].some(visible);
    return { wrongly, empty, rail, badges, note, anything };
  }, levels);
}

const cases = pages.flatMap((path) =>
  (path.split("/").length > 4 ? ["extended", "cheatsheet"] : ["extended"]).map((view) => [path, view] as const),
);

describe.each(cases)("%s, %s view", (path, view) => {
  test.each([...LEVELS])("at %s", async (level) => {
    await page.goto(`${server.url.href}${path.replace(/index\.html$/, "")}?level=${level.toLowerCase()}&view=${view}`);
    await page.click(`.seg [data-set-level="${level}"]`);
    const seen = await look(LEVELS);
    expect(seen.wrongly).toEqual([]);
    expect(seen.empty).toEqual([]);
    expect(seen.rail).toEqual([]);
    expect(seen.badges).toEqual([]);
    if (path.split("/").length > 4) expect(seen.note).toBe(!seen.anything);
  });
});
