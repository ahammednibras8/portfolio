// Reading progress stays in the header, without floating controls or shortcuts.
const header = document.querySelector<HTMLElement>(".site-header");

if (header) {
  let frame = 0;
  const update = () => {
    const reach = document.documentElement.scrollHeight - innerHeight;
    const progress = reach > 0 ? Math.max(0, Math.min(1, scrollY / reach)) : 0;

    header.style.setProperty("--page-progress", progress.toFixed(4));
  };
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(update);
  };

  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule);
  addEventListener("pageshow", schedule);
  void document.fonts.ready.then(schedule);
  update();
}
