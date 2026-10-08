// Live reload while `npm start` runs: reload on rebuild and after a server restart.
export function liveReload(): void {
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
