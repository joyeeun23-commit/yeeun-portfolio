import { initHero } from "./hero.js";
import { initWorks } from "./works.js";
import { initAwards } from "./awards.js";
import { initProfile } from "./profile.js";
import { initStatement } from "./statement.js";
import { initFooter } from "./footer.js";

function boot() {
  initWorks();
  initAwards();
  initProfile();
  initHero();
  initStatement();
  initFooter();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
