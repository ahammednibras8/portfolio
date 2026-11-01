/*
 * Zooms each piece of the page into place as it arrives and docks onto a part
 * when a scroll stops just short of it.
 * Pieces stay centered and visible, and without this script they stay still.
 */
const pieceSelector = [
  ".part:not(:first-child) > :not(article, nav, .folio-mark)",
  "article > *",
  ".route-list > li",
].join(", ");
// Any piece showing at all starts zooming, including after an anchor jump.
const arrivalLine = "0px";
const dockZone = 0.12;
const scrollSettled = 140;
const askWindow = 800;

const zoomIn = async (piece: HTMLElement, order: number) => {
  piece.style.setProperty("--zoom-order", String(order));
  piece.classList.add("is-zooming");
  await Promise.allSettled(
    piece.getAnimations().map(({ finished }) => finished),
  );
  piece.classList.remove("zoom-ready", "is-zooming");
  piece.style.removeProperty("--zoom-order");
};

const traceStep = async (step: HTMLElement, order: number) => {
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
};

const preparePieces = () => {
  // Anything already on screen stays put, so the first view never jumps.
  const pieces = [
    ...document.querySelectorAll<HTMLElement>(pieceSelector),
  ].filter((piece) => piece.getBoundingClientRect().top > innerHeight);
  const observer = new IntersectionObserver(
    (entries) => {
      const arriving = entries.filter(
        ({ isIntersecting, intersectionRatio, target }) =>
          isIntersecting &&
          (!target.matches(".run-path li") || intersectionRatio >= 0.3),
      );
      let zoomOrder = 0;
      let runOrder = 0;

      arriving.forEach(({ target }) => {
        const piece = target as HTMLElement;

        observer.unobserve(piece);
        if (piece.matches(".run-path li")) void traceStep(piece, runOrder++);
        else void zoomIn(piece, zoomOrder++);
      });
    },
    { rootMargin: arrivalLine, threshold: [0, 0.3] },
  );

  for (const piece of pieces) {
    piece.classList.add("zoom-ready");
    observer.observe(piece);
  }

  // One observer also handles direct anchor visits and stacked phone steps.
  // Each step waits until enough of it is visible, then plays only once.
  for (const step of document.querySelectorAll(".run-path li")) {
    observer.observe(step);
  }
};

/*
 * Finishes a move only in the direction it was already going, so it can never
 * pull someone back. Rail links and in-page jumps are left alone, because only
 * a wheel, touch, or key scroll asks for it.
 */
const dockOntoParts = () => {
  const parts = [...document.querySelectorAll(".part")];
  const header = document.querySelector(".site-header");
  // Where the page last rested. It stops following the page once a wheel,
  // touch, or key asks to move, so the move is measured from where it began.
  let restedAt = scrollY;
  let askedAt: number | undefined;
  let touching = false;
  let timer: ReturnType<typeof setTimeout>;

  const dock = () => {
    if (askedAt === undefined || touching) return;

    const moved = scrollY - restedAt;

    // A timer from an earlier scroll can fire before the asked-for move starts.
    if (moved === 0) return;

    askedAt = undefined;
    restedAt = scrollY;

    const line = header?.getBoundingClientRect().bottom ?? 0;
    const reach = innerHeight * dockZone;
    const gap = parts
      .map((part) => part.getBoundingClientRect().top - line)
      .find((distance) =>
        moved > 0
          ? distance > 0 && distance <= reach
          : distance < 0 && distance >= -reach,
      );

    if (gap !== undefined) scrollBy({ behavior: "smooth", top: gap });
  };
  const waitForStillness = () => {
    clearTimeout(timer);
    timer = setTimeout(dock, scrollSettled);
  };
  const noteAsked = () => {
    askedAt = performance.now();
  };
  const onScroll = () => {
    // A request that never moved the page must not claim a later jump.
    if (askedAt !== undefined && performance.now() - askedAt > askWindow) {
      askedAt = undefined;
    }

    if (askedAt === undefined) restedAt = scrollY;
    else askedAt = performance.now();

    waitForStillness();
  };

  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("wheel", noteAsked, { passive: true });
  addEventListener("keydown", noteAsked);
  addEventListener("touchmove", noteAsked, { passive: true });
  addEventListener(
    "touchstart",
    () => {
      touching = true;
    },
    { passive: true },
  );
  addEventListener(
    "touchend",
    () => {
      touching = false;
      waitForStillness();
    },
    { passive: true },
  );
};

if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
  preparePieces();

  if (matchMedia("(height >= 30rem)").matches) dockOntoParts();
}
