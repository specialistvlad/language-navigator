// Level colours in a browser: in the light and the dark theme, every level's code reads clearly on
// its tint in a badge and in the level switcher (WCAG contrast at least 4.5:1), and the hues stay in
// rainbow order. Run with npm run e2e.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { type Browser, chromium, type Page } from "playwright";
import { LEVEL_INFO } from "../../scripts/lib.ts";
import { SITE_DIR, testSite } from "./test-site.ts";

await testSite();
const server = Bun.serve({
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
  page = await browser.newPage();
});
afterAll(async () => {
  await browser.close();
  await server.stop();
});

// Contrast of each level's code on its tint, in a badge half and in the chosen switcher button.
async function contrasts(): Promise<Record<string, { badge: number; switcher: number }>> {
  return page.evaluate(
    (codes) => {
      const canvas = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
      if (!canvas) throw new Error("no canvas");
      // A CSS colour as sRGB channels, read back from a canvas pixel.
      const rgb = (colour: string): number[] => {
        canvas.clearRect(0, 0, 1, 1);
        canvas.fillStyle = colour;
        canvas.fillRect(0, 0, 1, 1);
        return [...canvas.getImageData(0, 0, 1, 1).data.slice(0, 3)];
      };
      const luminance = (c: number[]): number => {
        const [r = 0, g = 0, b = 0] = c.map((v) => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4));
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const ratio = (el: Element): number => {
        const style = getComputedStyle(el);
        const [a, b] = [luminance(rgb(style.color)), luminance(rgb(style.backgroundColor))];
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      };
      const out: Record<string, { badge: number; switcher: number }> = {};
      for (const code of codes) {
        const badge = document.createElement("span");
        badge.className = "badge lvl";
        const half = document.createElement("span");
        half.className = `half lvl-${code}`;
        half.textContent = code;
        badge.append(half);
        document.body.append(badge);
        document.documentElement.dataset["level"] = code;
        const button = document.querySelector(`.seg [data-set-level="${code}"]`);
        button?.classList.add("on");
        out[code] = { badge: ratio(half), switcher: button ? ratio(button) : 0 };
        button?.classList.remove("on");
        badge.remove();
      }
      return out;
    },
    LEVEL_INFO.map((l) => l.code),
  );
}

describe.each(["light", "dark"] as const)("%s theme", (theme) => {
  test("every level reads clearly on its tint", async () => {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto(`${server.url.href}en/english/`);
    const seen = await contrasts();
    for (const [code, { badge, switcher }] of Object.entries(seen)) {
      expect({ code, badge: badge >= 4.5, switcher: switcher >= 4.5 }).toEqual({ code, badge: true, switcher: true });
    }
  });
});

test("the levels run through the rainbow, lowest first", () => {
  const hues = LEVEL_INFO.map((l) => l.hue);
  expect(hues).toEqual([...hues].sort((a, b) => a - b));
  expect(new Set(hues).size).toBe(hues.length);
});
