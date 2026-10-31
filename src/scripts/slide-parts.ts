/*
 * Slides each piece of the page into place as it arrives, from whichever side
 * it sits on, marks the current part in the side rail, and docks onto a part
 * when a scroll stops just short of it. Pieces only start a little off their
 * place, so without this script the page simply stays still.
 */
const pieceSelector = [
  ".part:not(:first-child) > :not(article, nav)",
  "article > *",
  ".route-list > li",
].join(", ");
const arrivalLine = "0px 0px -12% 0px";
const middleLine = "-50% 0px -50% 0px";
const sideZone = 0.45;
const dockZone = 0.12;
const scrollSettled = 140;

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

const trackRail = () => {
  const links = [...document.querySelectorAll(".part-rail a")];
  const observer = new IntersectionObserver(
    (entries) => {
      for (const { isIntersecting, target } of entries) {
        if (!isIntersecting) continue;

        for (const link of links) {
          if (link.getAttribute("href") === `#${target.id}`) {
            link.setAttribute("aria-current", "true");
          } else {
            link.removeAttribute("aria-current");
          }
        }
      }
    },
    { rootMargin: middleLine },
  );

  for (const part of document.querySelectorAll(".part, #evidence")) {
    observer.observe(part);
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
  let lastY = scrollY;
  let asked = false;
  let touching = false;
  let timer: ReturnType<typeof setTimeout>;

  const dock = () => {
    const moved = scrollY - lastY;

    lastY = scrollY;

    if (!asked || touching || moved === 0) return;

    asked = false;

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
    asked = true;
  };

  addEventListener("scroll", waitForStillness, { passive: true });
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

trackRail();

if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
  preparePieces();

  if (matchMedia("(height >= 30rem)").matches) dockOntoParts();
}
