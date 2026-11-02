/* The printed dots give the mouse room, then settle back into their grid. */
export {};

type Dot = {
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  toX: number;
  toY: number;
};
type Field = {
  surface: HTMLElement;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  width: number;
  height: number;
  radius: number;
  reach: number;
  travel: number;
  dots: Dot[];
};

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
let active: Field | null = null;
let point: { surface: HTMLElement; x: number; y: number } | null = null;
let frame = 0;
let previousTime = 0;
let returning = false;

const allowed = () =>
  preferences.every(({ matches }) => matches) && !document.hidden;

const stop = () => {
  cancelAnimationFrame(frame);
  frame = 0;
  previousTime = 0;
  point = null;
  if (active) {
    active.surface.classList.remove("has-dot-field");
    active.canvas.remove();
    active.canvas.width = active.canvas.height = 0;
    active = null;
  }
};

const createField = (
  surface: HTMLElement,
  width: number,
  height: number,
): Field | null => {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return null;
  const step = parseFloat(getComputedStyle(document.documentElement).fontSize);
  // Bound backing-store memory on large/retina displays, not the grid spacing.
  const ratio = Math.min(
    devicePixelRatio || 1,
    2,
    Math.sqrt(4_000_000 / (width * height)),
  );
  canvas.width = Math.ceil(width * ratio);
  canvas.height = Math.ceil(height * ratio);
  canvas.className = "dot-field";
  canvas.setAttribute("aria-hidden", "true");
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.fillStyle = getComputedStyle(surface)
    .getPropertyValue("--color-rule-structural")
    .trim();
  const dots: Dot[] = [];
  for (let y = step / 2; y < height; y += step) {
    for (let x = step / 2; x < width; x += step) {
      dots.push({ homeX: x, homeY: y, x, y, toX: x, toY: y });
    }
  }
  surface.append(canvas);
  surface.classList.add("has-dot-field");
  return {
    surface,
    canvas,
    context,
    width,
    height,
    radius: step * 0.095,
    reach: step * 7,
    travel: step * 3,
    dots,
  };
};

const draw = (time: number) => {
  frame = 0;
  if (!allowed()) return stop();
  if (point) {
    const { surface, x, y } = point;
    point = null;
    // One geometry read per input batch; settling never reads layout.
    const bounds = surface.getBoundingClientRect();
    const style = getComputedStyle(surface);
    const left = bounds.left + parseFloat(style.borderLeftWidth);
    const top = bounds.top + parseFloat(style.borderTopWidth);
    const width =
      bounds.width -
      parseFloat(style.borderLeftWidth) -
      parseFloat(style.borderRightWidth);
    const height =
      bounds.height -
      parseFloat(style.borderTopWidth) -
      parseFloat(style.borderBottomWidth);
    if (
      width <= 0 ||
      height <= 0 ||
      x < left ||
      x > left + width ||
      y < top ||
      y > top + height
    )
      return stop();
    if (
      active?.surface !== surface ||
      active.width !== width ||
      active.height !== height
    ) {
      stop();
      active = createField(surface, width, height);
    }
    if (!active) return;
    returning = false;
    const localX = x - left;
    const localY = y - top;
    for (const dot of active.dots) {
      const dx = dot.homeX - localX;
      const dy = dot.homeY - localY;
      const distance = Math.hypot(dx, dy);
      const push =
        active.travel * Math.max(0, 1 - distance / active.reach) ** 2;
      // An exact hit still flees in a stable direction, without division by zero.
      dot.toX = dot.homeX + (distance ? dx / distance : 1) * push;
      dot.toY = dot.homeY + (distance ? dy / distance : 0) * push;
    }
  }
  if (!active) return;
  const { context, dots, width, height, radius } = active;
  const elapsed = previousTime ? Math.min(64, time - previousTime) : 1000 / 60;
  const blend = 1 - Math.exp(-elapsed / (returning ? 140 : 70));
  let moving = false;
  context.clearRect(0, 0, width, height);
  context.beginPath();
  for (const dot of dots) {
    dot.x += (dot.toX - dot.x) * blend;
    dot.y += (dot.toY - dot.y) * blend;
    if (Math.hypot(dot.toX - dot.x, dot.toY - dot.y) < 0.08) {
      dot.x = dot.toX;
      dot.y = dot.toY;
    } else moving = true;
    context.moveTo(dot.x + radius, dot.y);
    context.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
  }
  context.fill();
  if (moving) {
    previousTime = time;
    frame = requestAnimationFrame(draw);
  } else {
    previousTime = 0;
    if (returning) stop();
  }
};

const release = () => {
  point = null;
  if (!active) return stop();
  returning = true;
  for (const dot of active.dots) {
    dot.toX = dot.homeX;
    dot.toY = dot.homeY;
  }
  if (!frame) frame = requestAnimationFrame(draw);
};

const synchronize = () => {
  listeners?.abort();
  stop();
  if (!allowed() || !surfaces.length) return;
  listeners = new AbortController();
  const options = { passive: true, signal: listeners.signal };
  for (const surface of surfaces) {
    surface.addEventListener(
      "pointermove",
      (event) => {
        if (event.pointerType !== "mouse" || event.buttons !== 0)
          return release();
        point = { surface, x: event.clientX, y: event.clientY };
        if (!frame) frame = requestAnimationFrame(draw);
      },
      options,
    );
    surface.addEventListener("pointerleave", release, options);
    surface.addEventListener("pointercancel", release, options);
    surface.addEventListener("pointerdown", release, options);
  }
  window.addEventListener("scroll", stop, options);
  window.addEventListener("resize", stop, options);
  window.addEventListener("blur", stop, options);
  document.addEventListener("focusin", stop, options);
};

for (const preference of preferences)
  preference.addEventListener("change", synchronize);
document.addEventListener("visibilitychange", synchronize);
synchronize();
