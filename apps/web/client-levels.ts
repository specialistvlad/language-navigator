// Level badges read lowest–highest; under the level filter the highest level shown is the filter's,
// so a section running (A1][B1) reads (A1][A2) while the filter is at A2, and (A1) at A1. The level
// buttons give the order; the halves match badge() and listBadge() in parts.ts.
const half = (level: string): string => `<span class="half lvl-${level}">${level}</span>`;

export function trimBadges(root: HTMLElement): void {
  const order = [...document.querySelectorAll<HTMLElement>(".seg [data-set-level]")].map((b) => b.dataset["setLevel"] ?? "");
  const at = order.indexOf(root.dataset["level"] ?? "");
  if (at < 0) return;
  document.querySelectorAll<HTMLElement>(".lvl[data-from][data-to]").forEach((b) => {
    const from = b.dataset["from"] ?? "";
    const to = b.dataset["to"] ?? "";
    const shown = order[Math.max(order.indexOf(from), Math.min(order.indexOf(to), at))] ?? to;
    const html = shown === from ? half(from) : `${half(from)}<span class="sr-only">–</span>${half(shown)}`;
    if (b.innerHTML !== html) b.innerHTML = html;
  });
}
