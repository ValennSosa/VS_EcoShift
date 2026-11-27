import { createAssetPoc } from "./assets/poc.js";

const host = document.querySelector("[data-city3d-poc]");
const statusEl = document.querySelector("[data-city3d-poc-status]");
const fpsEl = document.querySelector("[data-city3d-poc-fps]");

if (!host) {
  throw new Error("No se encontró el contenedor [data-city3d-poc].");
}

let poc = null;

try {
  poc = await createAssetPoc({
    host,
    statusEl,
    onReady: (info) => {
      console.info("[city3d-poc]", info);
    },
    onError: (error) => {
      console.error("[city3d-poc]", error);
    },
  });
} catch (error) {
  console.error(error);
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
