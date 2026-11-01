/* A delegated press keeps card feedback finite, including on touch screens. */
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const forcedColors = matchMedia("(forced-colors: active)");
const projects = document.querySelector(".project-list");
let pressedCard: HTMLElement | null = null;

const release = () => {
  pressedCard?.classList.remove("is-pressed");
  pressedCard = null;
};

projects?.addEventListener("pointerdown", (event) => {
  release();
  if (reducedMotion.matches || forcedColors.matches) return;
  if ((event as PointerEvent).button !== 0) return;

  pressedCard =
    event.target instanceof Element
      ? event.target.closest<HTMLElement>(".route-link")
      : null;
  pressedCard?.classList.add("is-pressed");
});
projects?.addEventListener("pointerleave", release);
addEventListener("pointerup", release, { capture: true });
addEventListener("pointercancel", release, { capture: true });
addEventListener("blur", release);
addEventListener("scroll", release, { passive: true });
document.addEventListener("visibilitychange", release);
reducedMotion.addEventListener?.("change", release);
forcedColors.addEventListener?.("change", release);
