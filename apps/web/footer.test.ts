// Every built page credits its content and names both licences, and its mistake report opens filled in
// with that page.
import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { parseHTML } from "linkedom";
import { SITE } from "../../scripts/lib.ts";
import { SITE_DIR, testSite } from "./test-site.ts";

const pages = await testSite();
// The address a built file is served at: a folder's index.html at the folder.
const addressOf = (path: string): string => `http://127.0.0.1/${path.replace(/(^|\/)index\.html$/, "$1")}`;

describe.each(pages)("%s", (path) => {
  test("the footer credits the content and links both licences and a report for this page", async () => {
    const doc = parseHTML(await Bun.file(join(SITE_DIR, path)).text()).document;
    const foot = doc.querySelector("main > footer.site-foot");
    expect(foot).not.toBeNull();
    const hrefs = [...(foot?.querySelectorAll("a") ?? [])].map((a) => a.getAttribute("href") ?? "");
    expect(foot?.textContent).toContain(SITE.credit);
    expect(foot?.querySelector('a[rel="license"]')?.getAttribute("href")).toBe(SITE.licences.content.url);
    expect(hrefs).toContain(SITE.licences.code.url);
    expect(foot?.querySelector(".source")?.textContent).toBe(` · ${addressOf(path)}`);
    const report = hrefs.find((h) => h.startsWith(`${SITE.repository}/issues/new?`));
    const params = new URL(report ?? "https://invalid/").searchParams;
    expect(params.get("template")).toBe("report-a-mistake.yml");
    expect(params.get("page")).toBe(addressOf(path));
  });
});
