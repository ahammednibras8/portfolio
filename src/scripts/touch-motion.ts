/*
 * Visible icons repeat a short object-specific gesture with a resting interval.
 * Scrolling changes their direction without resetting their pose. System
 * preferences and visibility control them; haptics and tilt stay separate.
 */
export {};

const buzzDuration = 10;
const tiltReach = 6;
const fullTiltAngle = 30;
const naturalHoldAngle = 45;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const forcedColors = matchMedia("(forced-colors: active)");
const printing = matchMedia("print");
const sensorObservers = new Set<IntersectionObserver>();
const motionAllowed = () =>
  !reducedMotion.matches && !forcedColors.matches && !printing.matches;

const icons = [...document.querySelectorAll<SVGElement>("main svg.lucide")];
const visibleIcons = new Set<SVGElement>();
const scrollPosition = () =>
  Math.max(
    0,
    Math.min(scrollY, document.documentElement.scrollHeight - innerHeight),
  );
let lastScrollY = scrollPosition();
let directionFrame = 0;
let backward = false;
const loopsAllowed = () => motionAllowed() && !document.hidden;
const resetScroll = () => {
  cancelAnimationFrame(directionFrame);
  directionFrame = 0;
  lastScrollY = scrollPosition();
};

const syncDirections = (targets: Iterable<SVGElement>) => {
  const changing = [...targets].filter(
    (icon) => icon.classList.contains("is-backward") !== backward,
  );
  // Mirror the active phase as CSS reverses it: the pose stays exactly the same.
  // Positive clocks keep infinite loops away from a negative-playback endpoint.
  const phases = changing.flatMap((icon) =>
    icon.getAnimations({ subtree: true }).flatMap((animation) => {
      const target = (animation.effect as KeyframeEffect | null)?.target;
      if (
        !(animation instanceof CSSAnimation) ||
        !animation.animationName.startsWith("icon-") ||
        !(target instanceof Element) ||
        target.parentNode !== icon
      )
        return [];
      const { delay, duration } = animation.effect?.getTiming() ?? {};
      if (typeof duration !== "number" || duration <= 0) return [];
      const time = Number(animation.currentTime ?? 0);
      const offset = Number(delay ?? 0);
      // Waiting icons keep their original delay and unanimated resting pose.
      if (animation.currentTime === null || time < offset) return [];
      const phase = (((time - offset) % duration) + duration) % duration;
      return [{ animation, time: offset + duration - phase }];
    }),
  );
  // Read the whole visible batch before applying any style or clock changes.
  for (const icon of changing) icon.classList.toggle("is-backward", backward);
  for (const { animation, time } of phases) animation.currentTime = time;
};

const setDirection = (nextBackward: boolean) => {
  if (backward === nextBackward) return;
  backward = nextBackward;
  document.documentElement.classList.toggle("icon-loops-backward", backward);
  syncDirections(visibleIcons);
};

const updateLoops = () => {
  resetScroll();
  if (loopsAllowed()) syncDirections(visibleIcons);
  document.documentElement.classList.toggle(
    "icon-loops-running",
    loopsAllowed(),
  );
};

if (icons.length > 0) {
  const observer = new IntersectionObserver((entries) => {
    for (const { isIntersecting, target } of entries) {
      const icon = target as SVGElement;
      if (isIntersecting) {
        visibleIcons.add(icon);
        if (loopsAllowed()) syncDirections([icon]);
      } else visibleIcons.delete(icon);
      icon.classList.toggle("is-in-view", isIntersecting);
    }
  });
  icons.forEach((icon, index) => {
    icon.style.setProperty("--icon-loop-delay", `${(index % 5) * 140}ms`);
    icon.classList.add("icon-loop");
    observer.observe(icon);
  });
  for (const preference of [reducedMotion, forcedColors, printing])
    preference.addEventListener?.("change", updateLoops);
  document.addEventListener("visibilitychange", updateLoops);
  addEventListener("pageshow", updateLoops);
  addEventListener(
    "scroll",
    () => {
      if (!loopsAllowed()) {
        lastScrollY = scrollY;
        return;
      }
      if (directionFrame) return;
      directionFrame = requestAnimationFrame(() => {
        directionFrame = 0;
        if (!loopsAllowed()) return;
        // Read geometry once per frame, not once per incoming scroll event.
        const position = scrollPosition();
        const distance = position - lastScrollY;
        if (Math.abs(distance) < 4) return;
        lastScrollY = position;
        setDirection(distance < 0);
      });
    },
    { passive: true },
  );
  updateLoops();
}

type TiltEvent = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<PermissionState>;
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
    if (!motionAllowed() || document.hidden || beta === null || gamma === null)
      return;

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
    if (active && visible && !document.hidden && motionAllowed())
      addEventListener("deviceorientation", lean);
  };
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else listen();
  });

  for (const preference of [reducedMotion, forcedColors, printing]) {
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
  sensorObservers.add(sensorObserver);

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

  document.addEventListener("click", ({ target }) => {
    if (!(target instanceof Element)) return;

    if (target.closest("a")) buzz();
  });

  const portrait = document.querySelector<HTMLElement>(".hero-portrait");

  if (portrait) enableTilt(portrait);
};

for (const preference of [reducedMotion, forcedColors, printing]) {
  preference.addEventListener?.("change", () => {
    if (motionAllowed()) return;
    for (const observer of sensorObservers) observer.disconnect();
    sensorObservers.clear();
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
