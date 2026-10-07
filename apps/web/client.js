// Progressive enhancement for the static pages: level filter, view, theme, menu, sidebar scroll, on-this-page highlight, lanes, live reload.
(() => {
  "use strict";
  const root = document.documentElement;
  const store = {
    get(key) {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch {}
    },
  };

  function mark() {
    const level = root.dataset.level || document.querySelector("[data-set-level]:last-child")?.dataset.setLevel;
    const view = root.dataset.view || "guide";
    document.querySelectorAll("[data-set-level]").forEach((b) => b.classList.toggle("on", b.dataset.setLevel === level));
    document.querySelectorAll("[data-set-view]").forEach((b) => b.classList.toggle("on", b.dataset.setView === view));
  }

  const THEMES = ["auto", "light", "dark"];
  function applyTheme(theme) {
    if (theme === "auto") delete root.dataset.theme;
    else root.dataset.theme = theme;
    const button = document.getElementById("theme");
    if (button) button.title = `Theme: ${theme}`;
  }
  let theme = store.get("ln-theme") || "auto";
  applyTheme(theme);

  document.addEventListener("click", (event) => {
    const level = event.target.closest("[data-set-level]");
    if (level) {
      root.dataset.level = level.dataset.setLevel;
      store.set("ln-level", level.dataset.setLevel);
      refresh();
    }
    const view = event.target.closest("[data-set-view]");
    if (view) setView(view.dataset.setView);
    // On this page: a section link opens the Guide view, the Essentials entry opens its view at the top.
    const entry = event.target.closest(".toc [data-view]");
    if (entry) {
      setView(entry.dataset.view);
      if (entry.dataset.view === "essentials") scrollTo({ top: 0 });
    }
    if (event.target.closest("#print")) window.print();
    if (event.target.closest("#menu")) document.body.classList.toggle("nav-open");
    if (event.target.closest("#theme")) {
      theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
      applyTheme(theme);
      store.set("ln-theme", theme);
    }
  });

  function setView(view) {
    root.dataset.view = view;
    store.set("ln-view", view);
    refresh();
  }

  function refresh() {
    mark();
    lanes();
    spy();
  }

  mark();

  // On this page: highlights the section being read, the lowest section top above 30% of the window
  // (or the first section on screen before any reaches that line).
  const tocLinks = [...document.querySelectorAll(".toc a[href^='#']")];
  const tocParts = tocLinks.map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1))));
  let spyFrame = 0;
  function spy() {
    spyFrame = 0;
    const line = innerHeight * 0.3;
    let current = -1;
    let currentTop = -Infinity;
    let first = -1;
    let firstTop = Infinity;
    tocParts.forEach((part, i) => {
      if (!part || !part.offsetHeight) return;
      const top = part.getBoundingClientRect().top;
      if (top <= line && top > currentTop) [current, currentTop] = [i, top];
      if (top < firstTop) [first, firstTop] = [i, top];
    });
    if (current < 0) current = first;
    tocLinks.forEach((a, i) => a.classList.toggle("on", i === current));
  }
  if (tocLinks.length) {
    addEventListener("scroll", () => (spyFrame ||= requestAnimationFrame(spy)), { passive: true });
    addEventListener("resize", () => (spyFrame ||= requestAnimationFrame(spy)));
    spy();
  }

  // Sidebar scroll position for the next page; the page shell restores it.
  const sidebar = document.getElementById("sidebar");
  if (sidebar) {
    addEventListener("pagehide", () => {
      try {
        sessionStorage.setItem("ln-nav", JSON.stringify({ k: sidebar.dataset.key, t: sidebar.scrollTop }));
      } catch {}
    });
  }

  // Lanes without grid-lanes: CSS sets the column count, this places each visible block, in order,
  // at the top of the shortest column on a grid of 4px rows.
  const fallback = CSS.supports("display", "grid-lanes") ? [] : [...document.querySelectorAll(".lanes")];
  function lanes() {
    for (const el of fallback) {
      const style = getComputedStyle(el);
      const count = style.gridTemplateColumns.split(" ").length;
      const gap = parseFloat(style.getPropertyValue("--lane-gap")) || 0;
      el.classList.toggle("js-lanes", count > 1);
      const heights = Array(count).fill(0);
      for (const item of el.children) {
        item.style.gridColumn = item.style.gridRow = "";
        if (count === 1 || !item.offsetHeight) continue;
        const margins = parseFloat(getComputedStyle(item).marginTop) + parseFloat(getComputedStyle(item).marginBottom);
        const span = Math.ceil((item.offsetHeight + margins + gap) / 4);
        const lane = heights.indexOf(Math.min(...heights));
        item.style.gridColumn = String(lane + 1);
        item.style.gridRow = `${heights[lane] + 1} / span ${span}`;
        heights[lane] += span;
      }
    }
  }
  const widths = new Map();
  const observer = new ResizeObserver((entries) => {
    if (entries.every((e) => widths.get(e.target) === e.target.clientWidth)) return;
    for (const e of entries) widths.set(e.target, e.target.clientWidth);
    lanes();
  });
  fallback.forEach((el) => observer.observe(el));
  if (fallback.length) document.fonts.ready.then(lanes);

  // Live reload while `npm start` runs: reload on rebuild and after a server restart.
  if (root.dataset.dev === "1") {
    let lost = false;
    const source = new EventSource("/events");
    source.onopen = () => {
      if (lost) location.reload();
    };
    source.onerror = () => {
      lost = true;
    };
    source.onmessage = (event) => {
      if (event.data === "reload") location.reload();
    };
  }
})();
