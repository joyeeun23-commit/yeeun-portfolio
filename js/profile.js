export function initProfile() {
  function setupProfileSectionMotion() {
    const profileSection = document.querySelector(".profile-section");

    if (!profileSection) {
      return;
    }

    const profileGrid = profileSection.querySelector(".profile-grid");
    const profileRows = Array.from(profileSection.querySelectorAll(".profile-row"));
    const profileMark = profileSection.querySelector(".profile-mark");
    let hoveredRow = null;
    let frameRequest = null;

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    function requestProfileUpdate() {
      if (frameRequest) {
        return;
      }

      frameRequest = window.requestAnimationFrame(() => {
        frameRequest = null;
        updateProfileVisibility();
      });
    }

    function updateProfileVisibility() {
      const rect = profileSection.getBoundingClientRect();
      const viewportHeight = Math.max(window.innerHeight, 1);
      const entryProgress = Math.min(1, Math.max(0, (viewportHeight - rect.top) / (viewportHeight * 0.78)));
      const isVisible = rect.top < viewportHeight * 0.96 && rect.bottom > -viewportHeight * 0.15;
      const sectionTravel = Math.max(rect.height - viewportHeight, viewportHeight * 0.34);
      const sectionProgress = clamp(-rect.top / sectionTravel, 0, 1);
      const virtualIndex = clamp(1.35 + sectionProgress * 1.65, 0, Math.max(profileRows.length - 1, 0));
      let activeRow = hoveredRow;
      let closestDistance = Number.POSITIVE_INFINITY;

      profileRows.forEach((row, index) => {
        const rowRect = row.getBoundingClientRect();
        const rowCenter = rowRect.top + rowRect.height * 0.5;
        const distance = index - virtualIndex;
        const normalizedDistance = clamp(distance / 1.7, -1, 1);
        const focusAmount = clamp(1 - Math.abs(distance) / 1.15, 0, 1);
        const softenedFocus = Math.pow(focusAmount, 0.7);
        const rowShift = -normalizedDistance * 15;
        const headingShift = normalizedDistance * -7;
        const copyShift = normalizedDistance * 9;

        row.style.setProperty("--row-shift", `${rowShift.toFixed(2)}px`);
        row.style.setProperty("--row-heading-x", `${headingShift.toFixed(2)}px`);
        row.style.setProperty("--row-copy-x", `${copyShift.toFixed(2)}px`);
        row.style.setProperty("--row-focus", softenedFocus.toFixed(3));

        if (!hoveredRow && Math.abs(distance) < closestDistance && rowCenter > -viewportHeight * 0.15 && rowCenter < viewportHeight * 1.15) {
          closestDistance = Math.abs(distance);
          activeRow = row;
        }
      });

      profileRows.forEach((row) => {
        row.classList.toggle("is-active", isVisible && row === activeRow);
      });

      if (profileGrid && profileMark && activeRow) {
        const gridRect = profileGrid.getBoundingClientRect();
        const markCenter = profileMark.offsetTop + profileMark.offsetHeight * 0.5;
        const lowerIndex = Math.floor(virtualIndex);
        const upperIndex = Math.min(profileRows.length - 1, lowerIndex + 1);
        const blend = virtualIndex - lowerIndex;
        const lowerRect = profileRows[lowerIndex].getBoundingClientRect();
        const upperRect = profileRows[upperIndex].getBoundingClientRect();
        const lowerCenter = lowerRect.top - gridRect.top + lowerRect.height * 0.5;
        const upperCenter = upperRect.top - gridRect.top + upperRect.height * 0.5;
        const hoveredRect = hoveredRow?.getBoundingClientRect();
        const hoveredCenter = hoveredRect
          ? hoveredRect.top - gridRect.top + hoveredRect.height * 0.5
          : null;
        const targetCenter = hoveredCenter ?? lowerCenter + (upperCenter - lowerCenter) * blend;
        const markDrift = clamp((targetCenter - markCenter) * 0.58, -118, 118);
        const tilt = clamp(markDrift * 0.055, -5.5, 5.5);

        profileSection.style.setProperty("--profile-mark-drift", `${markDrift.toFixed(2)}px`);
        profileSection.style.setProperty("--profile-mark-tilt", `${tilt.toFixed(2)}deg`);
      }

      profileSection.classList.toggle("is-visible", isVisible);
      profileSection.style.setProperty("--profile-entry", entryProgress.toFixed(3));
    }

    profileRows.forEach((row) => {
      row.setAttribute("tabindex", "0");

      row.addEventListener("pointerenter", () => {
        hoveredRow = row;
        requestProfileUpdate();
      });

      row.addEventListener("pointerleave", () => {
        hoveredRow = null;
        requestProfileUpdate();
      });

      row.addEventListener("focus", () => {
        hoveredRow = row;
        requestProfileUpdate();
      });

      row.addEventListener("blur", () => {
        hoveredRow = null;
        requestProfileUpdate();
      });
    });

    updateProfileVisibility();
    window.addEventListener("scroll", requestProfileUpdate, { passive: true });
    window.addEventListener("resize", requestProfileUpdate);
  }
  setupProfileSectionMotion();
}
