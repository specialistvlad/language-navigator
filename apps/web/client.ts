// Progressive enhancement for the static pages: level filter, view, theme, menu, sidebar scroll, on-this-page highlight, lanes, live reload.
// The build bundles it with its modules into client.js for the browser.
(() => {
  "use strict";
  const root = document.documentElement;
  const store = {
    get(key: string): string | null {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set(key: string, value: string): void {
      try {
        localStorage.setItem(key, value);
      } catch {
        // Storage is off: the preference lasts for this page only.
      }
    },
  };

  // Start-up fills in the level and view, so the buttons only follow them.
  function mark(): void {
    document.querySelectorAll<HTMLElement>("[data-set-level]").forEach((b) => {
      b.classList.toggle("on", b.dataset["setLevel"] === root.dataset["level"]);
    });
    document.querySelectorAll<HTMLElement>("[data-set-view]").forEach((b) => {
      b.classList.toggle("on", b.dataset["setView"] === root.dataset["view"]);
    });
  }

  const THEMES = ["auto", "light", "dark"];
  function applyTheme(name: string): void {
    if (name === "auto") delete root.dataset["theme"];
    else root.dataset["theme"] = name;
    const button = document.getElementById("theme");
    if (button) button.title = `Theme: ${name}`;
  }
  const savedTheme = store.get("ln-theme");
  let theme = savedTheme !== null && savedTheme !== "" ? savedTheme : "auto";
  applyTheme(theme);

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const level = target.closest<HTMLElement>("[data-set-level]")?.dataset["setLevel"];
    if (level !== undefined) {
      root.dataset["level"] = level;
      store.set("ln-level", level);
      showState();
      refresh();
    }
    const view = target.closest<HTMLElement>("[data-set-view]")?.dataset["setView"];
    if (view !== undefined) setView(view);
    if (target.closest("#print")) window.print();
    if (target.closest("#menu")) document.body.classList.toggle("nav-open");
    if (target.closest("#theme")) {
      theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length] ?? "auto";
      applyTheme(theme);
      store.set("ln-theme", theme);
    }
  });

  // A page carries the choice of each switch it has in its address, ?level=a1 and ?view=cheatsheet,
  // so a shared link opens the same state.
  function showState(): void {
    const url = new URL(location.href);
    const level = root.dataset["level"];
    if (filled(level) && document.querySelector("[data-set-level]")) url.searchParams.set("level", level.toLowerCase());
    if (document.querySelector("[data-set-view]")) url.searchParams.set("view", root.dataset["view"] ?? "extended");
    if (url.href !== location.href) history.replaceState(history.state, "", url);
  }
  const filled = (value: string | undefined): value is string => value !== undefined && value !== "";

  function setView(view: string): void {
    root.dataset["view"] = view;
    store.set("ln-view", view);
    showState();
    refresh();
  }

  function refresh(): void {
    mark();
    lanes();
    spy();
  }

  // The address wins over the stored choices, also where storage is off.
  const params = new URL(location.href).searchParams;
  const askedLevel = (params.get("level") ?? "").toUpperCase();
  if (document.querySelector(`[data-set-level="${askedLevel}"]`)) root.dataset["level"] = askedLevel;
  const askedView = params.get("view");
  if (askedView === "cheatsheet" || askedView === "extended") root.dataset["view"] = askedView;
  if (!filled(root.dataset["view"])) root.dataset["view"] = "extended";
  if (!filled(root.dataset["level"])) {
    root.dataset["level"] = document.querySelector<HTMLElement>("[data-set-level]:last-child")?.dataset["setLevel"] ?? "";
  }
  showState();
  mark();

  // On this page: highlights the section being read, the lowest section top above 30% of the window
  // (or the first section on screen before any reaches that line).
  const tocLinks = [...document.querySelectorAll<HTMLAnchorElement>(".toc a[href^='#']")];
  const tocParts = tocLinks.map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1))));
  let spyFrame = 0;
  function spy(): void {
    spyFrame = 0;
    const line = innerHeight * 0.3;
    let current = -1;
    let currentTop = -Infinity;
    let first = -1;
    let firstTop = Infinity;
    tocParts.forEach((part, i) => {
      if (part === null || part.offsetHeight === 0) return;
      const top = part.getBoundingClientRect().top;
      if (top <= line && top > currentTop) [current, currentTop] = [i, top];
      if (top < firstTop) [first, firstTop] = [i, top];
    });
    if (current < 0) current = first;
    tocLinks.forEach((a, i) => {
      a.classList.toggle("on", i === current);
    });
  }
  const scheduleSpy = (): void => {
    if (spyFrame === 0) spyFrame = requestAnimationFrame(spy);
  };
  if (tocLinks.length > 0) {
    addEventListener("scroll", scheduleSpy, { passive: true });
    addEventListener("resize", scheduleSpy);
    spy();
  }

  // Sidebar scroll position for the next page; the page shell restores it.
  const sidebar = document.getElementById("sidebar");
  if (sidebar) {
    addEventListener("pagehide", () => {
      try {
        sessionStorage.setItem("ln-nav", JSON.stringify({ k: sidebar.dataset["key"], t: sidebar.scrollTop }));
      } catch {
        // Storage is off: the next page opens its menu at the top.
      }
    });
  }

  // Lanes without grid-lanes: CSS sets the column count, this places each visible block, in order,
  // at the top of the shortest column on a grid of 4px rows.
  const fallback = CSS.supports("display", "grid-lanes") ? [] : [...document.querySelectorAll<HTMLElement>(".lanes")];
  function lanes(): void {
    for (const el of fallback) {
      const style = getComputedStyle(el);
      const count = style.gridTemplateColumns.split(" ").length;
      const gapValue = parseFloat(style.getPropertyValue("--lane-gap"));
      const gap = Number.isNaN(gapValue) ? 0 : gapValue;
      el.classList.toggle("js-lanes", count > 1);
      const heights = new Array<number>(count).fill(0);
      for (const item of el.children) {
        if (!(item instanceof HTMLElement)) continue;
        item.style.gridColumn = "";
        item.style.gridRow = "";
        if (count === 1 || item.offsetHeight === 0) continue;
        const margins = parseFloat(getComputedStyle(item).marginTop) + parseFloat(getComputedStyle(item).marginBottom);
        const span = Math.ceil((item.offsetHeight + margins + gap) / 4);
        const lane = heights.indexOf(Math.min(...heights));
        const height = heights[lane] ?? 0;
        item.style.gridColumn = String(lane + 1);
        item.style.gridRow = `${height + 1} / span ${span}`;
        heights[lane] = height + span;
      }
    }
  }
  const widths = new Map<Element, number>();
  const observer = new ResizeObserver((entries) => {
    if (entries.every((e) => widths.get(e.target) === e.target.clientWidth)) return;
    for (const e of entries) widths.set(e.target, e.target.clientWidth);
    lanes();
  });
  fallback.forEach((el) => {
    observer.observe(el);
  });
  if (fallback.length > 0) void document.fonts.ready.then(lanes);

  // Live reload while `npm start` runs: reload on rebuild and after a server restart.
  if (root.dataset["dev"] === "1") {
    let lost = false;
    const source = new EventSource("/events");
    source.onopen = () => {
      if (lost) location.reload();
    };
    source.onerror = () => {
      lost = true;
    };
    source.onmessage = (event: MessageEvent<unknown>) => {
      if (event.data === "reload") location.reload();
    };
  }
})();
