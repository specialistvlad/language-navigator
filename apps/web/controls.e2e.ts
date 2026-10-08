// Small screens: each switch shows its current choice alone; tapping it opens every choice, choosing
// one applies it and closes the switch, and a tap elsewhere closes it too; the top bar slides away on a
// scroll down and returns on a scroll up; the menu shows the logo and closes on a tap beside it. A wide
// screen shows every choice.
// Run: npm run e2e (Chromium from Playwright: bunx playwright install chromium)
import { afterAll, beforeAll, expect, test } from "bun:test";
import { join } from "node:path";
import { type Browser, chromium, type Page } from "playwright";
import { LEVELS } from "../../scripts/lib.ts";
import { SITE_DIR, testSite } from "./test-site.ts";

await testSite();
// Each test opens a page; a cold browser can take seconds to start.
const SLOW = 30_000;
const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch: (req) => {
    const file = decodeURIComponent(new URL(req.url).pathname);
    return new Response(Bun.file(join(SITE_DIR, file.endsWith("/") ? `${file}index.html` : file)));
  },
});
let browser: Browser;
let page: Page;
beforeAll(async () => {
  browser = await chromium.launch();
  page = await browser.newPage();
}, SLOW);
afterAll(async () => {
  await browser.close();
  await server.stop();
});

// One page for every test, as the other browser tests keep, at the width each test asks for.
async function open(width: number): Promise<void> {
  await page.setViewportSize({ width, height: 800 });
  await page.goto(new URL("/en/english/verbs/to-be/?level=a1&view=extended", server.url).href);
}
// The choices a switch shows.
const shown = (selector: string): Promise<string[]> =>
  page.$$eval(`.controls ${selector}`, (els) => els.filter((el) => el.checkVisibility()).map((el) => el.textContent.trim()));
const levels = (): Promise<string[]> => shown("[data-set-level]");
const views = (): Promise<string[]> => shown("[data-set-view]");

test(
  "a small screen shows each switch's choice alone and opens it on a tap",
  async () => {
    await open(390);
    expect(await levels()).toEqual(["A1"]);
    expect(await views()).toEqual(["Extended"]);
    await page.click('.controls [data-set-level="A1"]');
    expect(await levels()).toEqual([...LEVELS]);
    expect(await page.evaluate(() => document.documentElement.dataset["level"])).toBe("A1");
    await page.click('.controls [data-set-level="B1"]');
    expect(await page.evaluate(() => document.documentElement.dataset["level"])).toBe("B1");
    expect(await levels()).toEqual(["B1"]);
    await page.click('.controls [data-set-view="extended"]');
    expect(await views()).toEqual(["Cheatsheet", "Extended"]);
    await page.click(".doc-head h1");
    expect(await views()).toEqual(["Extended"]);
  },
  SLOW,
);

test(
  "a wide screen shows every choice and the logo in the top bar alone",
  async () => {
    await open(1600);
    expect(await levels()).toEqual([...LEVELS]);
    expect(await views()).toEqual(["Cheatsheet", "Extended"]);
    // The logo stays in the top bar.
    expect(await page.locator(".topbar .brand").isVisible()).toBe(true);
    expect(await page.locator(".sidebar .nav-brand").isVisible()).toBe(false);
  },
  SLOW,
);

test(
  "on a small screen the top bar slides away on a scroll down and returns on a scroll up",
  async () => {
    await open(390);
    // The bottom edge of the bar once its slide has finished.
    const edge = async (): Promise<number> => {
      await page.waitForTimeout(400);
      return page.evaluate(() => document.querySelector(".topbar")?.getBoundingClientRect().bottom ?? -1);
    };
    expect(await edge()).toBeGreaterThan(0);
    await page.evaluate(() => {
      scrollBy(0, 800);
    });
    expect(await edge()).toBeLessThanOrEqual(0);
    await page.evaluate(() => {
      scrollBy(0, -200);
    });
    expect(await edge()).toBeGreaterThan(0);
  },
  SLOW,
);

test(
  "on a small screen the menu shows the logo and closes on a tap beside it",
  async () => {
    await open(390);
    expect(await page.locator(".topbar .brand").isVisible()).toBe(false);
    await page.click("#menu");
    await page.waitForTimeout(300);
    expect(await page.locator(".sidebar .nav-brand").isVisible()).toBe(true);
    const before = page.url();
    // The page beside the menu, over a link of the document.
    await page.mouse.click(360, 400);
    expect(await page.evaluate(() => document.body.classList.contains("nav-open"))).toBe(false);
    expect(page.url()).toBe(before);
  },
  SLOW,
);
