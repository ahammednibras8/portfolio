/*
 * Icon gestures finish after pointer and keyboard triggers. Touch screens also
 * play each icon as it enters view and roll the hero dots. Tapping a hero heading
 * rolls them again, taps give a short buzz where phones allow it, and the portrait
 * leans with the phone. Without this decoration, the page simply stays still.
 */
const startDelay = 400;
const waveDuration = 8000;
const buzzDuration = 10;
const tiltReach = 6;
const fullTiltAngle = 30;
const naturalHoldAngle = 45;

type TiltEvent = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<PermissionState>;
};

const playIcon = async (icon: Element) => {
  if (
    matchMedia("(prefers-reduced-motion: reduce)").matches ||
    matchMedia("(forced-colors: active)").matches
  )
    return;
  if (icon.classList.contains("is-playing")) return;

  icon.classList.add("is-playing");
  await Promise.allSettled(
    icon.getAnimations({ subtree: true }).map(({ finished }) => finished),
  );
  icon.classList.remove("is-playing");
};

/* A single delegated gesture keeps moving parts attached until they settle. */
const gestureOwner = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return;

  return (
    target.closest(
      ".route-link, .architecture-node-link, .hero-action, .hero-contact, .section-title, .run-path li, .architecture-recovery",
    ) ?? target.closest(".sticker, svg.lucide")
  );
};

const playGesture = (owner: Element) => {
  const icons = owner.matches("svg.lucide")
    ? [owner]
    : owner.querySelectorAll("svg.lucide");

  for (const icon of icons) {
    if (!icon.classList.contains("lucide-hand")) void playIcon(icon);
  }
};

document.addEventListener("pointerover", (event) => {
  if (event.pointerType === "touch" || !matchMedia("(hover: hover)").matches)
    return;

  const owner = gestureOwner(event.target);

  if (
    owner &&
    !(
      event.relatedTarget instanceof Node && owner.contains(event.relatedTarget)
    )
  )
    playGesture(owner);
});

document.addEventListener("focusin", ({ target }) => {
  const owner = gestureOwner(target);

  if (owner) playGesture(owner);
});

const rollWave = (section: Element) => {
  if (section.classList.contains("is-waving")) return;

  section.classList.add("is-waving");
  setTimeout(() => {
    section.classList.remove("is-waving");
  }, waveDuration);
};

const whenInView = (
  selector: string,
  threshold: number,
  play: (element: Element) => unknown,
) => {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const { isIntersecting, target } of entries) {
        if (!isIntersecting) continue;

        // A short wait lets the eye arrive before the motion starts.
        setTimeout(() => play(target), startDelay);
      }
    },
    { threshold },
  );

  for (const element of document.querySelectorAll(selector)) {
    observer.observe(element);
  }
};

const buzz = () => {
  if ("vibrate" in navigator) navigator.vibrate(buzzDuration);
};

const enableTilt = (portrait: HTMLElement) => {
  if (!("DeviceOrientationEvent" in window)) return;

  const share = (angle: number) =>
    Math.max(-1, Math.min(1, angle / fullTiltAngle));
  const lean = ({ beta, gamma }: DeviceOrientationEvent) => {
    if (beta === null || gamma === null) return;

    portrait.style.setProperty("--tilt-x", `${share(gamma) * tiltReach}px`);
    portrait.style.setProperty(
      "--tilt-y",
      `${share(beta - naturalHoldAngle) * tiltReach}px`,
    );
  };
  const stop = () => {
    removeEventListener("deviceorientation", lean);
  };
  const listen = () => {
    stop();
    addEventListener("deviceorientation", lean);
  };

  // The motion sensor costs battery, so it only runs while the portrait shows.
  new IntersectionObserver(([entry]) => {
    if (entry?.isIntersecting) listen();
    else stop();
  }).observe(portrait);

  /*
   * Listening is harmless where the sensor is locked, because nothing arrives.
   * Some browsers unlock it only from a tap, so tapping the portrait asks.
   */
  const tilt: TiltEvent = DeviceOrientationEvent;

  if (!tilt.requestPermission) return;

  portrait.addEventListener(
    "click",
    async () => {
      if ((await tilt.requestPermission?.()) === "granted") listen();
    },
    { once: true },
  );
};

const start = () => {
  document.documentElement.classList.add("is-touch");

  whenInView("main svg.lucide", 0.6, playIcon);
  whenInView(".dot-wave", 0.3, rollWave);

  document.addEventListener("click", ({ target }) => {
    if (!(target instanceof Element)) return;

    const section = target.closest(".dot-wave > :is(h1, h2)")?.parentElement;

    if (section) rollWave(section);
    if (section || target.closest("a")) buzz();
  });

  const portrait = document.querySelector<HTMLElement>(".hero-portrait");

  if (portrait) enableTilt(portrait);
};

if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
  // Some phones claim they can hover, so a real touch also proves a touchscreen.
  if (matchMedia("(hover: hover)").matches) {
    addEventListener("touchstart", start, { once: true, passive: true });
  } else {
    start();
  }
}
