import { createArchitecturePoc } from "./architecture/poc.js";

const host = document.querySelector("[data-city3d-arch-poc]");
const statusEl = document.querySelector("[data-city3d-arch-status]");
const fpsEl = document.querySelector("[data-city3d-arch-fps]");

if (!host) {
  throw new Error("No se encontró el contenedor [data-city3d-arch-poc].");
}

let poc = null;

try {
  poc = await createArchitecturePoc({
    host,
    statusEl,
    onReady: (info) => console.info("[arch-poc]", info),
    onError: (error) => console.error("[arch-poc]", error),
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
