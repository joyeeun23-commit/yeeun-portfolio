export function initFooter() {
  const footer = document.querySelector(".site-footer");

  if (!footer) {
    return;
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion || !("IntersectionObserver" in window)) {
    footer.classList.add("is-visible");
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        footer.classList.add("is-visible");
        observer.unobserve(footer);
      });
    },
    { threshold: 0.18 }
  );

  observer.observe(footer);
}
