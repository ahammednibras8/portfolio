/*
 * Icon gestures finish after pointer and keyboard triggers. Touch screens also
 * play each primary badge once on arrival. Link taps give a short buzz where
 * phones allow it, and the portrait leans with the phone. Without this decoration,
 * the page simply stays still.
 */
export {};

const startDelay = 400;
const buzzDuration = 10;
const tiltReach = 6;
const fullTiltAngle = 30;
const naturalHoldAngle = 45;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const forcedColors = matchMedia("(forced-colors: active)");
const arrivalObservers = new Set<IntersectionObserver>();
const arrivalTimers = new Set<ReturnType<typeof setTimeout>>();
const motionAllowed = () => !reducedMotion.matches && !forcedColors.matches;

type TiltEvent = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<PermissionState>;
};

const playIcon = async (icon: Element) => {
  if (!motionAllowed()) return;
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

// A contact tap gets the same forward gesture without waiting for hover or focus.
document.addEventListener("pointerdown", (event) => {
  if (
    event.button !== 0 ||
    (event.pointerType !== "touch" && event.pointerType !== "pen")
  )
    return;
  const contact =
    event.target instanceof Element
      ? event.target.closest(".hero-contact")
      : null;

  if (contact) playGesture(contact);
});

const whenInView = (
  selector: string,
  threshold: number,
  play: (element: Element) => unknown,
) => {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const { isIntersecting, intersectionRatio, target } of entries) {
        if (!isIntersecting || intersectionRatio < threshold) continue;

        observer.unobserve(target);
        // A short wait lets the eye arrive before the motion starts.
        const timer = setTimeout(() => {
          arrivalTimers.delete(timer);
          if (motionAllowed()) play(target);
        }, startDelay);
        arrivalTimers.add(timer);
      }
    },
    { threshold },
  );
  arrivalObservers.add(observer);

  for (const element of document.querySelectorAll(selector)) {
    observer.observe(element);
  }
};

const buzz = () => {
  if (motionAllowed() && "vibrate" in navigator)
    navigator.vibrate(buzzDuration);
};

const enableTilt = (portrait: HTMLElement) => {
  if (!("DeviceOrientationEvent" in window)) return;
  let active = true;
  let visible = false;

  const share = (angle: number) =>
    Math.max(-1, Math.min(1, angle / fullTiltAngle));
  const lean = ({ beta, gamma }: DeviceOrientationEvent) => {
    if (!motionAllowed() || beta === null || gamma === null) return;

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
    if (active && visible && motionAllowed())
      addEventListener("deviceorientation", lean);
  };

  for (const preference of [reducedMotion, forcedColors]) {
    preference.addEventListener?.("change", () => {
      if (motionAllowed()) return;
      // Ending this lifecycle also invalidates a pending permission request.
      active = false;
      stop();
      portrait.style.removeProperty("--tilt-x");
      portrait.style.removeProperty("--tilt-y");
    });
  }

  // The motion sensor costs battery, so it only runs while the portrait shows.
  const sensorObserver = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? false;
    if (visible) listen();
    else stop();
  });
  sensorObserver.observe(portrait);
  arrivalObservers.add(sensorObserver);

  /*
   * Listening is harmless where the sensor is locked, because nothing arrives.
   * Some browsers unlock it only from a tap, so tapping the portrait asks.
   */
  const tilt: TiltEvent = DeviceOrientationEvent;

  if (!tilt.requestPermission) return;

  portrait.addEventListener(
    "click",
    async () => {
      if (!active || !motionAllowed()) return;
      if (
        (await tilt.requestPermission?.()) === "granted" &&
        active &&
        motionAllowed()
      )
        listen();
    },
    { once: true },
  );
};

const start = () => {
  if (!motionAllowed()) return;
  document.documentElement.classList.add("is-touch");

  whenInView(
    "main .sticker svg.lucide, .architecture-node-icon",
    0.6,
    playIcon,
  );

  document.addEventListener("click", ({ target }) => {
    if (!(target instanceof Element)) return;

    if (target.closest("a")) buzz();
  });

  const portrait = document.querySelector<HTMLElement>(".hero-portrait");

  if (portrait) enableTilt(portrait);
};

for (const preference of [reducedMotion, forcedColors]) {
  preference.addEventListener?.("change", () => {
    if (motionAllowed()) return;
    for (const observer of arrivalObservers) observer.disconnect();
    arrivalObservers.clear();
    for (const timer of arrivalTimers) clearTimeout(timer);
    arrivalTimers.clear();
    for (const icon of document.querySelectorAll(".lucide.is-playing"))
      icon.classList.remove("is-playing");
  });
}

if (motionAllowed()) {
  // Some phones claim they can hover, so a real touch also proves a touchscreen.
  if (matchMedia("(hover: hover)").matches) {
    addEventListener("touchstart", start, { once: true, passive: true });
  } else {
    start();
  }
}
