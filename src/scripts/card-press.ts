/* A delegated press keeps card and hero-button feedback finite on touch screens. */
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const forcedColors = matchMedia("(forced-colors: active)");
const surfaces = document.querySelectorAll(
  ".project-list, .hero-cta, #contact .route-link",
);
let pressedLink: HTMLElement | null = null;

const release = () => {
  pressedLink?.classList.remove("is-pressed");
  pressedLink = null;
};

for (const surface of surfaces) {
  surface.addEventListener("pointerdown", (event) => {
    release();
    if (forcedColors.matches || (event as PointerEvent).button !== 0) return;

    const link =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>(".route-link, .hero-cta")
        : null;
    if (
      reducedMotion.matches &&
      !link?.matches(".hero-cta, #contact .route-link")
    )
      return;
    pressedLink = link;
    pressedLink?.classList.add("is-pressed");
  });
  surface.addEventListener("pointerleave", release);
}
addEventListener("pointerup", release, { capture: true });
addEventListener("pointercancel", release, { capture: true });
addEventListener("blur", release);
addEventListener("scroll", release, { passive: true });
document.addEventListener("visibilitychange", release);
reducedMotion.addEventListener?.("change", release);
forcedColors.addEventListener?.("change", release);
