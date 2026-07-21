import { initHero } from "./hero.js";

function boot() {
  initHero();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
