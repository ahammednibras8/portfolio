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
// The longest a smooth step can take, after which the trip is forgotten.
const tripHold = 1500;
// How far outside its trip the page may drift before the trip no longer counts.
const tripSlack = 50;

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

const headerLine = () => header?.getBoundingClientRect().bottom ?? 0;

/*
 * The trip a step has started: where the page was, the part it is heading to,
 * and where that part will rest. Quick repeated steps chain from the part, so
 * each does not measure the page mid-scroll and pick the same part again. A
 * trip ends on arrival, on any other way of moving the page, after a hold, or
 * when the page leaves its corridor, so a stale one can never hijack a step.
 */
type Trip = { from: number; part: HTMLElement; to: number };
let trip: Trip | undefined;
let tripTimer: ReturnType<typeof setTimeout>;

const endTrip = () => {
  trip = undefined;
  clearTimeout(tripTimer);
};

const liveTrip = () => {
  if (
    trip &&
    (scrollY < Math.min(trip.from, trip.to) - tripSlack ||
      scrollY > Math.max(trip.from, trip.to) + tripSlack)
  ) {
    endTrip();
  }

  return trip;
};

/*
 * Steps are found from where the parts actually sit, never from a counter, so
 * a short part that never crosses the reading line cannot trap anyone. Going
 * back inside a long part first returns to that part's own start.
 */
const stepTarget = (step: -1 | 1) => {
  const started = liveTrip();

  if (started) return targets[targets.indexOf(started.part) + step];

  const line = headerLine();
  const gaps = targets.map((part) => part.getBoundingClientRect().top - line);

  if (step > 0) return targets[gaps.findIndex((gap) => gap > landedWithin)];

  for (let index = targets.length - 1; index >= 0; index -= 1) {
    if ((gaps[index] ?? 0) < -landedWithin) return targets[index];
  }

  return undefined;
};

const update = () => {
  if (
    trip &&
    Math.abs(trip.part.getBoundingClientRect().top - headerLine()) <=
      landedWithin
  ) {
    endTrip();
  }

  const reach = document.documentElement.scrollHeight - innerHeight;
  const progress = reach > 0 ? Math.min(1, scrollY / reach) : 0;
  const nearFooter = footer
    ? footer.getBoundingClientRect().top < innerHeight - footerClearance
    : false;

  header?.style.setProperty("--page-progress", progress.toFixed(4));
  hud?.classList.toggle("is-shown", scrollY > shownAfter && !nearFooter);

  // aria-disabled keeps keyboard focus on the button when a step runs out.
  back?.setAttribute("aria-disabled", String(stepTarget(-1) === undefined));
  forward?.setAttribute("aria-disabled", String(stepTarget(1) === undefined));
};

const goTo = (step: -1 | 1) => {
  const target = stepTarget(step);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!target) return;

  const from = trip?.from ?? scrollY;
  const to = scrollY + target.getBoundingClientRect().top - headerLine();

  endTrip();
  trip = { from, part: target, to };
  tripTimer = setTimeout(() => {
    endTrip();
    update();
  }, tripHold);

  target.scrollIntoView({
    behavior: reduced ? "auto" : "smooth",
    block: "start",
  });
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

  // Any other way of moving the page ends a step in progress.
  for (const other of ["wheel", "touchstart", "hashchange"]) {
    addEventListener(other, endTrip, { passive: true });
  }

  addEventListener(
    "pointerdown",
    ({ target }) => {
      if (!(target instanceof Element && target.closest(".part-hud"))) {
        endTrip();
      }
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
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") endTrip();

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

    // A held key must not fly through every part.
    if (!event.repeat) goTo(step);
  });

  watchCurrentPart((index) => {
    count.textContent = `${pad(index + 1)} / ${pad(targets.length)}`;
    name.textContent = names[index] ?? "";
  });
}
