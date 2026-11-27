import { createTramaPoc } from "./trama/poc.js";

const host = document.querySelector("[data-city3d-trama-poc]");
const statusEl = document.querySelector("[data-city3d-trama-status]");
const fpsEl = document.querySelector("[data-city3d-trama-fps]");

if (!host) {
  throw new Error("No se encontró el contenedor [data-city3d-trama-poc].");
}

let poc = null;

try {
  poc = await createTramaPoc({
    host,
    statusEl,
    onReady: (info) => console.info("[trama-poc]", info),
    onError: (error) => console.error("[trama-poc]", error),
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
