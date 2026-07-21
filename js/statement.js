export function initStatement() {
  const section = document.querySelector(".statement-section");

  if (!section) {
    return;
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion) {
    section.classList.add("is-assembled", "is-copy-visible");
    return;
  }

  if (!("IntersectionObserver" in window)) {
    section.classList.add("is-assembled", "is-copy-visible");
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        section.classList.add("is-assembled");
        window.setTimeout(() => section.classList.add("is-copy-visible"), 360);
        observer.unobserve(section);
      });
    },
    { threshold: 0.32 }
  );

  observer.observe(section);
}
