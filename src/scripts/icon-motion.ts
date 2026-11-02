/* A greeting, a response, then rest. Icons never own scrolling or navigation. */
export {};

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const forcedColors = matchMedia("(forced-colors: active)");
const printing = matchMedia("print");
const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
const allowed = () =>
  !reducedMotion.matches &&
  !forcedColors.matches &&
  !printing.matches &&
  !document.hidden;
const icons = [...document.querySelectorAll<SVGElement>("main svg.lucide")];
const greeted = new WeakSet<SVGElement>();
const visible = new Set<SVGElement>();
const active = new Map<SVGElement, Animation[]>();

const settle = (icon: SVGElement) => {
  active.delete(icon);
  icon.classList.remove("icon-active");
  icon.style.removeProperty("--icon-arrival-delay");
};

const play = (icon: SVGElement, delay = 0) => {
  if (!allowed() || active.has(icon)) return;
  greeted.add(icon);
  icon.style.setProperty("--icon-arrival-delay", `${delay}ms`);
  icon.classList.add("icon-active");
  const animations = icon
    .getAnimations({ subtree: true })
    .filter(
      (animation) =>
        animation instanceof CSSAnimation &&
        animation.animationName.startsWith("icon-") &&
        (animation.effect as KeyframeEffect | null)?.target?.parentNode ===
          icon,
    );
  active.set(icon, animations);
  void Promise.allSettled(animations.map(({ finished }) => finished)).then(
    () => {
      // An old completion must never cancel a newer interaction.
      if (active.get(icon) === animations) settle(icon);
    },
  );
};

const ownerOf = (target: EventTarget | null) => {
  if (!(target instanceof Element) || !target.closest("main")) return null;
  return (
    target.closest(".architecture-recovery") ??
    target.closest("a") ??
    target.closest(".sticker, .section-title, .run-path li") ??
    target.closest("svg.lucide")
  );
};

const respond = (owner: Element | null) => {
  if (!owner) return;
  if (owner.matches("svg.lucide")) play(owner as SVGElement);
  else
    owner
      .querySelectorAll<SVGElement>("svg.lucide")
      .forEach((icon) => play(icon));
};

const stop = () => {
  // Consuming a visible greeting prevents a surprise replay on tab restoration.
  for (const icon of visible) greeted.add(icon);
  for (const icon of active.keys()) settle(icon);
};

if (icons.length > 0) {
  const order = new Map(icons.map((icon, index) => [icon, index]));
  const observer = new IntersectionObserver(
    (entries) => {
      for (const { target, isIntersecting, intersectionRatio } of entries) {
        const icon = target as SVGElement;
        if (!isIntersecting) {
          visible.delete(icon);
          settle(icon);
          continue;
        }
        visible.add(icon);
        if (!allowed()) {
          greeted.add(icon);
          continue;
        }
        if (
          intersectionRatio < 0.25 ||
          greeted.has(icon) ||
          icon.matches(".action-arrow, .hero-cta svg, .run-path svg")
        )
          continue;
        const delay = icon.matches(".sticker-wave svg")
          ? 400
          : 120 + ((order.get(icon) ?? 0) % 4) * 60;
        play(icon, delay);
      }
    },
    { threshold: [0, 0.25] },
  );
  icons.forEach((icon) => observer.observe(icon));

  document.addEventListener("pointerover", (event) => {
    if (event.pointerType !== "mouse" || !finePointer.matches) return;
    const owner = ownerOf(event.target);
    if (
      event.relatedTarget instanceof Node &&
      owner?.contains(event.relatedTarget)
    )
      return;
    respond(owner);
  });
  document.addEventListener("focusin", ({ target }) =>
    respond(ownerOf(target)),
  );
  document.addEventListener(
    "pointerdown",
    (event) => {
      if (event.button === 0 && event.pointerType !== "mouse")
        respond(ownerOf(event.target));
    },
    { passive: true },
  );
  for (const preference of [reducedMotion, forcedColors, printing])
    preference.addEventListener("change", () => {
      if (!allowed()) stop();
    });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
  });
  addEventListener("pagehide", stop);
}
