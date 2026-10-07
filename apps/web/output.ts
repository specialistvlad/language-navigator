// Writes the built site: every page, the sitemap, robots.txt and the assets, swapped in place at once.
import { mkdir, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import { clientJs, levelsCss, styleCss } from "./assets.ts";
import type { BuildOptions, Page } from "./context.ts";

export async function writeSite(pages: Page[], o: BuildOptions): Promise<void> {
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .filter((p) => p.sitemap)
  .map((p) => `  <url><loc>${o.siteUrl}${p.path}</loc></url>`)
  .join("\n")}
</urlset>
`;
  const robots = `User-agent: *\nAllow: /\nSitemap: ${o.siteUrl}/sitemap.xml\n`;

  // A site served below the domain root (a GitHub Pages project site) prefixes every root-relative link.
  const base = new URL(o.siteUrl).pathname.replace(/\/$/, "");
  const rebase = (html: string): string => (base !== "" ? html.replace(/\b(href|src)="\/(?!\/)/g, `$1="${base}/`) : html);

  // Write into a fresh folder, then swap it in place.
  const tmp = `${o.outDir}.tmp`;
  const old = `${o.outDir}.old`;
  await rm(tmp, { recursive: true, force: true });
  await mkdir(tmp, { recursive: true });
  for (const p of pages) {
    const file = p.path.endsWith("/") ? join(tmp, p.path, "index.html") : join(tmp, p.path);
    await Bun.write(file, rebase(p.html));
  }
  await Bun.write(join(tmp, "sitemap.xml"), sitemap);
  await Bun.write(join(tmp, "robots.txt"), robots);
  await Bun.write(join(tmp, "style.css"), await styleCss());
  await Bun.write(join(tmp, "levels.css"), levelsCss());
  await Bun.write(join(tmp, "client.js"), await clientJs());
  await rm(old, { recursive: true, force: true });
  await rename(o.outDir, old).catch(() => {
    // No earlier build to move aside.
  });
  await rename(tmp, o.outDir);
  await rm(old, { recursive: true, force: true });
}
