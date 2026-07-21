export function initAwards() {
  function setupAwardsSectionMotion() {
    const awardsSection = document.querySelector(".awards-section");

    if (!awardsSection) {
      return;
    }

    const awardRows = Array.from(awardsSection.querySelectorAll(".award-row"));
    const visualImage = awardsSection.querySelector(".awards-visual-image");
    let hoveredRow = null;
    let frameRequest = null;
    let lastVisualSrc = visualImage ? visualImage.getAttribute("src") : null;

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    function requestAwardsUpdate() {
      if (frameRequest) {
        return;
      }

      frameRequest = window.requestAnimationFrame(() => {
        frameRequest = null;
        updateAwardsMotion();
      });
    }

    function updateAwardsMotion() {
      const rect = awardsSection.getBoundingClientRect();
      const viewportHeight = Math.max(window.innerHeight, 1);
      const entryProgress = clamp((viewportHeight * 0.92 - rect.top) / (viewportHeight * 0.7), 0, 1);
      const focusLine = viewportHeight * 0.56;
      let activeRow = hoveredRow;
      let closestDistance = Number.POSITIVE_INFINITY;

      awardsSection.classList.toggle(
        "is-visible",
        rect.top < viewportHeight * 0.96 && rect.bottom > viewportHeight * 0.05
      );
      awardsSection.style.setProperty("--awards-entry", entryProgress.toFixed(3));

      awardRows.forEach((row, index) => {
        const rowRect = row.getBoundingClientRect();
        const rowCenter = rowRect.top + rowRect.height * 0.5;
        const distance = Math.abs(rowCenter - focusLine);
        const rowEntry = clamp(entryProgress * 1.35 - index * 0.11, 0, 1);
        const focusAmount = clamp(1 - distance / (viewportHeight * 0.42), 0, 1);

        row.style.setProperty("--award-row-entry", Math.max(rowEntry, focusAmount * 0.58).toFixed(3));

        if (!hoveredRow && distance < closestDistance) {
          closestDistance = distance;
          activeRow = row;
        }
      });

      awardRows.forEach((row) => {
        row.classList.toggle("is-active", row === activeRow && entryProgress > 0.35);
      });

      const parallax = clamp((viewportHeight * 0.5 - (rect.top + rect.height * 0.5)) * 0.015, -22, 22);
      awardsSection.style.setProperty("--awards-visual-shift", `${parallax.toFixed(2)}px`);

      if (visualImage && activeRow) {
        const nextSrc = activeRow.getAttribute("data-visual");
        if (nextSrc && nextSrc !== lastVisualSrc) {
          lastVisualSrc = nextSrc;
          visualImage.style.opacity = "0";
          window.setTimeout(() => {
            visualImage.setAttribute("src", nextSrc);
            visualImage.style.opacity = "1";
          }, 140);
        }
      }
    }

    awardRows.forEach((row) => {
      row.setAttribute("tabindex", "0");

      row.addEventListener("pointerenter", () => {
        hoveredRow = row;
        requestAwardsUpdate();
      });

      row.addEventListener("pointerleave", () => {
        hoveredRow = null;
        requestAwardsUpdate();
      });

      row.addEventListener("focus", () => {
        hoveredRow = row;
        requestAwardsUpdate();
      });

      row.addEventListener("blur", () => {
        hoveredRow = null;
        requestAwardsUpdate();
      });
    });

    updateAwardsMotion();
    window.addEventListener("scroll", requestAwardsUpdate, { passive: true });
    window.addEventListener("resize", requestAwardsUpdate);
  }
  setupAwardsSectionMotion();
}
