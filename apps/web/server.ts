// Development server: builds the static site, serves it, rebuilds on every change and
// reloads open pages over server-sent events. Run: npm start → listens on every interface, port 47380.
import { watch } from "node:fs";
import { stat } from "node:fs/promises";
import { networkInterfaces } from "node:os";
import { join, normalize } from "node:path";
import { ROOT } from "../../scripts/lib.ts";
import { build } from "./build.ts";

const HOST = process.env.HOST ?? "0.0.0.0";
const PORT = Number(process.env.PORT ?? 47380);
// Addresses other devices on the network can reach (phone on the same Wi-Fi).
const LAN = Object.values(networkInterfaces())
  .flat()
  .filter((i) => i && i.family === "IPv4" && !i.internal)
  .map((i) => i!.address);
const SITE = `http://${HOST === "0.0.0.0" ? (LAN[0] ?? "127.0.0.1") : HOST}:${PORT}`;
const OUT = join(ROOT, "build/web");
const NO_STORE = { "Cache-Control": "no-store" };
const encoder = new TextEncoder();
const clients = new Set<ReadableStreamDefaultController<Uint8Array>>();

function send(message: string) {
  for (const client of clients) {
    try {
      client.enqueue(encoder.encode(message));
    } catch {
      clients.delete(client);
    }
  }
}

let queue = Promise.resolve();
function rebuild(reason: string) {
  queue = queue.then(async () => {
    const started = performance.now();
    try {
      const count = await build({ outDir: OUT, dev: true, siteUrl: SITE });
      console.log(`built ${count} pages in ${Math.round(performance.now() - started)} ms (${reason})`);
      send("data: reload\n\n");
    } catch (error) {
      console.error(`build failed (${reason}):`, error instanceof Error ? error.message : error);
    }
  });
  return queue;
}

await rebuild("start");

// Content and web assets trigger a rebuild; TypeScript changes restart the server (bun --watch).
let timer: ReturnType<typeof setTimeout> | undefined;
const changed = new Set<string>();
watch(ROOT, { recursive: true }, (_event, filename) => {
  if (!filename) return;
  const file = String(filename);
  const relevant = (file.startsWith("languages/") && /\.(ya?ml|json)$/.test(file)) || /^apps\/web\/(style\.css|client\.js)$/.test(file);
  if (!relevant) return;
  changed.add(file);
  clearTimeout(timer);
  timer = setTimeout(() => {
    const reason = [...changed].join(", ");
    changed.clear();
    rebuild(reason);
  }, 120);
});
setInterval(() => send(": ping\n\n"), 25_000);

function fileResponse(path: string, status = 200) {
  return new Response(Bun.file(path), { status, headers: NO_STORE });
}

Bun.serve({
  hostname: HOST,
  port: PORT,
  idleTimeout: 0,
  async fetch(req) {
    const pathname = decodeURIComponent(new URL(req.url).pathname);

    if (pathname === "/events") {
      let self: ReadableStreamDefaultController<Uint8Array>;
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          self = controller;
          clients.add(controller);
          controller.enqueue(encoder.encode(": connected\n\n"));
        },
        cancel() {
          clients.delete(self);
        },
      });
      return new Response(stream, { headers: { "Content-Type": "text/event-stream", Connection: "keep-alive", ...NO_STORE } });
    }

    const rel = normalize(pathname).replace(/^\/+/, "");
    if (rel.startsWith("..")) return fileResponse(join(OUT, "404.html"), 404);
    const path = join(OUT, rel);
    const info = await stat(path).catch(() => null);
    if (info?.isDirectory()) {
      if (!pathname.endsWith("/")) return new Response(null, { status: 301, headers: { Location: `${pathname}/` } });
      const index = join(path, "index.html");
      if (await Bun.file(index).exists()) return fileResponse(index);
    } else if (info?.isFile()) {
      return fileResponse(path);
    }
    return fileResponse(join(OUT, "404.html"), 404);
  },
});

if (HOST === "0.0.0.0") {
  console.log(`Language Navigator → http://127.0.0.1:${PORT}/`);
  for (const address of LAN) console.log(`  on your network → http://${address}:${PORT}/`);
} else {
  console.log(`Language Navigator → http://${HOST}:${PORT}/`);
}
