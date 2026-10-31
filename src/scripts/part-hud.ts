/*
 * The heads-up display: page progress along the header, a part counter, and
 * steps to the next or previous part by button or arrow key. It is a shortcut,
 * not the only way to move, so the page works the same without it.
 */
import { partLinks, partTargets, watchCurrentPart } from "./parts";

const shownAfter = 120;
const footerClearance = 72;
// Close enough to the header line to count as already being at a part's start.
const landedWithin = 32;

const hud = document.querySelector<HTMLElement>(".part-hud");
const header = document.querySelector<HTMLElement>(".site-header");
const footer = document.querySelector<HTMLElement>(".site-footer");
const count = hud?.querySelector<HTMLElement>(".part-hud-count");
const name = hud?.querySelector<HTMLElement>(".part-hud-name");
const back = hud?.querySelector<HTMLButtonElement>('[data-step="-1"]');
const forward = hud?.querySelector<HTMLButtonElement>('[data-step="1"]');

const targets = partTargets();
const names = partLinks().map((link) => link.textContent?.trim() ?? "");
const pad = (number: number) => String(number).padStart(2, "0");

/*
 * Steps are found from where the parts actually sit, never from a counter, so
 * a short part that never crosses the reading line cannot trap anyone. Going
 * back inside a long part first returns to that part's own start.
 */
const stepTarget = (step: -1 | 1) => {
  const line = header?.getBoundingClientRect().bottom ?? 0;
  const gaps = targets.map((part) => part.getBoundingClientRect().top - line);

  if (step > 0) return targets[gaps.findIndex((gap) => gap > landedWithin)];

  return targets.findLast((_, index) => (gaps[index] ?? 0) < -landedWithin);
};

const goTo = (step: -1 | 1) => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  stepTarget(step)?.scrollIntoView({
    behavior: reduced ? "auto" : "smooth",
    block: "start",
  });
};

const update = () => {
  const reach = document.documentElement.scrollHeight - innerHeight;
  const progress = reach > 0 ? Math.min(1, scrollY / reach) : 0;
  const nearFooter = footer
    ? footer.getBoundingClientRect().top < innerHeight - footerClearance
    : false;

  header?.style.setProperty("--page-progress", progress.toFixed(4));
  hud?.classList.toggle("is-shown", scrollY > shownAfter && !nearFooter);

  if (back) back.disabled = stepTarget(-1) === undefined;
  if (forward) forward.disabled = stepTarget(1) === undefined;
};

if (hud && count && name && back && forward) {
  let frame = 0;

  hud.hidden = false;
  update();

  addEventListener(
    "scroll",
    () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    },
    { passive: true },
  );

  back.addEventListener("click", () => {
    goTo(-1);
  });
  forward.addEventListener("click", () => {
    goTo(1);
  });

  addEventListener("keydown", (event) => {
    const step =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    const typing =
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement ||
      (event.target instanceof HTMLElement && event.target.isContentEditable);

    if (!step || typing) return;
    if (event.defaultPrevented) return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }

    event.preventDefault();
    goTo(step);
  });

  watchCurrentPart((index) => {
    count.textContent = `${pad(index + 1)} / ${pad(targets.length)}`;
    name.textContent = names[index] ?? "";
  });
}
