// The top bar and the menu on small screens (media.css). The top bar: it slides away while the reader scrolls down and comes back
// on a scroll up, near the top of the page, and while the menu or a switch is open.
// The open menu closes on a tap outside it; that tap only closes the menu. Capture runs before
// client.ts and the page act on the tap.
export function closingMenu(): void {
  document.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      if (!document.body.classList.contains("nav-open") || !(target instanceof Element)) return;
      if (target.closest("#sidebar, #menu")) return;
      document.body.classList.remove("nav-open");
      event.preventDefault();
      event.stopPropagation();
    },
    true,
  );
}

export function hidingBar(): void {
  const root = document.documentElement;
  let last = scrollY;
  let frame = 0;
  const update = (): void => {
    frame = 0;
    const y = scrollY;
    const open = document.body.classList.contains("nav-open") || document.querySelector(".seg.open") !== null;
    if (open || y < 60) root.classList.remove("bar-hidden");
    else if (y > last + 4) root.classList.add("bar-hidden");
    else if (y < last - 4) root.classList.remove("bar-hidden");
    // Small moves add up until they pass the threshold.
    if (open || Math.abs(y - last) > 4) last = y;
  };
  addEventListener(
    "scroll",
    () => {
      if (frame === 0) frame = requestAnimationFrame(update);
    },
    { passive: true },
  );
}
