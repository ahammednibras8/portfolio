/* A small mouse-led drift of the existing texture, with no idle animation. */
export {};

const surfaces = document.querySelectorAll<HTMLElement>(
  ".page > .exhibit-hero",
);
const preferences = [
  matchMedia("(hover: hover) and (pointer: fine)"),
  matchMedia("(prefers-reduced-motion: no-preference)"),
  matchMedia("(forced-colors: none)"),
  matchMedia("screen"),
];
let listeners: AbortController | undefined;
let active: HTMLElement | null = null;
let point: { surface: HTMLElement; x: number; y: number } | null = null;
let frame = 0;

const allowed = () =>
  preferences.every(({ matches }) => matches) && !document.hidden;

const reset = () => {
  cancelAnimationFrame(frame);
  frame = 0;
  point = null;
  active?.style.removeProperty("--dots-x");
  active?.style.removeProperty("--dots-y");
  active = null;
};

const draw = () => {
  frame = 0;
  if (!point || !allowed()) return reset();
  const { surface, x, y } = point;
  // One geometry read per requested frame, never a continuous frame loop.
  const bounds = surface.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return reset();
  const offset = (position: number, start: number, size: number) =>
    (
      Math.max(-1, Math.min(1, ((position - start) / size - 0.5) * 2)) * 6
    ).toFixed(2) + "px";
  if (active !== surface) {
    active?.style.removeProperty("--dots-x");
    active?.style.removeProperty("--dots-y");
  }
  active = surface;
  active.style.setProperty("--dots-x", offset(x, bounds.left, bounds.width));
  active.style.setProperty("--dots-y", offset(y, bounds.top, bounds.height));
};

const synchronize = () => {
  listeners?.abort();
  reset();
  if (!allowed() || !surfaces.length) return;
  listeners = new AbortController();
  const options = { passive: true, signal: listeners.signal };
  for (const surface of surfaces) {
    surface.addEventListener(
      "pointermove",
      (event) => {
        if (event.pointerType !== "mouse" || event.buttons !== 0)
          return reset();
        point = { surface, x: event.clientX, y: event.clientY };
        if (!frame) frame = requestAnimationFrame(draw);
      },
      options,
    );
    surface.addEventListener("pointerleave", reset, options);
    surface.addEventListener("pointercancel", reset, options);
    surface.addEventListener("pointerdown", reset, options);
  }
  window.addEventListener("scroll", reset, options);
  window.addEventListener("resize", reset, options);
  window.addEventListener("blur", reset, options);
  document.addEventListener("focusin", reset, options);
};

for (const preference of preferences)
  preference.addEventListener("change", synchronize);
document.addEventListener("visibilitychange", synchronize);
synchronize();
