// The credits live on one page: every page's top bar links to it, no page has a footer, and the credits
// page names the content's authors, both licences, the credit line and the ways to contribute.
import { describe, expect, test } from "bun:test";
import { SITE } from "../../scripts/lib.ts";
import { readPage, testSite } from "./test-site.ts";

const pages = await testSite();

describe.each(pages)("%s", (path) => {
  test("the top bar links to the credits page beside the theme switch, and the page has no footer", async () => {
    const doc = await readPage(path);
    const tools = [...doc.querySelectorAll(".topbar .tools > *")].map((el) => el.getAttribute("href") ?? el.id);
    expect(tools).toEqual(["/credits/", "theme"]);
    const link = doc.querySelector('.topbar a[href="/credits/"]');
    expect(link?.getAttribute("aria-label")).toBe("Credits");
    expect(link?.getAttribute("aria-current")).toBe(path === "credits/index.html" ? "page" : null);
    expect(doc.querySelector("footer")).toBeNull();
  });
});

test("the credits page names the authors, both licences, the credit line and the ways to contribute", async () => {
  const doc = await readPage("credits/index.html");
  const hrefs = [...doc.querySelectorAll("main a")].map((a) => a.getAttribute("href") ?? "");
  const { content, code } = SITE.licences;
  expect(doc.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe("http://127.0.0.1/credits/");
  expect(doc.querySelector(`main a[href="${SITE.repository}/graphs/contributors"]`)?.textContent).toBe(SITE.credit);
  expect(doc.querySelector('main a[rel="license"]')?.getAttribute("href")).toBe(content.url);
  expect(hrefs).toContain(code.url);
  expect(doc.querySelector(".credit-line")?.textContent).toBe(`${SITE.credit}, ${SITE.url} — ${content.name}`);
  expect(hrefs).toContain(SITE.repository);
  expect(hrefs).toContain(`${SITE.repository}/blob/main/CONTRIBUTING.md`);
  expect(hrefs.some((h) => h.startsWith(`${SITE.repository}/issues/new?template=report-a-mistake.yml`))).toBe(true);
});
