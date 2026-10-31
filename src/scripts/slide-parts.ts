/*
 * Slides each piece of the page into place as it arrives, from whichever side
 * it sits on, marks the current part in the side rail, and docks onto a part
 * when a scroll stops just short of it. Pieces only start a little off their
 * place, so without this script the page simply stays still.
 */
import { partLinks, watchCurrentPart } from "./parts";

const pieceSelector = [
  ".part:not(:first-child) > :not(article, nav)",
  "article > *",
  ".route-list > li",
].join(", ");
// Any piece showing at all starts sliding. A margin left a sliver of offset
// pieces at the screen's foot after a jump, which stayed until the next scroll.
const arrivalLine = "0px";
const sideZone = 0.45;
const dockZone = 0.12;
const scrollSettled = 140;
const askWindow = 800;

const sideOf = (piece: Element, index: number) => {
  const { left, width } = piece.getBoundingClientRect();
  const center = (left + width / 2) / document.documentElement.clientWidth;

  if (center < sideZone) return "slide-from-start";
  if (center > 1 - sideZone) return "slide-from-end";

  return index % 2 ? "slide-from-end" : "slide-from-start";
};

const slideIn = async (piece: HTMLElement, order: number, side: string) => {
  piece.style.setProperty("--slide-order", String(order));
  piece.classList.add("is-sliding");
  await Promise.allSettled(
    piece.getAnimations().map(({ finished }) => finished),
  );
  piece.classList.remove(side, "is-sliding");
  piece.style.removeProperty("--slide-order");
};

const preparePieces = () => {
  // Anything already on screen stays put, so the first view never jumps.
  const pieces = [
    ...document.querySelectorAll<HTMLElement>(pieceSelector),
  ].filter((piece) => piece.getBoundingClientRect().top > innerHeight);
  const sides = new Map(pieces.map((piece, i) => [piece, sideOf(piece, i)]));

  const observer = new IntersectionObserver(
    (entries) => {
      const arriving = entries.filter(({ isIntersecting }) => isIntersecting);

      arriving.forEach(({ target }, order) => {
        const piece = target as HTMLElement;

        observer.unobserve(piece);
        void slideIn(piece, order, sides.get(piece) ?? "");
      });
    },
    { rootMargin: arrivalLine },
  );

  for (const [piece, side] of sides) {
    piece.classList.add(side);
    observer.observe(piece);
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

const trackRail = () => {
  const links = partLinks();

  watchCurrentPart((index) => {
    links.forEach((link, position) => {
      if (position === index) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  });
};

trackRail();

if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
  preparePieces();

  if (matchMedia("(height >= 30rem)").matches) dockOntoParts();
}
