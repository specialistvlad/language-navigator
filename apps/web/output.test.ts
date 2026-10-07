// Analytics comes from the build options alone: a build that names an Umami website reports to it from
// its own host; any other build carries no analytics script.
import { expect, test } from "bun:test";
import { parseHTML } from "linkedom";
import type { BuildOptions } from "./context.ts";
import { withAnalytics } from "./output.ts";

const html = "<!doctype html><html><head><title>t</title></head><body></body></html>";
const base: BuildOptions = { outDir: "", dev: false, siteUrl: "https://langs123.com" };

test("a build with an Umami website puts one script in the head, limited to the site's host", () => {
  const out = withAnalytics(html, { ...base, umami: { websiteId: "abc-123", src: "https://cloud.umami.is/script.js" } });
  const scripts = parseHTML(out).document.head.querySelectorAll("script");
  expect(scripts.length).toBe(1);
  const [script] = scripts;
  expect(script?.getAttribute("src")).toBe("https://cloud.umami.is/script.js");
  expect(script?.getAttribute("data-website-id")).toBe("abc-123");
  expect(script?.getAttribute("data-domains")).toBe("langs123.com");
  expect(script?.hasAttribute("defer")).toBe(true);
});

test("a build without an Umami website leaves the page as it is", () => {
  expect(withAnalytics(html, base)).toBe(html);
});
