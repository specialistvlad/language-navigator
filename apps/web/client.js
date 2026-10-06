// Progressive enhancement for the static pages: level filter, view, theme, menu, live reload.
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
    const level = root.dataset.level || "B1";
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
      mark();
      lanes();
    }
    const view = event.target.closest("[data-set-view]");
    if (view) {
      root.dataset.view = view.dataset.setView;
      store.set("ln-view", view.dataset.setView);
      mark();
      lanes();
    }
    if (event.target.closest("#print")) window.print();
    if (event.target.closest("#menu")) document.body.classList.toggle("nav-open");
    if (event.target.closest("#theme")) {
      theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
      applyTheme(theme);
      store.set("ln-theme", theme);
    }
  });

  mark();

  // Topic sections without grid-lanes: CSS sets the column count, this places each visible
  // section, in order, at the top of the shortest column on a grid of 4px rows.
  function lanes() {
    const sections = document.querySelector(".sections.js-fallback");
    if (!sections) return;
    const count = getComputedStyle(sections).gridTemplateColumns.split(" ").length;
    sections.classList.toggle("js-lanes", count > 1);
    const heights = Array(count).fill(0);
    for (const item of sections.children) {
      item.style.gridColumn = item.style.gridRow = "";
      if (count === 1 || !item.offsetHeight) continue;
      const style = getComputedStyle(item);
      const span = Math.ceil((item.offsetHeight + parseFloat(style.marginTop) + parseFloat(style.marginBottom)) / 4);
      const lane = heights.indexOf(Math.min(...heights));
      item.style.gridColumn = String(lane + 1);
      item.style.gridRow = `${heights[lane] + 1} / span ${span}`;
      heights[lane] += span;
    }
  }
  const sections = document.querySelector(".sections");
  if (sections && !CSS.supports("display", "grid-lanes")) {
    sections.classList.add("js-fallback");
    let width = 0;
    new ResizeObserver(() => {
      if (sections.clientWidth === width) return;
      width = sections.clientWidth;
      lanes();
    }).observe(sections);
    document.fonts.ready.then(lanes);
  }

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
