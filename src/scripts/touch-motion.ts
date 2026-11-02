/*
 * Visible icons repeat a short object-specific gesture with a resting interval.
 * One shared pause preference controls them; touch haptics and tilt stay separate.
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
const controls = [
  ...document.querySelectorAll<HTMLButtonElement>(".icon-motion-toggle"),
];
const storageKey = "portfolio-icon-motion";
let paused = false;
const readPreference = () => {
  try {
    paused = sessionStorage.getItem(storageKey) === "paused";
  } catch {
    // Storage may be blocked; the current visit still has a working pause control.
  }
};
readPreference();

const updateLoops = () => {
  const blocked = !motionAllowed();
  document.documentElement.classList.toggle(
    "icon-loops-running",
    !blocked && !paused && !document.hidden,
  );
  for (const control of controls) {
    control.disabled = blocked;
    control.textContent = blocked
      ? "Icons off — system"
      : paused
        ? "Resume icons"
        : "Pause icons";
    control.title = blocked
      ? "Icon motion is disabled by your system preferences."
      : "";
  }
};

if (icons.length > 0 && controls.length > 0) {
  // Expose the stop mechanism before any icon is allowed to start.
  for (const control of controls) {
    control.hidden = false;
    control.addEventListener("click", () => {
      paused = !paused;
      try {
        sessionStorage.setItem(storageKey, paused ? "paused" : "playing");
      } catch {
        // Pausing remains available even without session storage.
      }
      updateLoops();
    });
  }
  const observer = new IntersectionObserver((entries) => {
    for (const { isIntersecting, target } of entries)
      target.classList.toggle("is-in-view", isIntersecting);
  });
  icons.forEach((icon, index) => {
    icon.style.setProperty("--icon-loop-delay", `${(index % 5) * 140}ms`);
    icon.classList.add("icon-loop");
    observer.observe(icon);
  });
  for (const preference of [reducedMotion, forcedColors, printing])
    preference.addEventListener?.("change", updateLoops);
  document.addEventListener("visibilitychange", updateLoops);
  addEventListener("pageshow", () => {
    readPreference();
    updateLoops();
  });
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
