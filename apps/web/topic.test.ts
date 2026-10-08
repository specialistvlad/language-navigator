// Every topic page's header links to its file in GitHub's editor, named Edit on GitHub for screen
// readers, its visible text Edit on beside the GitHub mark.
import { expect, test } from "bun:test";
import { join } from "node:path";
import { parseHTML } from "linkedom";
import { SITE } from "../../scripts/lib.ts";
import { SITE_DIR, testSite } from "./test-site.ts";

const pages = await testSite();
const topicPages = pages.filter((p) => /^en\/\w+\/[\w-]+\/[\w-]+\/index\.html$/.test(p) && !p.includes("/cheatsheets/"));

test.each(topicPages)("%s links to its file in GitHub's editor, named Edit on GitHub", async (path) => {
  const doc = parseHTML(await Bun.file(join(SITE_DIR, path)).text()).document;
  const edit = doc.querySelector(".doc-head a.tool.edit");
  expect(edit?.getAttribute("href")).toStartWith(`${SITE.repository}/edit/main/languages/`);
  expect(edit?.getAttribute("aria-label")).toBe("Edit on GitHub");
  expect(edit?.textContent).toBe("Edit on");
});
