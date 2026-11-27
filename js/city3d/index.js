/**
 * Fachada de la ciudad 3D.
 * Sin fórmulas de simulación ni acceso a localStorage de escenarios.
 */

import { createOrthoCamera, resetCamera, updateOrthoFrustum } from "./camera.js";
import { createControls } from "./controls.js";
import { disposeList } from "./dispose.js";
import { createLights } from "./lights.js";
import { createRenderer, resizeRenderer } from "./renderer.js";
import { createScene } from "./scene.js";
import { createCityWorld } from "./world.js";

/**
 * @param {{ host: HTMLElement }} options
 */
export function createCity3D({ host }) {
  if (!host) throw new Error("Falta el contenedor de la ciudad 3D.");

  host.replaceChildren();
  host.classList.add("city3d-host");

  const scene = createScene();
  const camera = createOrthoCamera();
  const renderer = createRenderer(host);
  const controls = createControls(camera, renderer.domElement);
  createLights(scene, renderer);
  const world = createCityWorld(scene);

  let rafId = 0;
  let disposed = false;

  const applySize = () => {
    if (disposed) return;
    resizeRenderer(renderer, camera, host, updateOrthoFrustum);
  };

  applySize();

  const resizeObserver =
    typeof ResizeObserver === "function" ? new ResizeObserver(() => applySize()) : null;
  if (resizeObserver) {
    resizeObserver.observe(host);
  } else {
    window.addEventListener("resize", applySize);
  }

  const tick = () => {
    if (disposed) return;
    rafId = window.requestAnimationFrame(tick);
    if (controls.enableDamping) controls.update();
    renderer.render(scene, camera);
  };
  tick();

  return {
    mode: "3d",
    applyVisualState(states) {
      world.applyVisualState(states);
    },
    resetCamera() {
      resetCamera(camera, controls);
      renderer.render(scene, camera);
    },
    getZones() {
      return world.zones;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      window.cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      if (!resizeObserver) window.removeEventListener("resize", applySize);
      controls.dispose();
      world.root.traverse((object) => {
        if (object.isInstancedMesh) object.dispose();
      });
      scene.remove(world.root);
      disposeList(world.disposables);
      renderer.dispose();
      renderer.forceContextLoss?.();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      host.replaceChildren();
      host.classList.remove("city3d-host");
    },
  };
}

export { detectWebGL, resolveCityViewMode } from "./detect.js";
