// Writes the built site: every page, the sitemap, robots.txt and the assets, swapped in place at once.
import { mkdir, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import { clientJs, levelsCss, styleCss } from "./assets.ts";
import type { BuildOptions, Page } from "./context.ts";
import { escapeHtml } from "./html.ts";

// A build that names an Umami website puts its script in every page's head. The script counts visits
// on the site's own host (data-domains), so a copy of the built pages served elsewhere reports nothing.
export function withAnalytics(html: string, o: BuildOptions): string {
  if (o.umami === undefined) return html;
  const host = new URL(o.siteUrl).hostname;
  const script = `<script defer src="${escapeHtml(o.umami.src)}" data-website-id="${escapeHtml(o.umami.websiteId)}" data-domains="${escapeHtml(host)}"></script>`;
  return html.replace("</head>", `  ${script}\n</head>`);
}

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

  // Write into a fresh folder, then swap it in place.
  const tmp = `${o.outDir}.tmp`;
  const old = `${o.outDir}.old`;
  await rm(tmp, { recursive: true, force: true });
  await mkdir(tmp, { recursive: true });
  for (const p of pages) {
    const file = p.path.endsWith("/") ? join(tmp, p.path, "index.html") : join(tmp, p.path);
    await Bun.write(file, withAnalytics(p.html, o));
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
