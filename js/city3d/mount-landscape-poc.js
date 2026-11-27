import { createLandscapePoc } from "./landscape/poc.js";

const host = document.querySelector("[data-city3d-landscape-poc]");
const statusEl = document.querySelector("[data-city3d-landscape-status]");
const fpsEl = document.querySelector("[data-city3d-landscape-fps]");

if (!host) {
  throw new Error("No se encontró el contenedor [data-city3d-landscape-poc].");
}

let poc = null;

try {
  poc = await createLandscapePoc({
    host,
    statusEl,
    onReady: (info) => console.info("[landscape-poc]", info),
    onError: (error) => console.error("[landscape-poc]", error),
  });
} catch (error) {
  console.error(error);
}

for (const button of document.querySelectorAll("[data-cam]")) {
  button.addEventListener("click", () => {
    poc?.setView?.(button.getAttribute("data-cam"));
  });
}

window.setInterval(() => {
  if (!fpsEl || !poc) return;
  const fps = poc.getFps?.() || 0;
  fpsEl.textContent = fps ? `${fps} fps` : "— fps";
}, 500);

window.addEventListener("pagehide", () => {
  poc?.dispose?.();
  poc = null;
});
