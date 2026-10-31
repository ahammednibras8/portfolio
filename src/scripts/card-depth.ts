/* Project links get fine-pointer depth and immediate physical press feedback. */
const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const forcedColors = matchMedia("(forced-colors: active)");
const projects = document.querySelector(".project-list");
let activeCard: HTMLElement | null = null;
let pressedCard: HTMLElement | null = null;
let frame = 0;
let pointerX = 0;
let pointerY = 0;

const release = () => {
  pressedCard?.classList.remove("is-pressed");
  pressedCard = null;
};

const clearDepth = () => {
  cancelAnimationFrame(frame);
  frame = 0;
  activeCard?.classList.remove("is-tilting");
  activeCard?.style.removeProperty("--card-tilt-x");
  activeCard?.style.removeProperty("--card-tilt-y");
  activeCard = null;
};

const reset = () => {
  clearDepth();
  release();
};

const paint = () => {
  frame = 0;
  if (!activeCard) return;

  const { left, top, width, height } = activeCard.getBoundingClientRect();
  const share = (value: number) => Math.max(-0.5, Math.min(0.5, value - 0.5));

  activeCard.style.setProperty(
    "--card-tilt-x",
    `${-share((pointerY - top) / height) * 5}deg`,
  );
  activeCard.style.setProperty(
    "--card-tilt-y",
    `${share((pointerX - left) / width) * 5}deg`,
  );
  activeCard.classList.add("is-tilting");
};

projects?.addEventListener(
  "pointermove",
  (event) => {
    const pointer = event as PointerEvent;

    if (reducedMotion.matches || forcedColors.matches) {
      reset();
      return;
    }

    // A held touch keeps its press until release, cancellation, or scrolling.
    if (pointer.buttons !== 0) return;

    if (!finePointer.matches || pointer.pointerType !== "mouse") {
      reset();
      return;
    }

    const card =
      pointer.target instanceof Element
        ? pointer.target.closest<HTMLElement>(".route-link")
        : null;

    if (card !== activeCard) reset();
    activeCard = card;
    pointerX = pointer.clientX;
    pointerY = pointer.clientY;
    if (activeCard && !frame) frame = requestAnimationFrame(paint);
  },
  { passive: true },
);

projects?.addEventListener("pointerleave", reset);
projects?.addEventListener("pointerdown", (event) => {
  reset();
  if (reducedMotion.matches || forcedColors.matches) return;

  const target = event.target;
  pressedCard =
    target instanceof Element
      ? target.closest<HTMLElement>(".route-link")
      : null;
  pressedCard?.classList.add("is-pressed");
});
projects?.addEventListener("pointercancel", reset);
projects?.addEventListener("focusin", clearDepth);
addEventListener("pointerup", release, { capture: true });
addEventListener("pointercancel", reset, { capture: true });
addEventListener("blur", reset);
addEventListener("scroll", reset, { passive: true });
document.addEventListener("visibilitychange", reset);
finePointer.addEventListener?.("change", reset);
reducedMotion.addEventListener?.("change", reset);
forcedColors.addEventListener?.("change", reset);
