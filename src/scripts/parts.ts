// The parts of the homepage, in reading order, shared by the rail and the HUD.
// A line 30% down the screen, so short parts count once they sit at the top.
const readingLine = "-30% 0px -70% 0px";

export const partLinks = () => [
  ...document.querySelectorAll<HTMLAnchorElement>(".part-rail a"),
];

export const partTargets = () =>
  partLinks()
    .map(({ hash }) => document.getElementById(hash.slice(1)))
    .filter((part): part is HTMLElement => part !== null);

/*
 * Reports which part sits on the reading line of the screen. A part can sit
 * inside another, so the last match in reading order wins, and the answer is
 * rebuilt each time so leaving the inner part falls back to the outer one.
 */
export const watchCurrentPart = (onChange: (index: number) => void) => {
  const targets = partTargets();
  const crossing = new Set<Element>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const { isIntersecting, target } of entries) {
        if (isIntersecting) crossing.add(target);
        else crossing.delete(target);
      }

      for (let index = targets.length - 1; index >= 0; index -= 1) {
        const part = targets[index];

        if (part && crossing.has(part)) {
          onChange(index);
          return;
        }
      }
    },
    { rootMargin: readingLine },
  );

  for (const part of targets) observer.observe(part);
};
