import { renderFooter } from "./ui/footer.js";
import { renderHeader } from "./ui/header.js";

const pageId = document.body.dataset.page || "home";

renderHeader(pageId);
renderFooter();

if (pageId === "simulator") {
  const { initSimulator } = await import("./pages/simulator.js");
  await initSimulator();
}

if (pageId === "scenarios") {
  const { initScenariosPage } = await import("./pages/scenarios.js");
  await initScenariosPage();
}

const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

function startMotion() {
  if (motion.matches || !window.AOS) return;
  document.documentElement.classList.add("aos-ready");
  window.AOS.init({
    duration: 650,
    once: true,
    offset: 48,
    easing: "ease-out",
  });
}

if (document.readyState === "complete") {
  startMotion();
} else {
  window.addEventListener("load", startMotion, { once: true });
}
