/* One centered arrival per reading unit. Scrolling always belongs to the visitor. */
export {};

const pieceSelector = [
  ".part:not(:first-child) > :not(article, nav, .folio-mark, .sticker, .toolbox, .architecture-diagram)",
  "article > *",
  ".route-list > li",
  ".toolbox > div",
  ".architecture-build > li",
  ".architecture-path > li",
  ".architecture-diagram > :not(.architecture-build, .architecture-branches)",
  ".architecture-branch > header",
  ".architecture-gate",
].join(", ");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const forcedColors = matchMedia("(forced-colors: active)");
const printing = matchMedia("print");
const pending = new Set<HTMLElement>();
const tracing = new Set<HTMLElement>();
let observer: IntersectionObserver | undefined;
let stopped = false;

const allowed = () =>
  !stopped &&
  !reducedMotion.matches &&
  !forcedColors.matches &&
  !printing.matches;

const settle = (piece: HTMLElement) => {
  observer?.unobserve(piece);
  piece.classList.remove("zoom-ready", "is-zooming");
  piece.style.removeProperty("--zoom-order");
  pending.delete(piece);
};

const zoomIn = async (piece: HTMLElement, order: number) => {
  // Four close beats are enough, even when a tall screen exposes a whole grid.
  piece.style.setProperty("--zoom-order", String(Math.min(order, 3)));
  piece.classList.add("is-zooming");
  await Promise.allSettled(
    piece.getAnimations().map(({ finished }) => finished),
  );
  settle(piece);
};

const traceStep = async (step: HTMLElement, order: number) => {
  tracing.add(step);
  step.style.setProperty("--run-order", String(order));
  step.classList.add("is-tracing");
  await Promise.allSettled(
    step
      .getAnimations({ subtree: true })
      .filter(
        ({ effect }) => (effect as KeyframeEffect | null)?.target === step,
      )
      .map(({ finished }) => finished),
  );
  step.classList.remove("is-tracing");
  step.style.removeProperty("--run-order");
  tracing.delete(step);
};

const onFocus = ({ target }: FocusEvent) => {
  if (!(target instanceof Element)) return;

  // Settle before drawing the focus ring; never cancel the icon's own gesture.
  for (const piece of pending) {
    if (piece.contains(target)) settle(piece);
  }
  const placard = target.closest("#intro > .speech-bubble");
  for (const animation of placard?.getAnimations() ?? []) {
    if ((animation as CSSAnimation).animationName === "hero-arrive")
      animation.finish();
  }
};

const stop = () => {
  stopped = true;
  observer?.disconnect();
  for (const piece of pending) settle(piece);
  for (const step of tracing) {
    step.classList.remove("is-tracing");
    step.style.removeProperty("--run-order");
  }
  tracing.clear();
  document.getElementById("intro")?.classList.add("motion-settled");
  document.removeEventListener("focusin", onFocus);
};

const prepare = () => {
  if (!allowed()) return;

  const pieces = [...document.querySelectorAll<HTMLElement>(pieceSelector)];
  const readingOrder = new Map(pieces.map((piece, index) => [piece, index]));
  observer = new IntersectionObserver(
    (entries) => {
      if (!allowed()) return;

      const arriving = entries
        .filter(
          ({ isIntersecting, intersectionRatio, target }) =>
            isIntersecting &&
            (!target.matches(".run-path li") || intersectionRatio >= 0.3),
        )
        .sort(
          (a, b) =>
            (readingOrder.get(a.target as HTMLElement) ?? 0) -
            (readingOrder.get(b.target as HTMLElement) ?? 0),
        );
      const groups = new Map<Element | null, number>();
      let runOrder = 0;

      for (const { target } of arriving) {
        const piece = target as HTMLElement;
        observer?.unobserve(piece);
        if (piece.matches(".run-path li")) {
          void traceStep(piece, runOrder++);
        } else if (pending.has(piece)) {
          const group = piece.closest(
            ".route-list, .toolbox, .architecture-diagram, .part",
          );
          const order = groups.get(group) ?? 0;
          groups.set(group, order + 1);
          void zoomIn(piece, order);
        }
      }
    },
    { threshold: [0, 0.3] },
  );

  for (const piece of pieces) {
    // Initial and anchor-restored views stay put. Nothing ever waits hidden.
    if (
      piece.getBoundingClientRect().top <= innerHeight ||
      piece.contains(document.activeElement)
    )
      continue;
    pending.add(piece);
    piece.classList.add("zoom-ready");
    observer.observe(piece);
  }
  for (const step of document.querySelectorAll(".run-path li"))
    observer.observe(step);
};

for (const preference of [reducedMotion, forcedColors, printing]) {
  preference.addEventListener?.("change", () => {
    if (!allowed()) stop();
  });
}

if (allowed()) {
  document.addEventListener("focusin", onFocus);
  void document.fonts.ready.then(prepare);
} else {
  stop();
}
