// The study-path step being read on a topic page: the step its address names, ?step=a1, while the level
// filter shows it; else the highest step at or below the filter, else the lowest. The menu marks it as
// the current step, and Up next and the previous and next rows show the steps around it. Returns the update for client.ts to call on
// every change.
export function studyStep(root: HTMLElement): () => void {
  const levels = [...document.querySelectorAll<HTMLElement>("[data-set-level]")].map((b) => b.dataset["setLevel"] ?? "");
  const steps = [...document.querySelectorAll<HTMLAnchorElement>('.nav-list[data-order="path"] a.on')];
  const rank = (a: HTMLElement): number => levels.indexOf(a.dataset["level"] ?? "");
  return () => {
    if (steps.length === 0) return;
    const at = levels.indexOf(root.dataset["level"] ?? "");
    const asked = (new URL(location.href).searchParams.get("step") ?? "").toUpperCase();
    const shown = steps.filter((a) => rank(a) <= at);
    const current = shown.find((a) => a.dataset["level"] === asked) ?? shown.pop() ?? steps[0];
    steps.forEach((a) => {
      if (a === current) a.setAttribute("aria-current", "step");
      else a.removeAttribute("aria-current");
    });
    document.querySelectorAll<HTMLElement>('[data-order="path"][data-step]').forEach((el) => {
      el.hidden = el.dataset["step"] !== current?.dataset["level"];
    });
  };
}
