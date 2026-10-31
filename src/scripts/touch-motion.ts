/*
 * Touch screens cannot hover, so each icon plays once as it scrolls into view
 * and the hero dots roll the same way. Tapping a hero heading rolls them again,
 * taps give a short buzz where phones allow it, and the portrait leans with the
 * phone. All of this is decoration: without it, the page simply stays still.
 */
const waveDuration = 4000;
const buzzDuration = 10;
const tiltReach = 6;
const fullTiltAngle = 30;
const naturalHoldAngle = 45;

type TiltEvent = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<PermissionState>;
};

const playIcon = async (icon: Element) => {
  icon.classList.add("is-playing");
  await Promise.allSettled(
    icon.getAnimations({ subtree: true }).map(({ finished }) => finished),
  );
  icon.classList.remove("is-playing");
};

const rollWave = (section: Element) => {
  if (section.classList.contains("is-waving")) return;

  section.classList.add("is-waving");
  setTimeout(() => {
    section.classList.remove("is-waving");
  }, waveDuration);
};

const onceInView = (
  selector: string,
  threshold: number,
  play: (element: Element) => unknown,
) => {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const { isIntersecting, target } of entries) {
        if (!isIntersecting) continue;

        observer.unobserve(target);
        play(target);
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

const canHover = matchMedia("(hover: hover)").matches;
const reducesMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!canHover && !reducesMotion) {
  onceInView("main svg.lucide", 0.6, playIcon);
  onceInView(".dot-wave", 0.3, rollWave);

  document.addEventListener("click", ({ target }) => {
    if (!(target instanceof Element)) return;

    const section = target.closest(".dot-wave > :is(h1, h2)")?.parentElement;

    if (section) rollWave(section);
    if (section || target.closest("a")) buzz();
  });

  const portrait = document.querySelector<HTMLElement>(".hero-portrait");

  if (portrait) enableTilt(portrait);
}
